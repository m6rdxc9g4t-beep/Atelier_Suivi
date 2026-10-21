"use server";

import { refresh } from "next/cache";
import { getUserContext } from "@/lib/dal";
import { failure, formToObject, fromDbError, fromZodError, success, type ActionState } from "@/lib/actions";
import { formatSignedCents, todayInTimezone } from "@/lib/format";
import { completeWithLineSchema, daySchema, uuid } from "@/lib/validation/schemas";
import { requiredText } from "@/lib/validation/common";

export type ToggleResult = {
  ok: boolean;
  message?: string;
  /** La tâche est liée à Trésorerie avec un montant à saisir : ouvrir la fenêtre de montant */
  needsAmount?: boolean;
  /** Une ligne Trésorerie vient d'être préparée : proposer « Annuler » */
  undoable?: boolean;
};

function checkDay(day: unknown): string | null {
  const parsed = daySchema.safeParse(day);
  if (!parsed.success) return null;
  return parsed.data;
}

/** Coche ou décoche une tâche pour un jour (pas dans le futur) */
export async function setTaskDone(taskId: string, dayValue: string, done: boolean): Promise<ToggleResult> {
  const id = uuid.safeParse(taskId);
  const day = checkDay(dayValue);
  if (!id.success || !day) return { ok: false, message: "Tâche introuvable." };
  if (day > todayInTimezone()) return { ok: false, message: "Tu pourras cocher cette tâche le jour venu." };

  const { supabase } = await getUserContext();

  if (!done) {
    const { data, error } = await supabase.rpc("uncomplete_task", { p_task_id: id.data, p_day: day });
    if (error) return { ok: false, message: fromDbError(error).message };
    refresh();
    if (data?.kept_sent_lines) return { ok: true, message: "Tâche décochée. La ligne déjà envoyée à Trésorerie est conservée." };
    if (data?.removed_lines) return { ok: true, message: "Tâche décochée, ligne Trésorerie retirée." };
    return { ok: true };
  }

  const { data: task, error: readError } = await supabase
    .from("tasks")
    .select("finance_enabled, finance_ask, finance_amount_cents, finance_kind")
    .eq("id", id.data)
    .maybeSingle();
  if (readError) return { ok: false, message: fromDbError(readError).message };
  if (!task) return { ok: false, message: "Tâche introuvable." };
  if (task.finance_enabled && (task.finance_ask || !task.finance_amount_cents)) {
    return { ok: false, needsAmount: true };
  }

  const { data, error } = await supabase.rpc("complete_task", {
    p_task_id: id.data,
    p_day: day,
    p_with_line: task.finance_enabled,
  });
  if (error) return { ok: false, message: fromDbError(error).message };
  refresh();
  if (data?.line_id && task.finance_amount_cents) {
    const amount = task.finance_kind === "recette" ? task.finance_amount_cents : -task.finance_amount_cents;
    return { ok: true, undoable: true, message: `Ligne prête pour Trésorerie : ${formatSignedCents(amount)}` };
  }
  return { ok: true };
}

/** Coche une tâche liée à Trésorerie avec le montant réel (fenêtre de montant) */
export async function completeWithAmount(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = completeWithLineSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const v = parsed.data;
  if (v.day > todayInTimezone()) return failure("Tu pourras cocher cette tâche le jour venu.");
  if (v.with_line && v.amount === null) {
    return { status: "error", message: "Indique un montant.", fieldErrors: { amount: ["Indique un montant supérieur à 0."] } };
  }

  const { supabase } = await getUserContext();
  const { data, error } = await supabase.rpc("complete_task", {
    p_task_id: v.task_id,
    p_day: v.day,
    p_with_line: v.with_line,
    p_amount_cents: v.amount,
    p_kind: v.kind,
    p_label: v.label,
    p_category: v.category,
    p_account: v.account,
  });
  if (error) return fromDbError(error);
  refresh();
  if (data?.line_id && v.amount) {
    return success(`Ligne prête pour Trésorerie : ${formatSignedCents(v.kind === "recette" ? v.amount : -v.amount)}`);
  }
  return success("Tâche cochée.");
}

const quickTitle = requiredText(120, "Le nom de la tâche");

/** Ajout rapide : une tâche ponctuelle, à faire jusqu'à ce qu'elle soit cochée */
export async function quickAddTask(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const title = quickTitle.safeParse(formData.get("title"));
  if (!title.success) return { status: "error", fieldErrors: { title: [title.error.issues[0]?.message ?? "Nom invalide."] } };

  const { supabase } = await getUserContext();
  const { error } = await supabase.from("tasks").insert({ title: title.data, recurrence: "once", starts_on: todayInTimezone() });
  if (error) return fromDbError(error);
  refresh();
  return success("Tâche ajoutée.");
}
