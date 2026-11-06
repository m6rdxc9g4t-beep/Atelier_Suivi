import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft, ChevronRight, Wallet } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/skeleton";
import { buttonClasses, iconButtonClasses } from "@/components/ui/button";
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
    <Suspense fallback={<PageSkeleton rows={4} />}>
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
  const circumference = 2 * Math.PI * 7;

  return (
    <>
      <PageHeader
        eyebrow={eyebrow}
        title={formatLongDay(day)}
        action={
          <nav aria-label="Changer de jour" className="-mr-2 flex items-center gap-0.5 lg:-mr-1.5">
            {!isToday && (
              <Link href="/aujourdhui" className={buttonClasses("soft", "sm", "mr-1")}>
                Aujourd&apos;hui
              </Link>
            )}
            <DayLink day={addDays(day, -1)} today={today} label="Jour précédent">
              <ChevronLeft className="size-4" aria-hidden />
            </DayLink>
            <DayLink day={addDays(day, 1)} today={today} label="Jour suivant">
              <ChevronRight className="size-4" aria-hidden />
            </DayLink>
          </nav>
        }
      />

      <section aria-label="Avancement du jour" className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-5 py-3">
        <div className="flex min-w-0 flex-[1_1_18rem] items-start gap-3">
          <svg viewBox="0 0 18 18" className="mt-px size-[18px] shrink-0 -rotate-90" role="img" aria-label={`${doneCount} tâches faites sur ${total}`}>
            <circle cx="9" cy="9" r="7" fill="none" strokeWidth="2.25" className="stroke-edge-soft" />
            <circle
              cx="9"
              cy="9"
              r="7"
              fill="none"
              strokeWidth="2.25"
              strokeLinecap="round"
              className="stroke-accent transition-[stroke-dashoffset] duration-500 ease-out"
              strokeDasharray={circumference.toFixed(2)}
              strokeDashoffset={(circumference * (1 - progress)).toFixed(2)}
            />
          </svg>
          <p className="min-w-0">
            <span className="font-semibold text-ink tabular-nums">
              {doneCount} sur {plural(total, "tâche")}
            </span>
            <span className="ml-2 text-faint tabular-nums">{Math.round(progress * 100)} %</span>
            <span className="mt-0.5 block text-muted lg:mt-0 lg:ml-3 lg:inline">{rest}</span>
          </p>
        </div>
        {pending > 0 && (
          <Link
            href="/tresorerie"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-treso/35 px-2.5 font-medium text-treso tabular-nums transition-colors hover:bg-treso-soft lg:h-[26px] lg:px-2 lg:text-small"
          >
            <Wallet className="size-4 lg:size-3.5" aria-hidden />
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
      className={iconButtonClasses()}
    >
      {children}
    </Link>
  );
}
