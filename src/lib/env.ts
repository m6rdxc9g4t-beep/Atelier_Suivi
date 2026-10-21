/**
 * Variables publiques Supabase. La clé "publishable" (sb_publishable_…) remplace
 * l'ancienne clé "anon" ; les deux noms sont acceptés.
 */
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Variables Supabase manquantes : renseigne NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY dans .env.local (voir .env.example).",
    );
  }
  return { url, key };
}

/** Fuseau qui définit « aujourd'hui » (les serveurs Vercel sont en UTC). */
export const APP_TIMEZONE = process.env.NEXT_PUBLIC_APP_TIMEZONE ?? "Europe/Paris";
