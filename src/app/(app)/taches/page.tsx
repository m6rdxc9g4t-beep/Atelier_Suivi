import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, ListChecks } from "lucide-react";
import { Disclosure } from "@/components/ui/disclosure";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ListSkeleton } from "@/components/ui/skeleton";
import { getUserContext } from "@/lib/dal";
import { formatSignedCents, todayInTimezone } from "@/lib/format";
import { CATEGORIES, categoryOf, momentOf } from "@/lib/meta";
import { loadTasks } from "@/lib/queries";
import { recurrenceLabel, shortDay } from "@/lib/recurrence";
import type { TaskRow } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { createTask } from "./actions";
import { TaskForm } from "./task-form";

export const metadata: Metadata = { title: "Tâches et rappels" };

const ORDER: Record<TaskRow["recurrence"], number> = { daily: 0, weekdays: 1, interval: 2, monthly: 3, once: 4 };

export default function TasksPage({ searchParams }: PageProps<"/taches">) {
  return (
    <>
      <PageHeader
        eyebrow="Toutes tes tâches"
        title="Tâches et rappels"
        intro="Ponctuelles ou récurrentes. Lie une tâche à Trésorerie : en la cochant, une ligne de dépense est préparée."
      />
      <Suspense fallback={<ListSkeleton rows={3} />}>
        {searchParams.then(({ nouvelle, categorie }) => (
          <TasksContent openForm={nouvelle === "1"} filter={typeof categorie === "string" ? categorie : "toutes"} />
        ))}
      </Suspense>
    </>
  );
}

async function TasksContent({ openForm, filter }: { openForm: boolean; filter: string }) {
  const { supabase } = await getUserContext();
  const tasks = await loadTasks(supabase);
  const today = todayInTimezone();

  const visible = tasks
    .filter((t) => filter === "toutes" || (filter === "tresorerie" ? t.finance_enabled : t.category === filter))
    .sort(
      (a, b) =>
        Number(a.paused) - Number(b.paused) ||
        (a.done_on ? 9 : ORDER[a.recurrence]) - (b.done_on ? 9 : ORDER[b.recurrence]) ||
        a.title.localeCompare(b.title, "fr"),
    );

  const filters = [
    { value: "toutes", label: `Toutes · ${tasks.length}`, color: null },
    ...CATEGORIES.filter((c) => tasks.some((t) => t.category === c.value)).map((c) => ({ value: c.value, label: c.label, color: c.color })),
    ...(tasks.some((t) => t.finance_enabled) ? [{ value: "tresorerie", label: "Liées à Trésorerie", color: null }] : []),
  ];

  return (
    <>
      <Disclosure label="Nouvelle tâche" defaultOpen={openForm || tasks.length === 0}>
        <TaskForm action={createTask} today={today} />
      </Disclosure>

      {tasks.length === 0 ? (
        <EmptyState icon={ListChecks} title="Aucune tâche pour l'instant">
          Commence par un rappel : ta séance de sport, ta cure, le ménage du samedi.
        </EmptyState>
      ) : (
        <>
          <nav aria-label="Filtrer les tâches" className="mb-4 flex flex-wrap gap-2">
            {filters.map((f) => (
              <Link
                key={f.value}
                href={f.value === "toutes" ? "/taches" : `/taches?categorie=${f.value}`}
                aria-current={filter === f.value ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors",
                  filter === f.value ? "border-edge bg-accent-soft text-accent-strong neon-panel" : "border-edge-soft bg-surface text-ink-soft hover:text-ink",
                )}
              >
                {f.color && <span className="size-2 rounded-full" style={{ background: f.color }} aria-hidden />}
                {f.label}
              </Link>
            ))}
          </nav>

          {visible.length ? (
            <ul className="neon-panel divide-y divide-line rounded-[1.5rem] border border-edge bg-surface">
              {visible.map((t) => (
                <TaskRowItem key={t.id} task={t} />
              ))}
            </ul>
          ) : (
            <EmptyState icon={ListChecks} title="Aucune tâche dans ce filtre" />
          )}
        </>
      )}
    </>
  );
}

function TaskRowItem({ task }: { task: TaskRow }) {
  const category = categoryOf(task.category);
  const amount = task.finance_amount_cents ? (task.finance_kind === "recette" ? task.finance_amount_cents : -task.finance_amount_cents) : null;
  return (
    <li>
      <Link href={`/taches/${task.id}`} className="flex min-h-16 items-center gap-3 rounded-[1.5rem] px-4 py-3 transition-colors hover:bg-accent-faint">
        <span className="size-3 shrink-0 rounded-[4px]" style={{ background: category.color }} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className={cn("block font-semibold break-words text-ink", task.paused && "text-ink-soft")}>{task.title}</span>
          <span className="mt-0.5 flex flex-wrap gap-x-3 text-[0.8rem] text-ink-soft">
            <span>{recurrenceLabel(task)}</span>
            <span>{momentOf(task.moment).label}</span>
            {task.paused && <span className="eyebrow text-[0.65rem]">En pause</span>}
            {task.done_on && <span>Faite le {shortDay(task.done_on)}</span>}
          </span>
        </span>
        {task.finance_enabled && (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-treso-soft px-2.5 py-1 font-mono text-[0.8rem] font-semibold text-treso">
            <ArrowRight className="size-3.5" aria-hidden />
            {task.finance_ask || amount === null ? "Trésorerie" : formatSignedCents(amount)}
          </span>
        )}
      </Link>
    </li>
  );
}
