#!/usr/bin/env node
// =============================================================================
// atelier_Suivi → atelier_Trésorerie
//
// Tourne sur le Mac où atelier_Trésorerie est installée (http://127.0.0.1:5050).
// 1. lit les lignes en attente d'atelier_Suivi (Supabase, avec une clé de synchronisation) ;
// 2. crée chaque ligne comme transaction dans Trésorerie (POST /api/transactions),
//    en retrouvant le compte et la catégorie par leur nom ;
// 3. marque la ligne « envoyée » dans Suivi, avec l'id de la transaction.
//
// Sans doublon : chaque transaction porte « [suivi:<id>] » dans ses notes. Si une
// transaction avec cette marque existe déjà (envoi interrompu), elle est réutilisée.
// Si Trésorerie n'est pas lancée, le script ne fait rien et réessaiera au prochain passage.
//
// Configuration (variables d'environnement, ou fichier ~/.config/atelier-suivi/sync.env) :
//   SUIVI_SUPABASE_URL, SUIVI_SUPABASE_KEY   URL et clé publishable du projet Supabase de Suivi
//   SUIVI_SYNC_TOKEN                         clé créée dans Suivi → Paramètres
//   TRESORERIE_URL                           défaut : http://127.0.0.1:5050
//   TRESORERIE_DEFAULT_ACCOUNT               compte utilisé si celui de la ligne n'existe pas
//
// Aucune dépendance : Node.js ≥ 20 (fetch intégré).
// =============================================================================
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const CONFIG_FILE = join(homedir(), ".config", "atelier-suivi", "sync.env");

/** Lit un fichier KEY=VALUE (lignes vides et # ignorées, guillemets retirés) */
export function parseEnvFile(text) {
  const out = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    out[key] = value;
  }
  return out;
}

export function loadConfig(env = process.env, file = CONFIG_FILE) {
  let fromFile = {};
  try {
    fromFile = parseEnvFile(readFileSync(file, "utf8"));
  } catch {
    /* pas de fichier : variables d'environnement seules */
  }
  const get = (k) => env[k] ?? fromFile[k];
  const config = {
    supabaseUrl: (get("SUIVI_SUPABASE_URL") ?? "").replace(/\/+$/, ""),
    supabaseKey: get("SUIVI_SUPABASE_KEY") ?? "",
    token: get("SUIVI_SYNC_TOKEN") ?? "",
    tresorerieUrl: (get("TRESORERIE_URL") ?? "http://127.0.0.1:5050").replace(/\/+$/, ""),
    defaultAccount: get("TRESORERIE_DEFAULT_ACCOUNT") ?? "",
  };
  const missing = [
    ["SUIVI_SUPABASE_URL", config.supabaseUrl],
    ["SUIVI_SUPABASE_KEY", config.supabaseKey],
    ["SUIVI_SYNC_TOKEN", config.token],
  ]
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) throw new Error(`Configuration incomplète : ${missing.join(", ")} (voir ${file}).`);
  return config;
}

