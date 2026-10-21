import "server-only";
import type { UserContext } from "@/lib/dal";
import type { TaskRow, TresoLineRow } from "@/lib/supabase/database.types";

type Supabase = UserContext["supabase"];

/** PostgREST renvoie au plus 1 000 lignes par requête : on pagine. */
const PAGE = 1000;

export async function loadTasks(supabase: Supabase): Promise<TaskRow[]> {
  const { data, error } = await supabase.from("tasks").select("*").order("created_at");
  if (error) throw new Error(`Lecture des tâches impossible : ${error.message}`);
  return data;
}

/** Coches entre deux jours inclus, sous forme d'un test « faite ce jour-là ? » */
export async function loadDoneLookup(supabase: Supabase, from: string, to: string) {
  const done = new Set<string>();
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from("completions")
      .select("task_id, day")
      .gte("day", from)
      .lte("day", to)
      .order("day")
      .order("task_id")
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error(`Lecture des coches impossible : ${error.message}`);
    data.forEach((c) => done.add(`${c.task_id}@${c.day}`));
    if (data.length < PAGE) break;
  }
  return (taskId: string, day: string) => done.has(`${taskId}@${day}`);
}

/** Lignes Trésorerie liées à des coches d'un jour (montant affiché sur la tâche cochée) */
export async function loadLinesForDay(supabase: Supabase, day: string) {
  const { data, error } = await supabase
    .from("treso_lines")
    .select("id, task_id, amount_cents, status, completion_id")
    .eq("day", day)
    .not("completion_id", "is", null);
  if (error) throw new Error(`Lecture des lignes impossible : ${error.message}`);
  return data as Pick<TresoLineRow, "id" | "task_id" | "amount_cents" | "status" | "completion_id">[];
}

export async function countPendingLines(supabase: Supabase) {
  const { count, error } = await supabase.from("treso_lines").select("id", { count: "exact", head: true }).eq("status", "pending");
  if (error) throw new Error(`Lecture des lignes impossible : ${error.message}`);
  return count ?? 0;
}
