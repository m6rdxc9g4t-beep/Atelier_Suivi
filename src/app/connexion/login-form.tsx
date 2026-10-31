"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";
import { Field, Input } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { useFormAction } from "@/lib/use-form-action";
import { PASSWORD_MIN_LENGTH } from "@/lib/meta";
import { sendPasswordReset, signInWithPassword, signUp } from "./actions";

type Mode = "connexion" | "inscription" | "oubli";

export function LoginForm() {
  const params = useSearchParams();
  const [mode, setMode] = useState<Mode>(params.get("mode") === "inscription" ? "inscription" : "connexion");
  const [loginState, loginAction] = useFormAction(signInWithPassword);
  const [signUpState, signUpAction] = useFormAction(signUp);
  const [resetState, resetAction] = useFormAction(sendPasswordReset);
  const linkError = params.get("erreur") === "lien";
  const next = params.get("suite") ?? "";
  // L'adresse déjà tapée suit d'un mode à l'autre
  const email = loginState.values?.email ?? signUpState.values?.email ?? resetState.values?.email;

  function switchButton(label: string, target: Mode) {
    return (
      <button
        type="button"
        onClick={() => setMode(target)}
        className="min-h-11 text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline"
      >
        {label}
      </button>
    );
  }

  const done = mode === "inscription" ? signUpState : mode === "oubli" ? resetState : null;
  if (done?.status === "success") {
    return (
      <div className="rounded-[1.75rem] bg-accent-soft p-6 text-ink">
        <Mail className="size-6 text-accent-strong" aria-hidden />
        <p className="mt-3 font-display text-xl font-extrabold">Regarde ta boîte mail</p>
        <p className="mt-1 text-sm text-ink-soft">{done.message}</p>
        <div className="mt-2">{switchButton("Revenir à la connexion", "connexion")}</div>
      </div>
    );
  }

  const emailField = (state: typeof loginState) => (
    <Field label="Ton adresse e-mail" name="email" errors={state.fieldErrors?.email}>
      <Input
        name="email"
        defaultValue={email}
        type="email"
        autoComplete="email"
        inputMode="email"
        placeholder="toi@exemple.fr"
        required
        invalid={Boolean(state.fieldErrors?.email)}
      />
    </Field>
  );

  if (mode === "oubli") {
    return (
      <form key="oubli" action={resetAction} className="flex flex-col gap-4" noValidate>
        <p className="font-display text-xl font-extrabold text-ink">Mot de passe oublié</p>
        <p className="-mt-2 text-sm text-ink-soft">Tu reçois un lien qui t&apos;ouvre ton suivi et te laisse choisir un nouveau mot de passe.</p>
        {emailField(resetState)}
        <FormMessage state={resetState} />
        <SubmitButton pendingLabel="Envoi du lien…">Recevoir le lien</SubmitButton>
        <div className="flex justify-center">{switchButton("Je me souviens, me connecter", "connexion")}</div>
      </form>
    );
  }

  if (mode === "inscription") {
    return (
      <form key="inscription" action={signUpAction} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="next" value={next} />
        <p className="font-display text-xl font-extrabold text-ink">Créer un compte</p>
        {emailField(signUpState)}
        <Field
          label="Choisis un mot de passe"
          name="password"
          hint={`Au moins ${PASSWORD_MIN_LENGTH} caractères.`}
          errors={signUpState.fieldErrors?.password}
        >
          <Input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={PASSWORD_MIN_LENGTH}
            required
            invalid={Boolean(signUpState.fieldErrors?.password)}
          />
        </Field>
        <FormMessage state={signUpState} />
        <SubmitButton pendingLabel="Création du compte…">Créer mon compte</SubmitButton>
        <div className="flex justify-center">{switchButton("J'ai déjà un compte", "connexion")}</div>
      </form>
    );
  }

  return (
    <form key="connexion" action={loginAction} className="flex flex-col gap-4" noValidate>
      {linkError && (
        <FormMessage
          state={{ status: "error", message: "Ce lien a expiré ou a déjà servi. Connecte-toi avec ton mot de passe ou demande un nouveau lien." }}
        />
      )}
      <input type="hidden" name="next" value={next} />
      {emailField(loginState)}
      <Field label="Ton mot de passe" name="password" errors={loginState.fieldErrors?.password}>
        <Input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          invalid={Boolean(loginState.fieldErrors?.password)}
        />
      </Field>
      <FormMessage state={loginState} />
      <SubmitButton pendingLabel="Connexion…">Se connecter</SubmitButton>
      <div className="flex flex-wrap items-center justify-center gap-x-5">
        {switchButton("Créer un compte", "inscription")}
        {switchButton("Mot de passe oublié ?", "oubli")}
      </div>
    </form>
  );
}