/** « Santé », « sante », « SANTÉ » → même clé */
export function normalizeName(name) {
  return String(name ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Compte de la ligne par son nom ; sinon le compte par défaut ; sinon le premier compte courant */
export function pickAccount(accounts, wanted, fallbackName) {
  const open = accounts.filter((a) => !a.archived);
  const byName = (n) => n && open.find((a) => normalizeName(a.name) === normalizeName(n));
  return byName(wanted) || byName(fallbackName) || open.find((a) => a.type === "courant") || open[0] || null;
}

export function pickCategoryId(categories, wanted) {
  if (!wanted) return undefined;
  return categories.find((c) => normalizeName(c.name) === normalizeName(wanted))?.id;
}

export const marker = (lineId) => `[suivi:${lineId}]`;

/** Corps de POST /api/transactions de Trésorerie (montant en euros, signe conservé) */
export function transactionPayload(line, accountId, categoryId) {
  const payload = {
    account_id: accountId,
    date: line.day,
    label: line.label,
    amount: (line.amount_cents / 100).toFixed(2),
    notes: `atelier_Suivi${line.task_title ? ` · ${line.task_title}` : ""} ${marker(line.id)}`,
  };
  if (categoryId) payload.category_id = categoryId;
  return payload;
}

class HttpError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function json(res, what) {
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* réponse non JSON */
  }
  if (!res.ok) {
    const detail = body?.error ?? body?.message ?? text.slice(0, 200);
    const fields = body?.fields ? ` ${JSON.stringify(body.fields)}` : "";
    throw new HttpError(`${what} : ${res.status} ${detail}${fields}`, res.status);
  }
  return body;
}

export function createClients(config, fetchImpl = fetch) {
  const rpc = async (fn, args) =>
    json(
      await fetchImpl(`${config.supabaseUrl}/rest/v1/rpc/${fn}`, {
        method: "POST",
        headers: { apikey: config.supabaseKey, Authorization: `Bearer ${config.supabaseKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(args),
      }),
      `Suivi (${fn})`,
    );

  const treso = async (path, init = {}) =>
    json(
      await fetchImpl(`${config.tresorerieUrl}${path}`, {
        ...init,
        headers: { "X-Requested-With": "atelier-suivi", "Content-Type": "application/json", ...(init.headers ?? {}) },
      }),
      `Trésorerie (${init.method ?? "GET"} ${path.split("?")[0]})`,
    );

  return { rpc, treso };
}

/** Un passage complet. Renvoie le bilan ; n'échoue pas si Trésorerie est simplement arrêtée. */
export async function syncOnce(config, { fetchImpl = fetch, log = console.log } = {}) {
  const { rpc, treso } = createClients(config, fetchImpl);

  try {
    const ping = await treso("/api/ping");
    if (ping?.app !== "atelier-tresorerie") throw new Error("ce n'est pas atelier_Trésorerie");
  } catch (err) {
    log(`Trésorerie injoignable sur ${config.tresorerieUrl} (${err.message}) : rien envoyé, nouvel essai au prochain passage.`);
    return { skipped: true, sent: 0, failed: 0 };
  }

  const lines = await rpc("sync_pending_lines", { p_token: config.token });
  if (!lines?.length) {
    log("Aucune ligne en attente.");
    return { skipped: false, sent: 0, failed: 0 };
  }

  const [{ items: accounts }, { items: categories }] = await Promise.all([treso("/api/accounts"), treso("/api/categories")]);
  let sent = 0;
  let failed = 0;

  for (const line of lines) {
    try {
      const account = pickAccount(accounts, line.account, config.defaultAccount);
      if (!account) throw new Error("aucun compte dans Trésorerie");

      const search = await treso(`/api/transactions?q=${encodeURIComponent(marker(line.id))}&per_page=5`);
      let transaction = search?.items?.find((t) => (t.notes ?? "").includes(marker(line.id)));
      if (!transaction) {
        transaction = await treso("/api/transactions", {
          method: "POST",
          body: JSON.stringify(transactionPayload(line, account.id, pickCategoryId(categories, line.category))),
        });
      }

      await rpc("sync_mark_sent", { p_token: config.token, p_line_id: line.id, p_tresorerie_id: transaction.id });
      sent++;
      log(`✓ ${line.day} · ${line.label} · ${(line.amount_cents / 100).toFixed(2)} € → ${account.name} (n° ${transaction.id})`);
    } catch (err) {
      failed++;
      log(`✗ ${line.day} · ${line.label} : ${err.message}`);
    }
  }

  log(`${sent} ligne(s) envoyée(s)${failed ? `, ${failed} en échec (nouvel essai au prochain passage)` : ""}.`);
  return { skipped: false, sent, failed };
}

async function main() {
  const stamp = new Date().toLocaleString("fr-FR");
  const log = (m) => console.log(`[${stamp}] ${m}`);
  try {
    const result = await syncOnce(loadConfig(), { log });
    process.exitCode = result.failed ? 1 : 0;
  } catch (err) {
    log(`Échec : ${err.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
