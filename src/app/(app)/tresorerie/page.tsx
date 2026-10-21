import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRightLeft, CheckCheck, Download, Laptop, Wallet } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, SectionTitle } from "@/components/ui/panel";
import { ListSkeleton } from "@/components/ui/skeleton";
import { SubmitButton } from "@/components/ui/submit-button";
import { getUserContext } from "@/lib/dal";
import { formatSignedCents, plural } from "@/lib/format";
import { shortDay } from "@/lib/recurrence";
import type { TresoLineRow } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { deleteLine, markLinesSent, resendLine } from "./actions";
import { LineForm } from "./line-form";

export const metadata: Metadata = { title: "Trésorerie" };

const dateTime = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: process.env.NEXT_PUBLIC_APP_TIMEZONE ?? "Europe/Paris",
});

export default function TresoPage() {
  return (
    <>
      <PageHeader
        eyebrow={<span className="text-treso">Lien atelier_Trésorerie</span>}
        title="Lignes à envoyer"
        intro="Chaque tâche liée prépare ici une ligne quand tu la coches. Le script de ton Mac les envoie à Trésorerie, ou tu les exportes en CSV."
      />
      <Suspense fallback={<ListSkeleton rows={3} />}>
        <TresoContent />
      </Suspense>
    </>
  );
}

