"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { failure, formToObject, fromZodError, success, type ActionState } from "@/lib/actions";
import { PASSWORD_MIN_LENGTH } from "@/lib/meta";
import { loginSchema, newPasswordSchema, passwordLoginSchema, signUpSchema } from "@/lib/validation/schemas";

/** Page où l'on choisit un nouveau mot de passe après le lien « mot de passe oublié » */
const NEW_PASSWORD_PATH = "/nouveau-mot-de-passe";

async function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

/** Adresse de retour des liens envoyés par e-mail (confirmation, mot de passe oublié) */
async function callbackUrl(next?: string) {
  const callback = new URL("/auth/callback", await siteUrl());
  if (next) callback.searchParams.set("next", next);
  return callback.toString();
}

/** Erreurs communes aux demandes d'authentification */
function authFailure(error: AuthError, fallback: string): ActionState {
  if (error.status === 429 || error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit") {
    return failure("Trop de demandes d'affilée. Patiente une minute puis réessaie.");
  }
  if (error.code === "weak_password") {
    return failure(`Ce mot de passe est trop faible. Choisis-en un plus long (au moins ${PASSWORD_MIN_LENGTH} caractères), avec chiffres et lettres.`);
  }
  if (error.code === "signup_disabled") return failure("La création de compte est fermée pour le moment.");
  return failure(fallback);
}

/** Connexion avec e-mail + mot de passe */
export async function signInWithPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = passwordLoginSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const { email, password, next } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error("[auth] signInWithPassword", error.code ?? error.status, error.message);
    if (error.status === 429) return failure("Trop de tentatives d'affilée. Patiente une minute puis réessaie.");
    if (error.code === "email_not_confirmed") {
      return failure("Cette adresse n'est pas encore confirmée. Ouvre le lien reçu par e-mail à la création du compte, puis reconnecte-toi.");
    }
    return failure("E-mail ou mot de passe incorrect.");
  }

  redirect(next ?? "/aujourdhui");
}

/** Création d'un compte avec e-mail + mot de passe (comme Atelier Cuisine) */
export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signUpSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const { email, password, next } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: await callbackUrl(next) },
  });

  if (error) {
    console.error("[auth] signUp", error.code ?? error.status, error.message);
    if (error.code === "user_already_exists" || error.code === "email_exists") {
      return failure("Un compte existe déjà avec cette adresse. Connecte-toi, ou choisis « Mot de passe oublié ».");
    }
    return authFailure(error, "Le compte n'a pas pu être créé. Vérifie l'adresse et réessaie.");
  }

  // Confirmation d'e-mail désactivée : la session est ouverte tout de suite
  if (data.session) redirect(next ?? "/aujourdhui");

  // Confirmation activée : Supabase ne dit pas si l'adresse existe déjà, sauf par une liste d'identités vide
  if (data.user && data.user.identities?.length === 0) {
    return failure("Un compte existe déjà avec cette adresse. Connecte-toi, ou choisis « Mot de passe oublié ».");
  }
  return success(`Compte créé ! Ouvre le lien de confirmation envoyé à ${email} : il t'amène directement dans ton suivi.`);
}

/** Envoie un lien pour choisir un nouveau mot de passe ; il ouvre aussi la session */
export async function sendPasswordReset(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const { email } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: await callbackUrl(NEW_PASSWORD_PATH) });

  if (error) {
    console.error("[auth] resetPasswordForEmail", error.code ?? error.status, error.message);
    return authFailure(error, "Le lien n'a pas pu être envoyé. Vérifie l'adresse et réessaie.");
  }
  return success(`Si un compte existe pour ${email}, un lien vient de partir. Ouvre-le sur cet appareil pour choisir un nouveau mot de passe.`);
}

/** Nouveau mot de passe pour la session ouverte (après le lien, ou depuis les Paramètres) */
export async function updatePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = newPasswordSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    console.error("[auth] updateUser(password)", error.code ?? error.status, error.message);
    if (error.code === "same_password") return failure("C'est déjà ton mot de passe actuel : choisis-en un autre.");
    if (error.code === "reauthentication_needed") {
      return failure("Par sécurité, déconnecte-toi puis passe par « Mot de passe oublié » pour le changer.");
    }
    if (error.status === 401 || error.code === "session_not_found") {
      return failure("Ta session a expiré. Redemande un lien depuis la page de connexion.");
    }
    return authFailure(error, "Le mot de passe n'a pas pu être enregistré. Réessaie dans un instant.");
  }

  if (parsed.data.next) redirect(parsed.data.next);
  return success("Mot de passe enregistré.");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}
