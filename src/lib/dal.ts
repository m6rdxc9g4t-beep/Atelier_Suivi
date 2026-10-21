import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/lib/supabase/database.types";

export type UserContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  me: ProfileRow;
};

/**
 * Couche d'accès aux données : client Supabase agissant avec la session (donc
 * soumis à RLS) et profil de la personne connectée. Redirige vers /connexion sinon.
 * Mémoïsé pour la durée d'un rendu.
 */
export const getUserContext = cache(async (): Promise<UserContext> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) redirect("/connexion");

  const { data: me, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw new Error(`Lecture du profil impossible : ${error.message}`);
  if (!me) redirect("/connexion");

  return { supabase, userId, me };
});
