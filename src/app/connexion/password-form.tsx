"use client";

import { Field, Input } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { PASSWORD_MIN_LENGTH } from "@/lib/meta";
import { useFormAction } from "@/lib/use-form-action";
import { updatePassword } from "./actions";

/**
 * Choix d'un nouveau mot de passe pour la session ouverte.
 * `next` : page où aller une fois enregistré (sinon, simple message de réussite).
 */
export function PasswordForm({ next, compact = false }: { next?: string; compact?: boolean }) {
  const [state, action] = useFormAction(updatePassword);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <Field label="Nouveau mot de passe" name="password" hint={`Au moins ${PASSWORD_MIN_LENGTH} caractères.`} errors={state.fieldErrors?.password}>
        <Input
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          required
          invalid={Boolean(state.fieldErrors?.password)}
        />
      </Field>
      <Field label="Retape-le" name="confirm" errors={state.fieldErrors?.confirm}>
        <Input name="confirm" type="password" autoComplete="new-password" required invalid={Boolean(state.fieldErrors?.confirm)} />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Enregistrement…" className={compact ? "sm:self-start" : undefined}>
        Enregistrer le mot de passe
      </SubmitButton>
    </form>
  );
}
