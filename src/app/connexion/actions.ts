"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { failure, formToObject, fromZodError, success, type ActionState } from "@/lib/actions";
import { codeLoginSchema, loginSchema, passwordLoginSchema, signUpSchema } from "@/lib/validation/schemas";

async function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

/** Envoie un e-mail de connexion (code à 6 chiffres + lien) ; création du compte au premier passage */
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
  // l'adresse revient au formulaire pour l'étape « code »
  return { ...success(`C'est envoyé ! Recopie ici le code reçu à ${email}.`), values: { email, next: next ?? "" } };
}

/**
 * Connexion avec le code reçu par e-mail. Contrairement au lien (?code=… lié aux cookies du navigateur
 * qui l'a demandé), le code marche partout : app installée sur l'iPhone, Safari, autre appareil.
 */
export async function verifyEmailCode(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = codeLoginSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const { email, code, next } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });

  if (error) {
    console.error("[auth] verifyOtp", error.code ?? error.status, error.message);
    if (error.status === 429) return failure("Trop de tentatives d'affilée. Patiente une minute puis réessaie.");
    return failure("Ce code n'est pas bon ou a expiré. Vérifie le dernier e-mail reçu, ou demande un nouveau code.");
  }

  // Arrivée par « Mot de passe oublié » : direction les Paramètres pour en choisir un nouveau
  redirect(next ?? "/parametres");
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
    if (error.code === "email_not_confirmed") {
      return failure("Cette adresse n'est pas encore confirmée. Ouvre le lien de confirmation reçu par e-mail, ou utilise le lien de connexion.");
    }
    return failure("E-mail ou mot de passe incorrect.");
  }

  redirect(next ?? "/aujourdhui");
}

/** Création d'un compte avec e-mail + mot de passe (comme Atelier Dates et Atelier Cuisine) */
export async function signUpWithPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signUpSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const { email, password, next } = parsed.data;
  const callback = new URL("/auth/callback", await siteUrl());
  if (next) callback.searchParams.set("next", next);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: callback.toString() },
  });

  if (error) {
    console.error("[auth] signUp", error.code ?? error.status, error.message);
    if (error.status === 429) return failure("Trop de demandes d'affilée. Patiente une minute puis réessaie.");
    if (error.code === "user_already_exists") return failure("Un compte existe déjà avec cette adresse. Connecte-toi plutôt.");
    if (error.code === "weak_password") return failure("Ce mot de passe est trop facile à deviner. Choisis-en un plus long ou plus varié.");
    if (error.code === "signup_disabled") return failure("La création de compte est fermée pour le moment.");
    return failure("Le compte n'a pas pu être créé. Vérifie l'adresse et réessaie.");
  }

  // Confirmation d'e-mail activée : Supabase renvoie un utilisateur sans identité si l'adresse est déjà prise
  if (data.user && data.user.identities?.length === 0) {
    return failure("Un compte existe déjà avec cette adresse. Connecte-toi plutôt, ou utilise « Mot de passe oublié ».");
  }

  // Confirmation d'e-mail désactivée : la session est ouverte tout de suite
  if (data.session) redirect(next ?? "/aujourdhui");

  return success(`Ton compte est créé ! Ouvre le lien de confirmation reçu à ${email}, il t'amène directement dans ton suivi.`);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}
