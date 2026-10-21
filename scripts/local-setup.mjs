#!/usr/bin/env node
// =============================================================================
// Préparation de la version locale (appelé par scripts/macos/start-local.sh) :
// 1. lit l'adresse et la clé de la base Supabase locale (npx supabase status) ;
// 2. écrit .env.local pour l'app (l'ancien fichier est gardé en .env.local.bak) ;
// 3. crée ton compte local (ou s'y connecte) avec SUIVI_EMAIL / SUIVI_PASSWORD ;
// 4. ajoute des tâches d'exemple si ton compte n'en a aucune.
// Aucune clé « service_role » : tout passe par ton compte, sous RLS.
// =============================================================================
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const LOCAL_PORT = 3030;

/** Adresse et clé publique dans la sortie JSON de `supabase status` (noms selon la version du CLI) */
export function pickStatus(status) {
  const url = status.API_URL ?? status.api_url ?? status.API?.URL;
  const key = status.PUBLISHABLE_KEY ?? status.ANON_KEY ?? status.anon_key;
  if (!url || !key) throw new Error("Base locale introuvable : lance d'abord « npx supabase start ».");
  return { url: url.replace(/\/+$/, ""), key };
}

export function envLocal({ url, key }) {
  return [
    "# Version locale (créé par scripts/local-setup.mjs) — base Supabase sur ce Mac",
    `NEXT_PUBLIC_SUPABASE_URL=${url}`,
    `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${key}`,
    `NEXT_PUBLIC_SITE_URL=http://127.0.0.1:${LOCAL_PORT}`,
    "NEXT_PUBLIC_APP_TIMEZONE=Europe/Paris",
    "",
  ].join("\n");
}

const todayParis = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());

function addDays(day, n) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Tâches d'exemple (les mêmes que le prototype) */
export function exampleTasks(today = todayParis()) {
  const dom = Number(today.slice(8, 10));
  const base = { starts_on: today };
  return [
    { ...base, title: "Prendre la cure de magnésium", category: "sante", moment: "matin", recurrence: "daily", ends_on: addDays(today, 20), note: "1 comprimé au petit-déjeuner" },
    { ...base, title: "Arroser les plantes", category: "maison", moment: "matin", recurrence: "interval", every_days: 3 },
    { ...base, title: "Boire 1,5 L d'eau", category: "sante", moment: "journee", recurrence: "daily" },
    {
      ...base,
      title: "Acheter le sirop à la pharmacie",
      category: "achats",
      moment: "journee",
      recurrence: "once",
      due_on: today,
      finance_enabled: true,
      finance_ask: true,
      finance_amount_cents: 890,
      finance_label: "Pharmacie : sirop",
      finance_category: "Santé",
      finance_account: "Compte courant",
    },
    {
      ...base,
      title: "Payer l'abonnement de la salle",
      category: "achats",
      moment: "journee",
      recurrence: "monthly",
      month_day: dom,
      finance_enabled: true,
      finance_amount_cents: 2990,
      finance_label: "Abonnement salle de sport",
      finance_category: "Abonnements",
      finance_account: "Compte courant",
    },
    { ...base, title: "Ménage : cuisine et salle de bain", category: "maison", moment: "apres_midi", recurrence: "weekdays", weekdays: [3, 6] },
    { ...base, title: "Séance de sport", category: "sport", moment: "soir", recurrence: "weekdays", weekdays: [1, 3, 5], note: "45 min : cardio + gainage" },
  ];
}

async function request(url, init, what, fetchImpl = fetch) {
  const res = await fetchImpl(url, init);
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(`${what} : ${res.status} ${body?.msg ?? body?.message ?? body?.error_description ?? text.slice(0, 200)}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

/** Connexion à ton compte local, ou création s'il n'existe pas encore */
export async function signInOrUp({ url, key }, email, password, fetchImpl = fetch) {
  const headers = { apikey: key, "Content-Type": "application/json" };
  const post = (path, body, what) => request(`${url}/auth/v1/${path}`, { method: "POST", headers, body: JSON.stringify(body) }, what, fetchImpl);
  try {
    const session = await post("token?grant_type=password", { email, password }, "Connexion");
    return { session, created: false };
  } catch (err) {
    if (err.status !== 400) throw err;
  }
  const signup = await post("signup", { email, password, data: { display_name: email.split("@")[0] } }, "Création du compte");
  if (!signup?.access_token) {
    throw new Error("Compte créé mais pas de session : vérifie le mot de passe (6 caractères minimum) ou que la confirmation par e-mail est désactivée en local.");
  }
  return { session: signup, created: true };
}

export async function seedIfEmpty({ url, key }, accessToken, fetchImpl = fetch) {
  const headers = { apikey: key, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
  const existing = await request(`${url}/rest/v1/tasks?select=id&limit=1`, { headers }, "Lecture des tâches", fetchImpl);
  if (existing.length) return 0;
  await request(
    `${url}/rest/v1/tasks`,
    { method: "POST", headers: { ...headers, Prefer: "return=minimal" }, body: JSON.stringify(exampleTasks()) },
    "Ajout des exemples",
    fetchImpl,
  );
  return exampleTasks().length;
}

async function main() {
  const root = process.cwd();
  const status = JSON.parse(execFileSync("npx", ["-y", "supabase", "status", "-o", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }));
  const local = pickStatus(status);

  const envPath = join(root, ".env.local");
  const content = envLocal(local);
  if (existsSync(envPath) && readFileSync(envPath, "utf8") !== content) {
    copyFileSync(envPath, `${envPath}.bak`);
    console.log("Ancien .env.local gardé dans .env.local.bak");
  }
  writeFileSync(envPath, content);
  console.log(`✓ .env.local → base locale ${local.url}`);

  const email = process.env.SUIVI_EMAIL;
  const password = process.env.SUIVI_PASSWORD;
  if (!email || !password) {
    console.log("Compte déjà créé lors d'un lancement précédent : connecte-toi avec ton e-mail et ton mot de passe.");
    return;
  }
  const { session, created } = await signInOrUp(local, email, password);
  console.log(created ? `✓ Compte local créé : ${email}` : `✓ Compte local existant : ${email}`);
  const added = await seedIfEmpty(local, session.access_token);
  if (added) console.log(`✓ ${added} tâches d'exemple ajoutées (modifie-les ou supprime-les dans l'onglet Tâches)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(`Échec : ${err.message}`);
    process.exit(1);
  });
}
