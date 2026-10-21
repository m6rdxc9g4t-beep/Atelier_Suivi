"use server";

import { refresh } from "next/cache";
import { getUserContext } from "@/lib/dal";
import { failure, formToObject, fromDbError, fromZodError, success, type ActionState } from "@/lib/actions";
import { profileSchema, tokenSchema, uuid } from "@/lib/validation/schemas";

export async function updateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = profileSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const { supabase, userId } = await getUserContext();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", userId);
  if (error) return fromDbError(error);
  refresh();
  return success("Profil enregistré.");
}

export type TokenState = ActionState & { token?: string };

/** Crée une clé de synchronisation : elle n'est affichée qu'une fois (seule son empreinte est gardée) */
export async function createSyncToken(_prev: TokenState, formData: FormData): Promise<TokenState> {
  const parsed = tokenSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const { supabase } = await getUserContext();
  const { data, error } = await supabase.rpc("create_sync_token", { p_label: parsed.data.label });
  if (error) return fromDbError(error);
  refresh();
  return { status: "success", message: "Clé créée. Copie-la maintenant : elle ne sera plus affichée.", token: data };
}

export async function deleteSyncToken(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = uuid.safeParse(formData.get("token_id"));
  if (!id.success) return failure("Clé introuvable.");

  const { supabase } = await getUserContext();
  const { error } = await supabase.from("sync_tokens").delete().eq("id", id.data);
  if (error) return fromDbError(error);
  refresh();
  return success("Clé supprimée : le script qui l'utilisait ne peut plus rien lire.");
}
