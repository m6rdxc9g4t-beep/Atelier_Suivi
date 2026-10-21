"use server";

import { refresh } from "next/cache";
import { getUserContext } from "@/lib/dal";
import { failure, formToObject, fromDbError, fromZodError, success, type ActionState } from "@/lib/actions";
import { lineSchema, uuid } from "@/lib/validation/schemas";

export async function updateLine(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = lineSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const v = parsed.data;

  const { supabase } = await getUserContext();
  const { data, error } = await supabase
    .from("treso_lines")
    .update({
      day: v.day,
      label: v.label,
      amount_cents: v.kind === "recette" ? v.amount : -v.amount,
      category: v.category,
      account: v.account,
    })
    .eq("id", v.line_id)
    .eq("status", "pending")
    .select("id");
  if (error) return fromDbError(error);
  if (!data.length) return failure("Cette ligne a déjà été envoyée : modifie-la directement dans Trésorerie.");

  refresh();
  return success("Ligne mise à jour.");
}

export async function deleteLine(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = uuid.safeParse(formData.get("line_id"));
  if (!id.success) return failure("Ligne introuvable.");

  const { supabase } = await getUserContext();
  const { error } = await supabase.from("treso_lines").delete().eq("id", id.data);
  if (error) return fromDbError(error);
  refresh();
  return success("Ligne supprimée. La tâche reste cochée.");
}

/** Après un export CSV importé à la main dans Trésorerie : les lignes listées passent en « envoyées » */
export async function markLinesSent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ids = formData.getAll("line_id").map((v) => uuid.safeParse(v));
  if (!ids.length || ids.some((r) => !r.success)) return failure("Aucune ligne à marquer.");

  const { supabase } = await getUserContext();
  const { error } = await supabase
    .from("treso_lines")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .in(
      "id",
      ids.map((r) => r.data!),
    )
    .eq("status", "pending");
  if (error) return fromDbError(error);
  refresh();
  return success("Lignes marquées comme envoyées.");
}

/** Remet une ligne envoyée dans la file d'attente (si elle n'est jamais arrivée dans Trésorerie) */
export async function resendLine(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = uuid.safeParse(formData.get("line_id"));
  if (!id.success) return failure("Ligne introuvable.");

  const { supabase } = await getUserContext();
  const { error } = await supabase.from("treso_lines").update({ status: "pending", sent_at: null }).eq("id", id.data);
  if (error) return fromDbError(error);
  refresh();
  return success("Ligne remise en attente d'envoi.");
}
