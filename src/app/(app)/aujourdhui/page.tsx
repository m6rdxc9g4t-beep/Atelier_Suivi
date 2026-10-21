import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft, ChevronRight, Wallet } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ListSkeleton } from "@/components/ui/skeleton";
import { buttonClasses } from "@/components/ui/button";
import { getUserContext } from "@/lib/dal";
import { formatLongDay, plural, todayInTimezone } from "@/lib/format";
import { countPendingLines, loadDoneLookup, loadLinesForDay, loadTasks } from "@/lib/queries";
import { addDays, currentStreak, itemsForDay, recurrenceLabel } from "@/lib/recurrence";
import { daySchema } from "@/lib/validation/schemas";
import { DayList, type DayItemView } from "./day-list";
import { QuickAdd } from "./quick-add";

export const metadata: Metadata = { title: "Aujourd'hui" };

/** Profondeur d'historique lue pour calculer les séries en cours */
const HISTORY_DAYS = 120;

export default function TodayPage({ searchParams }: PageProps<"/aujourdhui">) {
  return (
    <Suspense fallback={<ListSkeleton rows={4} />}>
      {searchParams.then(({ jour }) => (
        <TodayContent requested={typeof jour === "string" ? jour : undefined} />
      ))}
    </Suspense>
  );
}

async function TodayContent({ requested }: { requested?: string }) {
  const today = todayInTimezone();
  const parsed = daySchema.safeParse(requested);
  const day = parsed.success ? parsed.data : today;

  const { supabase } = await getUserContext();
  const from = addDays(day < today ? day : today, -HISTORY_DAYS);
  const to = day > today ? day : today;
  const [tasks, isDone, lines, pending] = await Promise.all([
    loadTasks(supabase),
    loadDoneLookup(supabase, from, to),
    loadLinesForDay(supabase, day),
    countPendingLines(supabase),
  ]);

  const items: DayItemView[] = itemsForDay(tasks, day, today, isDone).map(({ task, done, overdue }) => {
    const line = done ? lines.find((l) => l.task_id === task.id) : undefined;
    return {
      id: task.id,
      title: task.title,
      category: task.category,
      moment: task.moment,
      note: task.note,
      recurrence: recurrenceLabel(task),
      done,
      overdue,
      dueOn: task.due_on,
      paused: task.paused,
      streak: day === today ? currentStreak(task, today, isDone, HISTORY_DAYS) : 0,
      finance: task.finance_enabled
        ? {
            ask: task.finance_ask || !task.finance_amount_cents,
            amountCents: task.finance_amount_cents,
            kind: task.finance_kind,
            label: task.finance_label ?? task.title,
            category: task.finance_category,
            account: task.finance_account,
          }
        : null,
      line: line ? { amountCents: line.amount_cents, sent: line.status === "sent" } : null,
    };
  });

  const doneCount = items.filter((i) => i.done).length;
  const total = items.length;
  const left = items.filter((i) => !i.done).map((i) => i.title);
  const isToday = day === today;
  const isFuture = day > today;

  const eyebrow = isToday
    ? "Aujourd'hui"
    : day === addDays(today, -1)
      ? "Hier"
      : day === addDays(today, 1)
        ? "Demain"
        : isFuture
          ? "À venir"
          : "Journée passée";

  let rest: string;
  if (!total) rest = "Aucune tâche prévue.";
  else if (isFuture) rest = "Journée à venir : tu pourras cocher le jour venu.";
  else if (!left.length) rest = "Tout est fait. Belle journée.";
  else rest = `Reste : ${left.slice(0, 3).join(", ")}${left.length > 3 ? ` et ${plural(left.length - 3, "autre")}` : ""}.`;

  const progress = total ? doneCount / total : 0;
  const circumference = 2 * Math.PI * 34;

  return (
    <>
      <PageHeader
        eyebrow={eyebrow}
        title={formatLongDay(day)}
        action={
          <nav aria-label="Changer de jour" className="flex items-center gap-2">
            <DayLink day={addDays(day, -1)} today={today} label="Jour précédent">
              <ChevronLeft className="size-5" aria-hidden />
            </DayLink>
            {!isToday && (
              <Link href="/aujourdhui" className={buttonClasses("soft", "md")}>
                Aujourd&apos;hui
              </Link>
            )}
            <DayLink day={addDays(day, 1)} today={today} label="Jour suivant">
              <ChevronRight className="size-5" aria-hidden />
            </DayLink>
          </nav>
        }
      />

      <section className="neon-panel mb-5 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-5 gap-y-4 rounded-[1.75rem] border border-edge bg-surface p-5 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
        <div className="relative size-21" role="img" aria-label={`${doneCount} tâches faites sur ${total}`}>
          <svg viewBox="0 0 84 84" className="size-21 -rotate-90" aria-hidden>
            <circle cx="42" cy="42" r="34" fill="none" strokeWidth="8" className="stroke-accent-soft" />
            <circle
              cx="42"
              cy="42"
              r="34"
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
              className="stroke-accent transition-[stroke-dashoffset] duration-500 [filter:drop-shadow(0_0_5px_var(--atelier-signature))]"
              strokeDasharray={circumference.toFixed(1)}
              strokeDashoffset={(circumference * (1 - progress)).toFixed(1)}
            />
          </svg>
          <span className="neon-title absolute inset-0 grid place-items-center font-mono text-[1.05rem] font-semibold text-accent-strong tabular-nums">
            {Math.round(progress * 100)}%
          </span>
        </div>
        <div className="min-w-0">
          <p className="font-display text-xl font-extrabold text-ink">
            {doneCount} sur {plural(total, "tâche")}
          </p>
          <p className="mt-0.5 text-sm text-ink-soft">{rest}</p>
        </div>
        {pending > 0 && (
          <Link
            href="/tresorerie"
            className="col-span-full inline-flex min-h-11 items-center gap-2 justify-self-start rounded-full border border-treso bg-treso-soft px-4 text-sm font-semibold text-treso sm:col-span-1"
          >
            <Wallet className="size-4" aria-hidden />
            {plural(pending, "ligne")} pour Trésorerie
          </Link>
        )}
      </section>

      {isToday && <QuickAdd />}

      <DayList items={items} day={day} isFuture={isFuture} />
    </>
  );
}

function DayLink({ day, today, label, children }: { day: string; today: string; label: string; children: React.ReactNode }) {
  return (
    <Link
      href={day === today ? "/aujourdhui" : `/aujourdhui?jour=${day}`}
      aria-label={label}
      className="grid size-11 place-items-center rounded-full border border-edge-soft bg-surface text-ink-soft transition-colors hover:border-accent hover:text-accent-strong"
    >
      {children}
    </Link>
  );
}
