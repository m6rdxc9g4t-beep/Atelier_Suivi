import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarDays, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { buttonClasses, iconButtonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { GroupHeader } from "@/components/ui/panel";
import { PageSkeleton } from "@/components/ui/skeleton";
import { getUserContext } from "@/lib/dal";
import { formatSignedCents, formatWeekdayShort, plural, todayInTimezone } from "@/lib/format";
import { categoryOf } from "@/lib/meta";
import { loadDoneLookup, loadTasks } from "@/lib/queries";
import { addDays, completionRate, currentStreak, isScheduled, isoWeekday, itemsForDay, recurrenceLabel, shortDay, weekEnding } from "@/lib/recurrence";
import { daySchema } from "@/lib/validation/schemas";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Semaine" };

const HISTORY_DAYS = 120;
const LETTERS = ["L", "M", "M", "J", "V", "S", "D"];

export default function WeekPage({ searchParams }: PageProps<"/semaine">) {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      {searchParams.then(({ fin }) => (
        <WeekContent requested={typeof fin === "string" ? fin : undefined} />
      ))}
    </Suspense>
  );
}

type CellState = "done" | "missed" | "todo" | "planned" | "none";

async function WeekContent({ requested }: { requested?: string }) {
  const today = todayInTimezone();
  const parsed = daySchema.safeParse(requested);
  const end = parsed.success && parsed.data < today ? parsed.data : today;
  const days = weekEnding(end);

  const { supabase } = await getUserContext();
  const [tasks, isDone, { data: lines, error }] = await Promise.all([
    loadTasks(supabase),
    loadDoneLookup(supabase, addDays(end, -HISTORY_DAYS), today),
    supabase.from("treso_lines").select("amount_cents").gte("day", days[0]).lte("day", end),
  ]);
  if (error) throw new Error(error.message);

  const perDay = days.map((day) => {
    const items = itemsForDay(tasks, day, today, isDone);
    return { day, due: items.length, done: items.filter((i) => i.done).length };
  });
  const dueSum = perDay.reduce((a, d) => a + d.due, 0);
  const doneSum = perDay.reduce((a, d) => a + d.done, 0);
  const rate = dueSum ? Math.round((doneSum / dueSum) * 100) : null;
  const amountSum = lines.reduce((a, l) => a + l.amount_cents, 0);

  let best: { title: string; streak: number } | null = null;
  for (const t of tasks) {
    const streak = currentStreak(t, today, isDone, HISTORY_DAYS);
    if (streak > 1 && (!best || streak > best.streak)) best = { title: t.title, streak };
  }

  const habits = tasks.filter((t) => t.recurrence !== "once" && days.some((d) => isDone(t.id, d) || (!t.paused && isScheduled(t, d))));

  const cell = (taskId: string, scheduled: boolean, day: string): CellState => {
    if (isDone(taskId, day)) return "done";
    if (!scheduled) return "none";
    if (day < today) return "missed";
    if (day === today) return "todo";
    return "planned";
  };
  const isCurrent = end === today;

  return (
    <>
      <PageHeader
        eyebrow="Suivi sur 7 jours"
        title={`Du ${shortDay(days[0])} au ${shortDay(end)}`}
        action={
          <nav aria-label="Changer de semaine" className="-mr-2 flex items-center gap-0.5 lg:-mr-1.5">
            {!isCurrent && (
              <Link href="/semaine" className={buttonClasses("soft", "sm", "mr-1")}>
                Cette semaine
              </Link>
            )}
            <Link href={`/semaine?fin=${addDays(end, -7)}`} aria-label="Semaine précédente" className={iconButtonClasses()}>
              <ChevronLeft className="size-4" aria-hidden />
            </Link>
            {!isCurrent && (
              <Link
                href={addDays(end, 7) >= today ? "/semaine" : `/semaine?fin=${addDays(end, 7)}`}
                aria-label="Semaine suivante"
                className={iconButtonClasses()}
              >
                <ChevronRight className="size-4" aria-hidden />
              </Link>
            )}
          </nav>
        }
      />

      <dl className="grid grid-cols-1 divide-y divide-line border-b border-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Stat label="Réalisation" value={rate === null ? "–" : `${rate} %`} detail={`${plural(doneSum, "faite")} sur ${plural(dueSum, "prévue")}`} />
        <Stat label="Meilleure série en cours" value={best ? String(best.streak) : "–"} detail={best ? best.title : "Coche une tâche récurrente deux fois de suite"} />
        <Stat label="Vers Trésorerie" value={amountSum ? formatSignedCents(amountSum) : "–"} detail="Lignes préparées sur ces 7 jours" treso={amountSum !== 0} />
      </dl>

      <section aria-labelledby="par-jour">
        <GroupHeader id="par-jour" title="Tâches faites par jour" />
        <div className="grid h-44 grid-cols-7 items-end gap-1 px-4 pt-4 pb-3 sm:gap-4 sm:px-5 lg:max-w-3xl" role="img" aria-label="Part des tâches faites chaque jour">
          {perDay.map((d) => {
            const ratio = d.due ? d.done / d.due : 0;
            return (
              <div key={d.day} className="flex h-full flex-col items-center gap-1.5">
                <span className="text-meta font-medium text-muted tabular-nums">{d.due ? `${Math.round(ratio * 100)} %` : "–"}</span>
                <div className="flex w-full flex-1 items-end justify-center border-b border-line">
                  <div
                    className={cn(
                      "w-full max-w-8 rounded-t-xs",
                      !d.done ? "bg-accent-soft" : ratio < 1 ? "bg-[var(--atelier-chart-2)]" : "bg-accent",
                    )}
                    style={{ height: `${d.due ? Math.max(4, Math.round(ratio * 100)) : 3}%` }}
                  />
                </div>
                <span className={cn("text-meta font-medium whitespace-nowrap capitalize tabular-nums", d.day === today ? "text-ink" : "text-muted")}>
                  {formatWeekdayShort(d.day)} {Number(d.day.slice(8))}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="habitudes">
        <GroupHeader id="habitudes" title="Habitudes" count={habits.length} />
        {habits.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[22rem] border-collapse sm:min-w-[34rem]">
                <thead>
                  <tr className="border-b border-line">
                    <th scope="col" className="py-2 pr-2 pl-4 text-left text-small font-medium text-muted sm:px-5">
                      Tâche
                    </th>
                    {days.map((d) => (
                      <th key={d} scope="col" className={cn("w-7 px-0.5 py-2 text-center text-meta leading-tight font-medium tabular-nums sm:w-10 sm:px-1", d === today ? "text-ink" : "text-muted")}>
                        {LETTERS[isoWeekday(d) - 1]}
                        <br />
                        {Number(d.slice(8))}
                      </th>
                    ))}
                    <th scope="col" className="py-2 pr-4 pl-2 text-right text-small font-medium text-muted sm:px-5">
                      30 j
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {habits.map((t) => {
                    const rate30 = completionRate(t, today, isDone, 30);
                    return (
                      <tr key={t.id} className="border-b border-line transition-colors hover:bg-sunken/60">
                        <th scope="row" className="py-2 pr-2 pl-4 text-left font-normal sm:px-5">
                          <Link href={`/taches/${t.id}`} className="text-small font-medium text-ink hover:underline sm:text-ui">
                            {t.title}
                          </Link>
                          <span className="mt-0.5 block text-small text-muted">
                            <span className="mr-1.5 inline-block size-2 rounded-full align-[0.05em]" style={{ background: categoryOf(t.category).color }} aria-hidden />
                            {recurrenceLabel(t)}
                          </span>
                        </th>
                        {days.map((d) => (
                          <td key={d} className="px-0.5 py-2 text-center sm:px-1">
                            <Cell state={cell(t.id, !t.paused && isScheduled(t, d), d)} day={d} />
                          </td>
                        ))}
                        <td className="py-2 pr-4 pl-2 text-right text-small font-medium whitespace-nowrap text-ink tabular-nums sm:px-5 sm:text-ui">
                          {rate30 === null ? "–" : `${Math.round(rate30 * 100)} %`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 px-5 py-3 text-small text-muted" aria-label="Légende">
              {(
                [
                  ["done", "Fait"],
                  ["missed", "Manqué"],
                  ["todo", "À faire aujourd'hui"],
                  ["planned", "Prévu"],
                  ["none", "Non prévu"],
                ] as const
              ).map(([state, label]) => (
                <li key={state} className="flex items-center gap-2">
                  <Cell state={state} small />
                  {label}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <EmptyState icon={CalendarDays} title="Aucune tâche récurrente sur ces 7 jours">
            <Link href="/taches?nouvelle=1" className="font-medium text-accent-strong underline-offset-4 hover:underline">
              Créer un rappel récurrent
            </Link>
          </EmptyState>
        )}
      </section>
    </>
  );
}

function Stat({ label, value, detail, treso }: { label: string; value: string; detail: string; treso?: boolean }) {
  // Téléphone : une ligne (libellé et détail à gauche, valeur à droite). Ordinateur : colonne.
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 px-5 py-2.5 sm:flex sm:flex-col sm:items-stretch sm:py-4">
      <dt className="text-small font-medium text-muted">{label}</dt>
      <dd className={cn("col-start-2 row-span-2 row-start-1 text-title font-semibold tabular-nums sm:mt-1 sm:text-page sm:tracking-[-0.012em]", treso ? "text-treso" : "text-ink")}>
        {value}
      </dd>
      <dd className="truncate text-small text-muted sm:mt-0.5">{detail}</dd>
    </div>
  );
}

const CELL_LABEL: Record<CellState, string> = {
  done: "fait",
  missed: "manqué",
  todo: "à faire aujourd'hui",
  planned: "prévu",
  none: "non prévu",
};

function Cell({ state, day, small }: { state: CellState; day?: string; small?: boolean }) {
  return (
    <span
      role="img"
      aria-label={day ? `${shortDay(day)} : ${CELL_LABEL[state]}` : CELL_LABEL[state]}
      className={cn(
        "inline-grid place-items-center",
        small ? "size-4 rounded-xs" : "size-6 rounded-sm",
        state === "done" && "bg-accent text-accent-ink",
        state === "missed" && "border border-edge-soft bg-[repeating-linear-gradient(135deg,transparent_0_4px,var(--line)_4px_5px)]",
        state === "todo" && "border-[1.5px] border-dashed border-accent-line",
        state === "planned" && "border border-edge-soft",
      )}
    >
      {state === "done" && <Check className={small ? "size-2.5" : "size-3.5"} strokeWidth={3} aria-hidden />}
      {state === "none" && <span className="size-1 rounded-full bg-faint/60" aria-hidden />}
    </span>
  );
}
