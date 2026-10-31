import type { Metadata } from "next";
import { Suspense } from "react";
import { LogOut, Trash2 } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { buttonClasses } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, SectionTitle } from "@/components/ui/panel";
import { ListSkeleton } from "@/components/ui/skeleton";
import { SubmitButton } from "@/components/ui/submit-button";
import { ThemePicker } from "@/components/theme/theme-picker";
import { signOut } from "@/app/connexion/actions";
import { PasswordForm } from "@/app/connexion/password-form";
import { getUserContext } from "@/lib/dal";
import { getSupabaseEnv } from "@/lib/env";
import { deleteSyncToken } from "./actions";
import { ProfileForm, TokenCreator } from "./settings-forms";

export const metadata: Metadata = { title: "Paramètres" };

const dateTime = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: process.env.NEXT_PUBLIC_APP_TIMEZONE ?? "Europe/Paris",
});

export default function SettingsPage() {
  return (
    <>
      <PageHeader eyebrow="Réglages" title="Paramètres" />
      <div className="flex flex-col gap-5">
        <Panel>
          <SectionTitle>Apparence</SectionTitle>
          <ThemePicker />
        </Panel>
        <Suspense fallback={<ListSkeleton rows={2} />}>
          <SettingsContent />
        </Suspense>
      </div>
    </>
  );
}

async function SettingsContent() {
  const { supabase, me, email } = await getUserContext();
  const { data: tokens, error } = await supabase.from("sync_tokens").select("id, label, hint, created_at, last_used_at").order("created_at");
  if (error) throw new Error(error.message);
  const { url, key } = getSupabaseEnv();

  return (
    <>
      <Panel>
        <SectionTitle>Profil</SectionTitle>
        <ProfileForm displayName={me.display_name} />
      </Panel>

      <Panel id="synchronisation">
        <SectionTitle>Synchronisation avec atelier_Trésorerie</SectionTitle>
        <p className="mb-4 max-w-prose text-sm text-ink-soft">
          Trésorerie tourne sur ton Mac, hors d&apos;Internet. Un petit script, installé sur ce Mac, lit les lignes en attente avec une clé, les crée dans
          Trésorerie (compte et catégorie retrouvés par leur nom), puis les marque « envoyées ». La clé ne donne accès qu&apos;à tes lignes Trésorerie, et
          tu peux la supprimer à tout moment.
        </p>

        {tokens.length > 0 && (
          <ul className="mb-5 divide-y divide-line rounded-2xl border border-edge-soft">
            {tokens.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ink">
                    {t.label} <span className="font-mono text-xs font-normal text-ink-soft">…{t.hint}</span>
                  </span>
                  <span className="block text-xs text-ink-soft">
                    Créée le {dateTime.format(new Date(t.created_at))} ·{" "}
                    {t.last_used_at ? `dernier passage le ${dateTime.format(new Date(t.last_used_at))}` : "jamais utilisée"}
                  </span>
                </span>
                <ActionForm action={deleteSyncToken} confirmMessage={`Supprimer la clé « ${t.label} » ? Le script qui l'utilise s'arrêtera.`}>
                  <input type="hidden" name="token_id" value={t.id} />
                  <SubmitButton variant="danger" size="sm" aria-label={`Supprimer la clé ${t.label}`}>
                    <Trash2 className="size-4" aria-hidden />
                    Supprimer
                  </SubmitButton>
                </ActionForm>
              </li>
            ))}
          </ul>
        )}

        <TokenCreator supabaseUrl={url} supabaseKey={key} />
      </Panel>

      <Panel>
        <SectionTitle>Mot de passe</SectionTitle>
        <p className="mb-4 max-w-prose text-sm text-ink-soft">
          Connecté en tant que <span className="font-semibold text-ink">{email}</span>. Le compte est commun aux apps Atelier qui partagent la même base
          (comme Atelier Cuisine) : un nouveau mot de passe vaut aussi pour elles.
        </p>
        <PasswordForm compact />
      </Panel>

      <Panel>
        <SectionTitle>Session</SectionTitle>
        <form action={signOut}>
          <button type="submit" className={buttonClasses("soft")}>
            <LogOut className="size-4" aria-hidden />
            Se déconnecter
          </button>
        </form>
      </Panel>
    </>
  );
}
