// Applique toutes les migrations dans un Postgres embarqué (PGlite) et vérifie
// l'isolation des données (RLS), les fonctions de coche et la synchronisation par clé.
// Lancement : npm run test:rls
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";

const migrationsDir = new URL("../migrations/", import.meta.url);
const migrations = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => readFileSync(new URL(f, migrationsDir), "utf8"));
const db = new PGlite();

// --- Stub minimal de l'environnement Supabase ---------------------------------
await db.exec(`
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
create schema auth; grant usage on schema auth to anon, authenticated;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant execute on function auth.uid() to anon, authenticated;
`);

for (const sql of migrations) await db.exec(sql);
console.log(`✓ ${migrations.length} migration(s) appliquée(s)`);

const U = {
  A: "00000000-0000-0000-0000-00000000000a",
  C: "00000000-0000-0000-0000-00000000000c",
};
for (const [n, id] of Object.entries(U)) {
  await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`, [
    id, `${n.toLowerCase()}@test.fr`, JSON.stringify({ display_name: n }),
  ]);
}

let failures = 0;
async function as(user, sql, params = []) {
  await db.exec(`set role ${user ? "authenticated" : "anon"}; select set_config('request.jwt.claim.sub', '${user ?? ""}', false);`);
  try {
    return (await db.query(sql, params)).rows;
  } finally {
    await db.exec(`reset role;`);
  }
}
async function expectOk(label, fn, check) {
  try {
    const r = await fn();
    if (check && !check(r)) { failures++; console.log("✗", label, JSON.stringify(r)); }
    else console.log("✓", label);
    return r;
  } catch (e) { failures++; console.log("✗", label, "→", e.message); }
}
async function expectFail(label, fn) {
  try { const r = await fn(); failures++; console.log("✗ (aurait dû échouer)", label, JSON.stringify(r)); }
  catch (e) { console.log("✓", label, "→", e.message); }
}
const rowsOrThrow = (r) => { if (!r.length) throw new Error("0 ligne"); return r; };

// --- Profils -----------------------------------------------------------------
await expectOk("profil créé à l'inscription", () => as(U.A, `select display_name from profiles`), (r) => r.length === 1 && r[0].display_name === "A");
await expectOk("C ne voit que son profil", () => as(U.C, `select id from profiles`), (r) => r.length === 1 && r[0].id === U.C);

// --- Tâches ------------------------------------------------------------------
const [{ id: sport }] = await as(U.A, `insert into tasks (title, category, recurrence, weekdays) values ('Sport', 'sport', 'weekdays', '{1,3,5}') returning id`);
const [{ id: pharma }] = await as(U.A, `insert into tasks (title, category, recurrence, due_on, finance_enabled, finance_ask, finance_label, finance_category)
  values ('Pharmacie', 'achats', 'once', '2026-10-21', true, true, 'Pharmacie : sirop', 'Santé') returning id`);
const [{ id: abo }] = await as(U.A, `insert into tasks (title, recurrence, month_day, finance_enabled, finance_amount_cents)
  values ('Abonnement salle', 'monthly', 21, true, 2990) returning id`);
const [{ id: cTask }] = await as(U.C, `insert into tasks (title) values ('Tâche de C') returning id`);

await expectOk("A voit ses 3 tâches", () => as(U.A, `select id from tasks`), (r) => r.length === 3);
await expectOk("C ne voit pas les tâches de A", () => as(U.C, `select id from tasks`), (r) => r.length === 1 && r[0].id === cTask);
await expectFail("tâche « certains jours » sans jour refusée", () => as(U.A, `insert into tasks (title, recurrence) values ('x', 'weekdays')`));
await expectFail("lien Trésorerie sans montant ni demande refusé", () => as(U.A, `insert into tasks (title, finance_enabled) values ('x', true)`));
await expectFail("A ne peut pas créer une tâche au nom de C", () => as(U.A, `insert into tasks (user_id, title) values ($1, 'x')`, [U.C]));
await expectFail("A ne peut pas donner sa tâche à C", () => as(U.A, `update tasks set user_id = $1 where id = $2 returning id`, [U.C, sport]).then(rowsOrThrow));
await expectOk("C ne peut pas modifier la tâche de A (0 ligne)", () => as(U.C, `update tasks set title = 'x' where id = $1 returning id`, [sport]), (r) => r.length === 0);
await expectOk("anon ne voit rien", async () => { try { return await as(null, `select * from tasks`); } catch { return []; } }, (r) => r.length === 0);

// --- Coches ------------------------------------------------------------------
await expectOk("A coche le sport", () => as(U.A, `select public.complete_task($1, '2026-10-21') as r`, [sport]), (r) => r[0].r.line_id === null);
await expectOk("double coche sans doublon", () => as(U.A, `select public.complete_task($1, '2026-10-21') as r`, [sport]), (r) => r[0].r.already === true);
await expectFail("C ne peut pas cocher la tâche de A", () => as(U.C, `select public.complete_task($1, '2026-10-21')`, [sport]));
await expectFail("C ne peut pas insérer de coche sur la tâche de A (FK composite)", () => as(U.C, `insert into completions (task_id, day) values ($1, '2026-10-30')`, [sport]));
await expectFail("anon ne peut pas cocher", () => as(null, `select public.complete_task($1, '2026-10-21')`, [sport]));

// Montant demandé à la coche
await expectFail("montant manquant refusé", () => as(U.A, `select public.complete_task($1, '2026-10-21', true)`, [pharma]));
await expectOk("coche pharmacie avec 8,90 €", () => as(U.A, `select public.complete_task($1, '2026-10-21', true, 890) as r`, [pharma]), (r) => r[0].r.line_id !== null);
await expectOk("ligne de dépense négative, libellé et catégorie de la tâche", () => as(U.A, `select amount_cents, label, category, status from treso_lines where task_id = $1`, [pharma]),
  (r) => r.length === 1 && r[0].amount_cents === -890 && r[0].label === "Pharmacie : sirop" && r[0].category === "Santé" && r[0].status === "pending");
await expectOk("tâche « une fois » marquée faite, dernier montant retenu", () => as(U.A, `select done_on::text, finance_amount_cents from tasks where id = $1`, [pharma]),
  (r) => r[0].done_on === "2026-10-21" && r[0].finance_amount_cents === 890);
await expectOk("décocher retire la ligne non envoyée", async () => {
  await as(U.A, `select public.uncomplete_task($1, '2026-10-21')`, [pharma]);
  return as(U.A, `select (select count(*) from treso_lines where task_id = $1)::int n, (select done_on from tasks where id = $1) d`, [pharma]);
}, (r) => r[0].n === 0 && r[0].d === null);

// Montant fixe, puis ligne envoyée conservée au décochage
await as(U.A, `select public.complete_task($1, '2026-10-21', true)`, [abo]);
const [{ id: aboLine }] = await as(U.A, `select id from treso_lines where task_id = $1`, [abo]);
await expectOk("montant fixe de la tâche (−29,90 €)", () => as(U.A, `select amount_cents from treso_lines where id = $1`, [aboLine]), (r) => r[0].amount_cents === -2990);
await as(U.A, `update treso_lines set status = 'sent', sent_at = now() where id = $1`, [aboLine]);
await expectOk("décocher garde la ligne déjà envoyée", async () => {
  const [{ r }] = await as(U.A, `select public.uncomplete_task($1, '2026-10-21') as r`, [abo]);
  const rows = await as(U.A, `select completion_id from treso_lines where id = $1`, [aboLine]);
  return { r, rows };
}, ({ r, rows }) => r.kept_sent_lines === 1 && rows.length === 1 && rows[0].completion_id === null);
await expectFail("A ne peut pas changer le propriétaire d'une ligne", () => as(U.A, `update treso_lines set user_id = $1 where id = $2 returning id`, [U.C, aboLine]).then(rowsOrThrow));
await expectOk("C ne voit aucune ligne de A", () => as(U.C, `select id from treso_lines`), (r) => r.length === 0);
await expectFail("C ne peut pas créer une ligne liée à la tâche de A", () => as(U.C, `insert into treso_lines (task_id, day, label, amount_cents) values ($1, '2026-10-21', 'x', -100)`, [abo]));

// --- Clés de synchronisation ---------------------------------------------------
await as(U.A, `select public.complete_task($1, '2026-10-22', true, 1250)`, [pharma]);
await as(U.C, `insert into treso_lines (day, label, amount_cents) values ('2026-10-21', 'Ligne de C', -500)`);
const [{ token }] = await as(U.A, `select public.create_sync_token('MacBook') as token`);
await expectOk("clé créée (suivi_…)", async () => token, (t) => typeof t === "string" && t.startsWith("suivi_") && t.length > 60);
await expectOk("seule l'empreinte est stockée", () => as(U.A, `select token_hash, hint from sync_tokens`), (r) => r.length === 1 && r[0].token_hash !== token && token.endsWith(r[0].hint));
await expectFail("insertion directe d'une clé refusée", () => as(U.A, `insert into sync_tokens (token_hash, hint) values ('x', 'x')`));
await expectFail("anon ne peut pas créer de clé", () => as(null, `select public.create_sync_token('x')`));
await expectOk("C ne voit pas la clé de A", () => as(U.C, `select id from sync_tokens`), (r) => r.length === 0);
await expectFail("clé inconnue refusée", () => as(null, `select * from public.sync_pending_lines('suivi_faux')`));
await expectFail("sync_token_owner non appelable directement", () => as(null, `select public.sync_token_owner($1)`, [token]));
const pending = await expectOk("le script (anon + clé) reçoit uniquement les lignes en attente de A", () => as(null, `select * from public.sync_pending_lines($1)`, [token]),
  (r) => r.length === 1 && r[0].amount_cents === -1250 && r[0].label === "Pharmacie : sirop");
await expectOk("marquer la ligne envoyée avec l'id Trésorerie", () => as(null, `select public.sync_mark_sent($1, $2, 42) as ok`, [token, pending?.[0]?.id]), (r) => r[0].ok === true);
await expectOk("plus rien en attente, id Trésorerie enregistré", async () => {
  const left = await as(null, `select * from public.sync_pending_lines($1)`, [token]);
  const sent = await as(U.A, `select tresorerie_id, status from treso_lines where id = $1`, [pending?.[0]?.id]);
  return { left, sent };
}, ({ left, sent }) => left.length === 0 && sent[0].tresorerie_id === 42 && sent[0].status === "sent");
const [{ id: cLine }] = await as(U.C, `select id from treso_lines`);
await expectOk("la clé de A ne peut pas toucher la ligne de C", () => as(null, `select public.sync_mark_sent($1, $2, 1) as ok`, [token, cLine]), (r) => r[0].ok === false);
await expectOk("dernière utilisation de la clé enregistrée", () => as(U.A, `select last_used_at from sync_tokens`), (r) => r[0].last_used_at !== null);
await expectOk("A supprime sa clé", () => as(U.A, `delete from sync_tokens returning id`), (r) => r.length === 1);
await expectFail("clé supprimée refusée", () => as(null, `select * from public.sync_pending_lines($1)`, [token]));

// --- Suppression d'une tâche ----------------------------------------------------
await expectOk("supprimer une tâche garde ses lignes Trésorerie", async () => {
  await as(U.A, `delete from tasks where id = $1`, [pharma]);
  return as(U.A, `select task_id from treso_lines where label = 'Pharmacie : sirop'`);
}, (r) => r.length === 1 && r[0].task_id === null);

if (failures) {
  console.log(`\n${failures} échec(s)`);
  process.exit(1);
}
console.log("\nToutes les règles de sécurité sont respectées.");
