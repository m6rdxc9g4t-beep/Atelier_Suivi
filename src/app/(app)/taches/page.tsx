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
          <nav aria-label="Filtrer les tâches" className="flex gap-1.5 overflow-x-auto border-b border-line px-5 py-2.5 [scrollbar-width:none] lg:flex-wrap">
            {filters.map((f) => (
              <Link
                key={f.value}
                href={f.value === "toutes" ? "/taches" : `/taches?categorie=${f.value}`}
                aria-current={filter === f.value ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-2 rounded-md border px-3 font-medium whitespace-nowrap transition-colors lg:h-[26px] lg:px-2 lg:text-small",
                  filter === f.value ? "border-edge-soft bg-selected text-ink" : "border-transparent text-muted hover:bg-sunken hover:text-ink",
                )}
              >
                {f.color && <span className="size-2 rounded-full" style={{ background: f.color }} aria-hidden />}
                <span className="tabular-nums">{f.label}</span>
              </Link>
            ))}
          </nav>

          {visible.length ? (
            <ul>
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
      <Link
        href={`/taches/${task.id}`}
        className={cn(
          "grid min-h-13 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 border-b border-line px-5 py-2 transition-colors hover:bg-sunken lg:min-h-10 lg:py-1.5",
          task.paused && "text-muted",
        )}
      >
        <span className="size-2 rounded-full" style={{ background: category.color }} aria-hidden />
        <span className="min-w-0 lg:flex lg:items-baseline lg:gap-3">
          <span className={cn("block font-medium break-words text-ink", task.paused && "text-muted")}>{task.title}</span>
          <span className="mt-0.5 flex flex-wrap gap-x-2.5 text-small text-muted lg:mt-0">
            <span>{recurrenceLabel(task)}</span>
            <span>{momentOf(task.moment).label}</span>
            {task.paused && <span className="rounded-xs border border-edge-soft px-1 text-meta">En pause</span>}
            {task.done_on && <span>Faite le {shortDay(task.done_on)}</span>}
          </span>
        </span>
        {task.finance_enabled ? (
          <span className="inline-flex h-6 items-center gap-1 rounded-sm bg-treso-soft px-1.5 text-small font-medium whitespace-nowrap text-treso tabular-nums">
            <ArrowRight className="size-3.5" aria-hidden />
            {task.finance_ask || amount === null ? "Trésorerie" : formatSignedCents(amount)}
          </span>
        ) : (
          <span aria-hidden />
        )}
      </Link>
    </li>
  );
}
