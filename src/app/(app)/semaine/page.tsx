import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarDays, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, SectionTitle } from "@/components/ui/panel";
import { ListSkeleton } from "@/components/ui/skeleton";
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
    <Suspense fallback={<ListSkeleton rows={3} />}>
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
          <nav aria-label="Changer de semaine" className="flex items-center gap-2">
            <Link
              href={`/semaine?fin=${addDays(end, -7)}`}
              aria-label="Semaine précédente"
              className="grid size-11 place-items-center rounded-full border border-edge-soft bg-surface text-ink-soft hover:border-accent hover:text-accent-strong"
            >
              <ChevronLeft className="size-5" aria-hidden />
            </Link>
            {!isCurrent && (
              <Link href="/semaine" className={buttonClasses("soft")}>
                Cette semaine
              </Link>
            )}
            {!isCurrent && (
              <Link
                href={addDays(end, 7) >= today ? "/semaine" : `/semaine?fin=${addDays(end, 7)}`}
                aria-label="Semaine suivante"
                className="grid size-11 place-items-center rounded-full border border-edge-soft bg-surface text-ink-soft hover:border-accent hover:text-accent-strong"
              >
                <ChevronRight className="size-5" aria-hidden />
              </Link>
            )}
          </nav>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Stat label="Réalisation" value={rate === null ? "–" : `${rate} %`} detail={`${plural(doneSum, "faite")} sur ${plural(dueSum, "prévue")}`} />
        <Stat label="Meilleure série en cours" value={best ? String(best.streak) : "–"} detail={best ? best.title : "Coche une tâche récurrente deux fois de suite"} />
        <Stat label="Vers Trésorerie" value={amountSum ? formatSignedCents(amountSum) : "–"} detail="Lignes préparées sur ces 7 jours" treso />
      </div>

      <Panel className="mb-5">
        <SectionTitle>Tâches faites par jour</SectionTitle>
        <div className="grid h-40 grid-cols-7 items-end gap-2 sm:gap-3" role="img" aria-label="Part des tâches faites chaque jour">
          {perDay.map((d) => {
            const ratio = d.due ? d.done / d.due : 0;
            return (
              <div key={d.day} className="flex h-full flex-col items-center gap-1.5">
                <span className="font-mono text-xs text-ink-soft tabular-nums">{d.due ? `${Math.round(ratio * 100)}%` : "–"}</span>
                <div className="flex w-full flex-1 items-end justify-center">
                  <div
                    className={cn(
                      "w-full max-w-9 rounded-t-lg rounded-b-sm",
                      !d.done ? "bg-accent-soft" : ratio < 1 ? "bg-[var(--atelier-chart-2)]" : "glow-accent bg-accent",
                    )}
                    style={{ height: `${d.due ? Math.max(4, Math.round(ratio * 100)) : 3}%` }}
                  />
                </div>
                <span className={cn("font-mono text-xs capitalize", d.day === today ? "font-semibold text-accent-strong" : "text-ink-soft")}>
                  {formatWeekdayShort(d.day)} {Number(d.day.slice(8))}
                </span>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel className="p-0 sm:p-0">
        <div className="px-5 pt-5 sm:px-6">
          <SectionTitle count={habits.length}>Habitudes</SectionTitle>
        </div>
        {habits.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th scope="col" className="eyebrow px-5 py-2 text-left font-semibold text-ink-soft sm:px-6">
                      Tâche
                    </th>
                    {days.map((d) => (
                      <th key={d} scope="col" className={cn("px-1 py-2 text-center font-mono text-xs font-semibold", d === today ? "text-accent-strong" : "text-ink-soft")}>
                        {LETTERS[isoWeekday(d) - 1]}
                        <br />
                        {Number(d.slice(8))}
                      </th>
                    ))}
                    <th scope="col" className="eyebrow px-5 py-2 text-right font-semibold text-ink-soft sm:px-6">
                      30 j
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {habits.map((t) => {
                    const rate30 = completionRate(t, today, isDone, 30);
                    return (
                      <tr key={t.id}>
                        <th scope="row" className="px-5 py-2.5 text-left font-normal sm:px-6">
                          <Link href={`/taches/${t.id}`} className="font-semibold text-ink hover:text-accent-strong">
                            {t.title}
                          </Link>
                          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-soft">
                            <span className="size-2 rounded-full" style={{ background: categoryOf(t.category).color }} aria-hidden />
                            {recurrenceLabel(t)}
                          </span>
                        </th>
                        {days.map((d) => (
                          <td key={d} className="px-1 py-2.5 text-center">
                            <Cell state={cell(t.id, !t.paused && isScheduled(t, d), d)} day={d} />
                          </td>
                        ))}
                        <td className="px-5 py-2.5 text-right font-mono text-sm font-semibold text-accent-strong tabular-nums sm:px-6">
                          {rate30 === null ? "–" : `${Math.round(rate30 * 100)}%`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 border-t border-line px-5 py-3 text-xs text-ink-soft sm:px-6" aria-label="Légende">
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
          <div className="p-5 sm:p-6">
            <EmptyState icon={CalendarDays} title="Aucune tâche récurrente sur ces 7 jours">
              <Link href="/taches?nouvelle=1" className="font-semibold text-accent-strong underline-offset-4 hover:underline">
                Créer un rappel récurrent
              </Link>
            </EmptyState>
          </div>
        )}
      </Panel>
    </>
  );
}

function Stat({ label, value, detail, treso }: { label: string; value: string; detail: string; treso?: boolean }) {
  return (
    <div className="neon-panel rounded-[1.5rem] border border-edge bg-surface px-5 py-4">
      <p className="eyebrow text-ink-soft">{label}</p>
      <p className={cn("mt-1 font-display text-3xl font-extrabold break-words", treso ? "font-mono text-2xl text-treso" : "neon-title text-accent-strong")}>{value}</p>
      <p className="mt-0.5 text-sm break-words text-ink-soft">{detail}</p>
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
        small ? "size-4.5 rounded-md" : "size-7 rounded-[0.6rem]",
        state === "done" && "glow-accent bg-accent text-accent-ink",
        state === "missed" && "border-[1.5px] border-edge-soft bg-[repeating-linear-gradient(135deg,transparent_0_5px,var(--line)_5px_6px)]",
        state === "todo" && "border-[1.5px] border-dashed border-accent",
        state === "planned" && "border-[1.5px] border-edge-soft",
      )}
    >
      {state === "done" && <Check className={small ? "size-3" : "size-4"} strokeWidth={3} aria-hidden />}
      {state === "none" && <span className="size-1 rounded-full bg-ink-soft/50" aria-hidden />}
    </span>
  );
}
