import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Client Supabase côté serveur (Server Components, Server Actions, Route Handlers).
 * Il agit avec la session de l'utilisateur : toutes les requêtes passent par RLS.
 * À recréer à chaque requête.
 */
export async function createClient() {
  // Données propres à l'utilisateur : toujours rendues au moment de la requête
  // (le client Supabase lit l'heure courante pour vérifier l'expiration du jeton).
  await connection();
  const cookieStore = await cookies();
  const { url, key } = getSupabaseEnv();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Appelé depuis un Server Component : sans effet, le proxy rafraîchit la session.
        }
      },
    },
  });
}
