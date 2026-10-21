// Tests du pont Suivi → Trésorerie, avec de faux serveurs (aucun réseau).
// Lancement : npm run test:sync
import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeName, parseEnvFile, pickAccount, pickCategoryId, syncOnce, transactionPayload } from "../sync-tresorerie.mjs";

const config = {
  supabaseUrl: "https://suivi.supabase.co",
  supabaseKey: "sb_publishable_x",
  token: "suivi_secret",
  tresorerieUrl: "http://127.0.0.1:5050",
  defaultAccount: "",
};

/** Faux Supabase + faux Trésorerie, avec journal des requêtes */
function fakeWorld({ lines, existing = [], tresorerieUp = true, failPostFor = null }) {
  const calls = [];
  const sentMarks = [];
  const transactions = [...existing];
  const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  const fetchImpl = async (url, init = {}) => {
    const u = new URL(url);
    calls.push({ method: init.method ?? "GET", path: u.pathname + u.search, headers: init.headers, body: init.body });
    if (u.host === "suivi.supabase.co") {
      const args = JSON.parse(init.body);
      assert.equal(args.p_token, "suivi_secret");
      if (u.pathname.endsWith("/sync_pending_lines")) return reply(200, lines);
      if (u.pathname.endsWith("/sync_mark_sent")) {
        sentMarks.push(args);
        return reply(200, true);
      }
    }
    if (!tresorerieUp) throw new TypeError("fetch failed");
    if (u.pathname === "/api/ping") return reply(200, { app: "atelier-tresorerie" });
    if (u.pathname === "/api/accounts")
      return reply(200, {
        items: [
          { id: 1, name: "Livret A", type: "epargne", archived: 0 },
          { id: 2, name: "Compte courant", type: "courant", archived: 0 },
          { id: 3, name: "Ancien compte", type: "courant", archived: 1 },
        ],
      });
    if (u.pathname === "/api/categories") return reply(200, { items: [{ id: 10, name: "Santé" }, { id: 11, name: "Abonnements" }] });
    if (u.pathname === "/api/transactions" && (init.method ?? "GET") === "GET") {
      const q = u.searchParams.get("q");
      return reply(200, { items: transactions.filter((t) => t.notes.includes(q)) });
    }
    if (u.pathname === "/api/transactions" && init.method === "POST") {
      assert.ok(init.headers["X-Requested-With"], "en-tête anti-CSRF exigé par Trésorerie");
      const body = JSON.parse(init.body);
      if (failPostFor && body.label === failPostFor) return reply(400, { error: "Certains champs sont invalides.", fields: { amount: "Montant invalide." } });
      const t = { id: 100 + transactions.length, ...body };
      transactions.push(t);
      return reply(201, t);
    }
    return reply(404, { error: "Ressource introuvable" });
  };
  return { fetchImpl, calls, sentMarks, transactions };
}

const line = (id, patch = {}) => ({
  id,
  day: "2026-10-21",
  label: "Pharmacie : sirop",
  amount_cents: -890,
  category: "Santé",
  account: "Compte courant",
  task_title: "Pharmacie",
  ...patch,
});
const quiet = () => {};

test("lit un fichier de configuration KEY=VALUE", () => {
  assert.deepEqual(parseEnvFile('# commentaire\nSUIVI_SYNC_TOKEN="abc"\n\nTRESORERIE_URL=http://x\n'), { SUIVI_SYNC_TOKEN: "abc", TRESORERIE_URL: "http://x" });
});

test("retrouve compte et catégorie par leur nom, sans accents ni casse", () => {
  const accounts = [
    { id: 1, name: "Livret A", type: "epargne", archived: 0 },
    { id: 2, name: "Compte Courant", type: "courant", archived: 0 },
  ];
  assert.equal(pickAccount(accounts, "compte courant").id, 2);
  assert.equal(pickAccount(accounts, "Inconnu").id, 2, "repli : premier compte courant");
  assert.equal(pickAccount(accounts, "Inconnu", "Livret A").id, 1, "repli : compte par défaut configuré");
  assert.equal(pickCategoryId([{ id: 7, name: "Santé" }], "SANTE"), 7);
  assert.equal(pickCategoryId([{ id: 7, name: "Santé" }], "Inconnue"), undefined);
  assert.equal(normalizeName("  Énergie  & Internet "), "energie & internet");
});

test("le corps de transaction garde le signe et la marque Suivi", () => {
  const p = transactionPayload(line("abc"), 2, 10);
  assert.deepEqual(p, { account_id: 2, date: "2026-10-21", label: "Pharmacie : sirop", amount: "-8.90", notes: "atelier_Suivi · Pharmacie [suivi:abc]", category_id: 10 });
});

test("envoie les lignes en attente puis les marque envoyées", async () => {
  const w = fakeWorld({ lines: [line("l1"), line("l2", { label: "Abonnement salle", amount_cents: -2990, category: "Abonnements" })] });
  const r = await syncOnce(config, { fetchImpl: w.fetchImpl, log: quiet });
  assert.deepEqual(r, { skipped: false, sent: 2, failed: 0 });
  assert.equal(w.transactions.length, 2);
  assert.equal(w.transactions[1].category_id, 11);
  assert.equal(w.transactions[0].account_id, 2);
  assert.deepEqual(
    w.sentMarks.map((m) => [m.p_line_id, m.p_tresorerie_id]),
    [
      ["l1", 100],
      ["l2", 101],
    ],
  );
});

test("pas de doublon si la transaction existe déjà (envoi interrompu)", async () => {
  const w = fakeWorld({ lines: [line("l1")], existing: [{ id: 55, notes: "atelier_Suivi · Pharmacie [suivi:l1]" }] });
  await syncOnce(config, { fetchImpl: w.fetchImpl, log: quiet });
  assert.equal(w.transactions.length, 1, "aucune nouvelle transaction");
  assert.equal(w.sentMarks[0].p_tresorerie_id, 55);
});

test("Trésorerie arrêtée : rien n'est lu ni marqué", async () => {
  const w = fakeWorld({ lines: [line("l1")], tresorerieUp: false });
  const r = await syncOnce(config, { fetchImpl: w.fetchImpl, log: quiet });
  assert.equal(r.skipped, true);
  assert.equal(w.sentMarks.length, 0);
  assert.ok(!w.calls.some((c) => c.path.includes("sync_pending_lines")));
});

test("une ligne refusée par Trésorerie reste en attente, les autres partent", async () => {
  const w = fakeWorld({ lines: [line("l1", { label: "Refusée" }), line("l2")], failPostFor: "Refusée" });
  const r = await syncOnce(config, { fetchImpl: w.fetchImpl, log: quiet });
  assert.deepEqual(r, { skipped: false, sent: 1, failed: 1 });
  assert.deepEqual(
    w.sentMarks.map((m) => m.p_line_id),
    ["l2"],
  );
});
