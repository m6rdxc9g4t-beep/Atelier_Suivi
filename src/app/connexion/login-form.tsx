"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";
import { Field, Input } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { useFormAction } from "@/lib/use-form-action";
import { sendMagicLink, signInWithPassword } from "./actions";

export function LoginForm() {
  const params = useSearchParams();
  const [mode, setMode] = useState<"password" | "link">("password");
  const [passwordState, passwordAction] = useFormAction(signInWithPassword);
  const [linkState, linkAction] = useFormAction(sendMagicLink);
  const linkError = params.get("erreur") === "lien";
  const next = params.get("suite") ?? "";

  if (mode === "link" && linkState.status === "success") {
    return (
      <div className="rounded-[1.75rem] bg-accent-soft p-6 text-ink">
        <Mail className="size-6 text-accent-strong" aria-hidden />
        <p className="mt-3 font-display text-xl font-extrabold">Regarde ta boîte mail</p>
        <p className="mt-1 text-sm text-ink-soft">{linkState.message}</p>
      </div>
    );
  }

  const switchButton = (label: string, target: "password" | "link") => (
    <button
      type="button"
      onClick={() => setMode(target)}
      className="self-center text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline"
    >
      {label}
    </button>
  );

  if (mode === "link") {
    return (
      <form action={linkAction} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="next" value={next} />
        <Field label="Ton adresse e-mail" name="email" errors={linkState.fieldErrors?.email}>
          <Input
            name="email"
            defaultValue={linkState.values?.email ?? passwordState.values?.email}
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="toi@exemple.fr"
            required
            invalid={Boolean(linkState.fieldErrors?.email)}
          />
        </Field>
        <FormMessage state={linkState} />
        <SubmitButton pendingLabel="Envoi du lien…">Recevoir un lien de connexion</SubmitButton>
        {switchButton("Me connecter avec mon mot de passe", "password")}
      </form>
    );
  }

  return (
    <form action={passwordAction} className="flex flex-col gap-4" noValidate>
      {linkError && (
        <FormMessage state={{ status: "error", message: "Ce lien a expiré ou a déjà servi. Connecte-toi avec ton mot de passe ou demande un nouveau lien." }} />
      )}
      <input type="hidden" name="next" value={next} />
      <Field label="Ton adresse e-mail" name="email" errors={passwordState.fieldErrors?.email}>
        <Input
          name="email"
          defaultValue={passwordState.values?.email}
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="toi@exemple.fr"
          required
          invalid={Boolean(passwordState.fieldErrors?.email)}
        />
      </Field>
      <Field label="Ton mot de passe" name="password" errors={passwordState.fieldErrors?.password}>
        <Input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          invalid={Boolean(passwordState.fieldErrors?.password)}
        />
      </Field>
      <FormMessage state={passwordState} />
      <SubmitButton pendingLabel="Connexion…">Se connecter</SubmitButton>
      {switchButton("Mot de passe oublié ? Recevoir un lien par e-mail", "link")}
    </form>
  );
}
