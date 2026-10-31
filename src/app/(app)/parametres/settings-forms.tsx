"use client";

import { useActionState, useState } from "react";
import { Copy, KeyRound } from "lucide-react";
import { Field, Input } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { buttonClasses } from "@/components/ui/button";
import { idleState } from "@/lib/actions";
import { useFormAction } from "@/lib/use-form-action";
import { createSyncToken, updatePassword, updateProfile, type TokenState } from "./actions";

export function ProfileForm({ displayName }: { displayName: string }) {
  const [state, action] = useFormAction(updateProfile);
  return (
    <form action={action} className="flex flex-col gap-4 sm:flex-row sm:items-end" noValidate>
      <Field label="Ton prénom" name="display_name" errors={state.fieldErrors?.display_name} className="flex-1">
        <Input name="display_name" maxLength={60} defaultValue={state.values?.display_name ?? displayName} autoComplete="given-name" />
      </Field>
      <SubmitButton pendingLabel="Enregistrement…">Enregistrer</SubmitButton>
      <FormMessage state={state} className="sm:basis-full" />
    </form>
  );
}

/** Changement de mot de passe (même formulaire qu'Atelier Dates) */
export function PasswordForm() {
  const [state, action] = useFormAction(updatePassword);
  const e = state.fieldErrors;
  return (
    <form action={action} key={state.status === "success" ? state.message : "form"} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Field label="Nouveau mot de passe" name="password" hint="8 caractères minimum" errors={e?.password}>
        <Input name="password" type="password" autoComplete="new-password" required invalid={!!e?.password} />
      </Field>
      <Field label="Confirme-le" name="confirm" errors={e?.confirm}>
        <Input name="confirm" type="password" autoComplete="new-password" required invalid={!!e?.confirm} />
      </Field>
      <div className="flex flex-col gap-3 sm:col-span-2">
        <FormMessage state={state} />
        <SubmitButton variant="soft" pendingLabel="Enregistrement…" className="self-start">
          Changer mon mot de passe
        </SubmitButton>
      </div>
    </form>
  );
}

/** Création d'une clé ; la clé et la commande d'installation sont montrées une seule fois */
export function TokenCreator({ supabaseUrl, supabaseKey }: { supabaseUrl: string; supabaseKey: string }) {
  const [state, action] = useActionState<TokenState, FormData>(createSyncToken, idleState);
  const [copied, setCopied] = useState<string | null>(null);

  const command = state.token
    ? `SUIVI_SUPABASE_URL="${supabaseUrl}" SUIVI_SUPABASE_KEY="${supabaseKey}" SUIVI_SYNC_TOKEN="${state.token}" bash scripts/macos/install-sync.sh`
    : "";

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end" noValidate>
        <Field label="Nom de l'appareil" name="label" hint="L'ordinateur où tourne atelier_Trésorerie." errors={state.fieldErrors?.label} className="flex-1">
          <Input name="label" maxLength={60} defaultValue="Mac" />
        </Field>
        <SubmitButton pendingLabel="Création…">
          <KeyRound className="size-4" aria-hidden />
          Créer une clé
        </SubmitButton>
      </form>
      {state.status === "error" && <FormMessage state={state} />}

      {state.token && (
        <div className="flex flex-col gap-3 rounded-2xl border border-accent bg-accent-faint p-4">
          <p className="text-sm font-semibold text-ink">{state.message}</p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 overflow-x-auto rounded-xl border border-edge-soft bg-field px-3 py-2 font-mono text-xs whitespace-nowrap text-ink select-all">
              {state.token}
            </code>
            <button type="button" onClick={() => copy(state.token!, "token")} className={buttonClasses("soft", "sm")}>
              <Copy className="size-4" aria-hidden />
              {copied === "token" ? "Copiée" : "Copier"}
            </button>
          </div>
          <p className="text-sm text-ink-soft">
            Sur le Mac, dans le dossier du projet atelier_Suivi, colle cette commande dans le Terminal : elle installe l&apos;envoi automatique toutes les 15
            minutes.
          </p>
          <div className="flex items-start gap-2">
            <code className="min-w-0 flex-1 overflow-x-auto rounded-xl border border-edge-soft bg-field px-3 py-2 font-mono text-xs whitespace-pre text-ink select-all">
              {command}
            </code>
            <button type="button" onClick={() => copy(command, "command")} className={buttonClasses("soft", "sm")}>
              <Copy className="size-4" aria-hidden />
              {copied === "command" ? "Copiée" : "Copier"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
