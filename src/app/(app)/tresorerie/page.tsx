import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRightLeft, CheckCheck, ChevronDown, ChevronRight, Download, Laptop, Wallet } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { GroupHeader } from "@/components/ui/panel";
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
        eyebrow="Lien Atelier Trésorerie"
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
      <section aria-label="Lignes en attente" className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
        <p className="flex items-baseline gap-3">
          <span className="text-page font-semibold tracking-[-0.012em] text-treso tabular-nums">{pending.length ? formatSignedCents(total) : "0,00 €"}</span>
          <span className="text-muted tabular-nums">{plural(pending.length, "ligne")} en attente</span>
        </p>
        {pending.length > 0 && (
          <a href="/tresorerie/export" className={buttonClasses("soft", "md")} download>
            <Download className="size-4" aria-hidden />
            Exporter en CSV
          </a>
        )}
      </section>

      {pending.length ? (
        <>
          <ul>
            {pending.map((line) => (
              <PendingLine key={line.id} line={line} />
            ))}
          </ul>
          <ActionForm action={markLinesSent} className="border-b border-line px-3 py-2" confirmMessage={`Marquer les ${pending.length} lignes comme envoyées (import CSV fait dans Trésorerie) ?`}>
            {pending.map((l) => (
              <input key={l.id} type="hidden" name="line_id" value={l.id} />
            ))}
            <SubmitButton variant="ghost" pendingLabel="Enregistrement…" className="max-sm:h-auto max-sm:min-h-11 max-sm:py-2 max-sm:text-left max-sm:whitespace-normal">
              <CheckCheck className="size-4 shrink-0" aria-hidden />
              J&apos;ai importé le CSV : marquer comme envoyées
            </SubmitButton>
          </ActionForm>
        </>
      ) : (
        <div className="border-b border-line">
          <EmptyState icon={Wallet} title="Rien à envoyer">
            Coche une tâche liée à Trésorerie (un achat en pharmacie, un abonnement…) : la ligne apparaîtra ici.
          </EmptyState>
        </div>
      )}

      <section aria-labelledby="envoi">
        <GroupHeader id="envoi" title="Envoi vers Trésorerie" />
        <div className="grid divide-y divide-line border-b border-line sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <div className="px-5 py-4">
            <p className="flex items-center gap-2 font-medium text-ink">
              <Laptop className="size-4 text-faint" aria-hidden />
              Automatique, depuis ton Mac
            </p>
            <p className="mt-1 max-w-prose text-muted">
              {lastSync?.last_used_at
                ? `Dernier passage du script : ${dateTime.format(new Date(lastSync.last_used_at))} (${lastSync.label}).`
                : tokens.length
                  ? "Clé créée, le script n'est pas encore passé."
                  : "Crée une clé de synchronisation dans Paramètres, puis installe le script sur le Mac où tourne Trésorerie."}
            </p>
            <Link href="/parametres#synchronisation" className="mt-1 inline-flex min-h-11 items-center font-medium text-accent-strong underline-offset-4 hover:underline lg:min-h-8">
              Clés et installation
            </Link>
          </div>
          <div className="px-5 py-4">
            <p className="flex items-center gap-2 font-medium text-ink">
              <ArrowRightLeft className="size-4 text-faint" aria-hidden />À la main, par CSV
            </p>
            <p className="mt-1 max-w-prose text-muted">
              « Exporter en CSV », puis dans Trésorerie : Transactions → Importer. Les colonnes sont reconnues toutes seules et un second import ne crée pas
              de doublon.
            </p>
          </div>
        </div>
      </section>

      {sent.length > 0 && (
        <details className="group">
          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 border-b border-line bg-sidebar px-5 font-semibold text-ink lg:min-h-9 [&::-webkit-details-marker]:hidden">
            <ChevronRight className="size-4 text-faint transition-transform group-open:rotate-90" aria-hidden />
            Déjà envoyées
            <span className="text-meta font-medium text-faint tabular-nums">{sent.length} dernières</span>
          </summary>
          <ul>
            {sent.map((line) => (
              <li key={line.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line px-5 py-2.5 lg:py-1.5">
                <LineSummary line={line} />
                <span className="text-small text-muted tabular-nums">
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
      <span className="w-14 shrink-0 text-small text-muted tabular-nums">{shortDay(line.day)}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium break-words text-ink">{line.label}</span>
        <span className="block text-small text-muted">
          {[line.category, line.account].filter(Boolean).join(" · ")}
          {line.task_title && line.task_title !== line.label ? ` · ${line.task_title}` : ""}
        </span>
      </span>
      <span className={cn("shrink-0 font-medium tabular-nums", line.amount_cents < 0 ? "text-bad" : "text-good")}>
        {formatSignedCents(line.amount_cents)}
      </span>
    </span>
  );
}

function PendingLine({ line }: { line: TresoLineRow }) {
  return (
    <li>
      <details className="group border-b border-line">
        <summary className="flex min-h-13 cursor-pointer list-none items-center gap-3 px-5 py-2 transition-colors hover:bg-sunken group-open:bg-sunken/60 lg:min-h-10 lg:py-1.5 [&::-webkit-details-marker]:hidden">
          <LineSummary line={line} />
          <ChevronDown className="size-4 shrink-0 text-faint transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="max-w-2xl px-5 pt-3 pb-5">
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