async function TresoContent() {
  const { supabase } = await getUserContext();
  const [pendingRes, sentRes, tokensRes] = await Promise.all([
    supabase.from("treso_lines").select("*").eq("status", "pending").order("day").order("created_at"),
    supabase.from("treso_lines").select("*").eq("status", "sent").order("sent_at", { ascending: false }).limit(30),
    supabase.from("sync_tokens").select("label, last_used_at").order("last_used_at", { ascending: false, nullsFirst: false }),
  ]);
  for (const r of [pendingRes, sentRes, tokensRes]) if (r.error) throw new Error(r.error.message);
  const pending = pendingRes.data!;
  const sent = sentRes.data!;
  const tokens = tokensRes.data!;
  const total = pending.reduce((a, l) => a + l.amount_cents, 0);
  const lastSync = tokens.find((t) => t.last_used_at);

  return (
    <>
      <section className="neon-panel mb-5 flex flex-wrap items-center justify-between gap-4 rounded-[1.75rem] border border-treso bg-surface p-5">
        <div>
          <p className="eyebrow text-ink-soft">{plural(pending.length, "ligne")} en attente</p>
          <p className="mt-1 font-mono text-3xl font-semibold text-treso tabular-nums">{pending.length ? formatSignedCents(total) : "0,00 €"}</p>
        </div>
        {pending.length > 0 && (
          <a href="/tresorerie/export" className={buttonClasses("soft", "md", "border-treso bg-treso-soft text-treso hover:bg-treso-soft")} download>
            <Download className="size-4" aria-hidden />
            Exporter en CSV
          </a>
        )}
      </section>

      {pending.length ? (
        <>
          <ul className="neon-panel mb-3 divide-y divide-line rounded-[1.5rem] border border-edge bg-surface">
            {pending.map((line) => (
              <PendingLine key={line.id} line={line} />
            ))}
          </ul>
          <ActionForm action={markLinesSent} className="mb-8" confirmMessage={`Marquer les ${pending.length} lignes comme envoyées (import CSV fait dans Trésorerie) ?`}>
            {pending.map((l) => (
              <input key={l.id} type="hidden" name="line_id" value={l.id} />
            ))}
            <SubmitButton variant="ghost" pendingLabel="Enregistrement…">
              <CheckCheck className="size-4" aria-hidden />
              J&apos;ai importé le CSV : marquer comme envoyées
            </SubmitButton>
          </ActionForm>
        </>
      ) : (
        <div className="mb-8">
          <EmptyState icon={Wallet} title="Rien à envoyer">
            Coche une tâche liée à Trésorerie (un achat en pharmacie, un abonnement…) : la ligne apparaîtra ici.
          </EmptyState>
        </div>
      )}

      <Panel className="mb-6">
        <SectionTitle>Envoi vers Trésorerie</SectionTitle>
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-2xl border border-edge-soft bg-sunken p-4">
            <p className="flex items-center gap-2 font-semibold text-ink">
              <Laptop className="size-4 text-accent-strong" aria-hidden />
              Automatique, depuis ton Mac
            </p>
            <p className="mt-1 text-ink-soft">
              {lastSync?.last_used_at
                ? `Dernier passage du script : ${dateTime.format(new Date(lastSync.last_used_at))} (${lastSync.label}).`
                : tokens.length
                  ? "Clé créée, le script n'est pas encore passé."
                  : "Crée une clé de synchronisation dans Paramètres, puis installe le script sur le Mac où tourne Trésorerie."}
            </p>
            <Link href="/parametres#synchronisation" className="mt-2 inline-flex min-h-11 items-center font-semibold text-accent-strong underline-offset-4 hover:underline">
              Clés et installation
            </Link>
          </div>
          <div className="rounded-2xl border border-edge-soft bg-sunken p-4">
            <p className="flex items-center gap-2 font-semibold text-ink">
              <ArrowRightLeft className="size-4 text-accent-strong" aria-hidden />À la main, par CSV
            </p>
            <p className="mt-1 text-ink-soft">
              « Exporter en CSV », puis dans Trésorerie : Transactions → Importer. Les colonnes sont reconnues toutes seules et un second import ne crée pas
              de doublon.
            </p>
          </div>
        </div>
      </Panel>

      {sent.length > 0 && (
        <details className="neon-panel group rounded-[1.75rem] border border-edge bg-surface">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 font-semibold text-ink [&::-webkit-details-marker]:hidden">
            Déjà envoyées ({sent.length} dernières)
            <span className="text-sm font-normal text-ink-soft group-open:hidden">Afficher</span>
          </summary>
          <ul className="divide-y divide-line border-t border-line">
            {sent.map((line) => (
              <li key={line.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
                <LineSummary line={line} />
                <span className="text-xs text-ink-soft">
                  {line.sent_at ? `Envoyée le ${dateTime.format(new Date(line.sent_at))}` : "Envoyée"}
                  {line.tresorerie_id ? ` · n° ${line.tresorerie_id} dans Trésorerie` : ""}
                </span>
                <ActionForm action={resendLine} className="ml-auto">
                  <input type="hidden" name="line_id" value={line.id} />
                  <SubmitButton variant="ghost" size="sm">
                    Renvoyer
                  </SubmitButton>
                </ActionForm>
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}

function LineSummary({ line }: { line: TresoLineRow }) {
  return (
    <span className="flex min-w-0 flex-1 items-baseline gap-3">
      <span className="w-14 shrink-0 font-mono text-xs text-ink-soft">{shortDay(line.day)}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold break-words text-ink">{line.label}</span>
        <span className="block text-xs text-ink-soft">
          {[line.category, line.account].filter(Boolean).join(" · ")}
          {line.task_title && line.task_title !== line.label ? ` · ${line.task_title}` : ""}
        </span>
      </span>
      <span className={cn("shrink-0 font-mono text-sm font-semibold tabular-nums", line.amount_cents < 0 ? "text-bad" : "text-good")}>
        {formatSignedCents(line.amount_cents)}
      </span>
    </span>
  );
}

function PendingLine({ line }: { line: TresoLineRow }) {
  return (
    <li>
      <details className="group">
        <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 rounded-[1.5rem] px-5 py-3 hover:bg-accent-faint [&::-webkit-details-marker]:hidden">
          <LineSummary line={line} />
        </summary>
        <div className="border-t border-line px-5 pt-4 pb-5">
          <LineForm line={line} />
          <ActionForm action={deleteLine} className="mt-3" confirmMessage="Supprimer cette ligne ? La tâche reste cochée.">
            <input type="hidden" name="line_id" value={line.id} />
            <SubmitButton variant="danger" size="sm">
              Supprimer la ligne
            </SubmitButton>
          </ActionForm>
        </div>
      </details>
    </li>
  );
}
