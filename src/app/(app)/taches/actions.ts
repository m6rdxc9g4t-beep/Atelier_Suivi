"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/dal";
import { failure, formToObject, fromDbError, fromZodError, success, type ActionState } from "@/lib/actions";
import { todayInTimezone } from "@/lib/format";
import type { TaskWritable } from "@/lib/supabase/database.types";
import { taskSchema, uuid, type TaskInput } from "@/lib/validation/schemas";

/** Formulaire validé → colonnes de la table (les champs sans objet pour la fréquence sont vidés) */
function toColumns(t: TaskInput): Omit<TaskWritable, "done_on"> {
  const recurring = t.recurrence !== "once";
  return {
    title: t.title,
    category: t.category,
    moment: t.moment,
    note: t.note,
    recurrence: t.recurrence,
    due_on: recurring ? null : t.due_on,
    weekdays: t.recurrence === "weekdays" ? [...new Set(t.weekdays)].sort((a, b) => a - b) : null,
    every_days: t.recurrence === "interval" ? t.every_days : null,
    month_day: t.recurrence === "monthly" ? t.month_day : null,
    starts_on: (recurring ? t.starts_on : null) ?? todayInTimezone(),
    ends_on: recurring ? t.ends_on : null,
    paused: t.paused,
    finance_enabled: t.finance_enabled,
    finance_ask: t.finance_enabled && t.finance_ask,
    finance_amount_cents: t.finance_enabled ? t.finance_amount : null,
    finance_kind: t.finance_kind,
    finance_label: t.finance_enabled ? t.finance_label : null,
    finance_category: t.finance_enabled ? t.finance_category : null,
    finance_account: t.finance_enabled ? t.finance_account : null,
  };
}

export async function createTask(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = taskSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const { supabase } = await getUserContext();
  const { error } = await supabase.from("tasks").insert(toColumns(parsed.data));
  if (error) return fromDbError(error);

  refresh();
  return success(`« ${parsed.data.title} » est ajoutée.`);
}

export async function updateTask(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = uuid.safeParse(formData.get("task_id"));
  if (!id.success) return failure("Tâche introuvable.");
  const parsed = taskSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const { supabase } = await getUserContext();
  const columns = toColumns(parsed.data);
  const { data, error } = await supabase
    .from("tasks")
    // Une tâche qui devient récurrente n'a plus de « faite le »
    .update(columns.recurrence === "once" ? columns : { ...columns, done_on: null })
    .eq("id", id.data)
    .select("id");
  if (error) return fromDbError(error);
  if (!data.length) return failure("Tâche introuvable.");

  refresh();
  return success("Modifications enregistrées.");
}

export async function deleteTask(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = uuid.safeParse(formData.get("task_id"));
  if (!id.success) return failure("Tâche introuvable.");

  const { supabase } = await getUserContext();
  const { error } = await supabase.from("tasks").delete().eq("id", id.data);
  if (error) return fromDbError(error);

  redirect("/taches");
}
