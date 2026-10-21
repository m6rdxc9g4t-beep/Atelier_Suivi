// Tests de la préparation locale : lecture du statut Supabase, .env.local, compte, exemples.
// Les tâches d'exemple sont insérées dans un vrai Postgres embarqué (PGlite) pour vérifier
// qu'elles respectent toutes les contraintes du schéma.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { envLocal, exampleTasks, pickStatus, seedIfEmpty, signInOrUp } from "../local-setup.mjs";

test("lit l'adresse et la clé, quels que soient les noms du CLI", () => {
  assert.deepEqual(pickStatus({ API_URL: "http://127.0.0.1:54421/", PUBLISHABLE_KEY: "sb_publishable_x" }), { url: "http://127.0.0.1:54421", key: "sb_publishable_x" });
  assert.deepEqual(pickStatus({ API_URL: "http://127.0.0.1:54421", ANON_KEY: "eyJ" }), { url: "http://127.0.0.1:54421", key: "eyJ" });
  assert.throws(() => pickStatus({}), /npx supabase start/);
});

test(".env.local pointe vers la base locale et le port 3030", () => {
  const env = envLocal({ url: "http://127.0.0.1:54421", key: "k" });
  assert.match(env, /^NEXT_PUBLIC_SUPABASE_URL=http:\/\/127\.0\.0\.1:54421$/m);
  assert.match(env, /^NEXT_PUBLIC_SITE_URL=http:\/\/127\.0\.0\.1:3030$/m);
});

const reply = (status, body) => new Response(body === undefined ? "" : JSON.stringify(body), { status });

test("crée le compte s'il n'existe pas, sinon s'y connecte", async () => {
  const calls = [];
  const fake = (exists) => async (url) => {
    calls.push(url);
    if (url.includes("grant_type=password")) return exists ? reply(200, { access_token: "t1" }) : reply(400, { error_description: "Invalid login credentials" });
    if (url.endsWith("/signup")) return reply(200, { access_token: "t2" });
    return reply(404, {});
  };
  const local = { url: "http://x", key: "k" };
  assert.deepEqual(await signInOrUp(local, "moi@test.fr", "secret1", fake(true)), { session: { access_token: "t1" }, created: false });
  assert.deepEqual(await signInOrUp(local, "moi@test.fr", "secret1", fake(false)), { session: { access_token: "t2" }, created: true });
  assert.ok(calls.some((u) => u.endsWith("/signup")));
});

test("n'ajoute les exemples que si le compte n'a aucune tâche", async () => {
  let posted = null;
  const fake = (hasTasks) => async (url, init = {}) => {
    if ((init.method ?? "GET") === "GET") return reply(200, hasTasks ? [{ id: "a" }] : []);
    posted = JSON.parse(init.body);
    return reply(201);
  };
  assert.equal(await seedIfEmpty({ url: "http://x", key: "k" }, "t", fake(true)), 0);
  assert.equal(posted, null);
  assert.equal(await seedIfEmpty({ url: "http://x", key: "k" }, "t", fake(false)), 7);
  assert.equal(posted.length, 7);
});

test("les tâches d'exemple respectent le schéma (PGlite)", async () => {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    grant usage on schema public to anon, authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
    alter default privileges in schema public grant all on functions to anon, authenticated;
    create schema auth; grant usage on schema auth to anon, authenticated;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant execute on function auth.uid() to anon, authenticated;
  `);
  const dir = new URL("../../supabase/migrations/", import.meta.url);
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) await db.exec(readFileSync(new URL(f, dir), "utf8"));
  const me = "00000000-0000-0000-0000-00000000000a";
  await db.query(`insert into auth.users (id, email) values ($1, 'moi@test.fr')`, [me]);
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${me}', false);`);
  for (const t of exampleTasks("2026-10-21")) {
    const cols = Object.keys(t);
    await db.query(`insert into tasks (${cols.join(", ")}) values (${cols.map((_, i) => `$${i + 1}`).join(", ")})`, cols.map((c) => t[c]));
  }
  const { rows } = await db.query(`select count(*)::int as n from tasks`);
  assert.equal(rows[0].n, 7);
});
