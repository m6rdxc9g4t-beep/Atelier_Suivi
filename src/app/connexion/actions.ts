"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { failure, formToObject, fromZodError, success, type ActionState } from "@/lib/actions";
import { loginSchema, passwordLoginSchema } from "@/lib/validation/schemas";

async function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

/** Envoie un lien magique de connexion (création du compte au premier passage) */
export async function sendMagicLink(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const { email, next } = parsed.data;
  const callback = new URL("/auth/callback", await siteUrl());
  if (next) callback.searchParams.set("next", next);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: callback.toString(), shouldCreateUser: true },
  });

  if (error) {
    console.error("[auth] signInWithOtp", error.message);
    return error.status === 429
      ? failure("Trop de demandes d'affilée. Patiente une minute avant de redemander un lien.")
      : failure("Le lien n'a pas pu être envoyé. Vérifie l'adresse et réessaie.");
  }
  return success(`C'est envoyé ! Ouvre le lien reçu à ${email} pour ouvrir ton suivi.`);
}

/** Connexion avec e-mail + mot de passe (comptes existants) */
export async function signInWithPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = passwordLoginSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const { email, password, next } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error("[auth] signInWithPassword", error.code ?? error.status, error.message);
    if (error.status === 429) return failure("Trop de tentatives d'affilée. Patiente une minute puis réessaie.");
    if (error.code === "email_not_confirmed") return failure("Cette adresse n'est pas encore confirmée. Utilise plutôt le lien par e-mail.");
    return failure("E-mail ou mot de passe incorrect.");
  }

  redirect(next ?? "/aujourdhui");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}
