import type { TaskRow } from "@/lib/supabase/database.types";

/**
 * Règles de récurrence, sur des jours « AAAA-MM-JJ » (calculs en UTC : pas de piège
 * de changement d'heure). Fonctions pures, partagées par le serveur et les tests.
 */

export type Schedulable = Pick<
  TaskRow,
  "id" | "recurrence" | "due_on" | "weekdays" | "every_days" | "month_day" | "starts_on" | "ends_on" | "paused" | "done_on"
>;

const DAY_MS = 86_400_000;

function toUtc(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtc(ms: number) {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(day: string, n: number) {
  return fromUtc(toUtc(day) + n * DAY_MS);
}

/** Nombre de jours de a à b (positif si b est après a) */
export function diffDays(a: string, b: string) {
  return Math.round((toUtc(b) - toUtc(a)) / DAY_MS);
}

/** 1 = lundi … 7 = dimanche */
export function isoWeekday(day: string) {
  const d = new Date(toUtc(day)).getUTCDay();
  return d === 0 ? 7 : d;
}

export function daysInMonth(day: string) {
  const [y, m] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Les 7 jours qui se terminent à `end` (inclus), du plus ancien au plus récent */
export function weekEnding(end: string) {
  return Array.from({ length: 7 }, (_, i) => addDays(end, i - 6));
}

/** La tâche récurrente est-elle prévue ce jour-là ? (hors pause) */
export function isScheduled(task: Schedulable, day: string) {
  if (day < task.starts_on) return false;
  if (task.ends_on && day > task.ends_on) return false;
  switch (task.recurrence) {
    case "once":
      return task.due_on === day;
    case "daily":
      return true;
    case "weekdays":
      return (task.weekdays ?? []).includes(isoWeekday(day));
    case "interval": {
      const every = Math.max(1, task.every_days ?? 1);
      return diffDays(task.starts_on, day) % every === 0;
    }
    case "monthly":
      return Number(day.slice(8, 10)) === Math.min(task.month_day ?? 1, daysInMonth(day));
  }
}

export type DayItem<T extends Schedulable> = { task: T; done: boolean; overdue: boolean };

/**
 * Tâches à afficher pour un jour :
 * - une tâche faite ce jour-là apparaît toujours (même en pause) ;
 * - « une fois » sans date : à faire aujourd'hui jusqu'à ce qu'elle soit cochée ;
 * - « une fois » datée et pas faite : le jour prévu, puis aujourd'hui « en retard ».
 */
export function itemsForDay<T extends Schedulable>(tasks: T[], day: string, today: string, isDone: (taskId: string, day: string) => boolean): DayItem<T>[] {
  const items: DayItem<T>[] = [];
  for (const task of tasks) {
    const done = isDone(task.id, day);
    if (done) {
      items.push({ task, done, overdue: false });
      continue;
    }
    if (task.paused) continue;
    if (task.recurrence === "once") {
      if (task.done_on) continue;
      if (task.due_on) {
        if (task.due_on === day) items.push({ task, done, overdue: false });
        else if (day === today && task.due_on < today) items.push({ task, done, overdue: true });
      } else if (day === today) {
        items.push({ task, done, overdue: false });
      }
      continue;
    }
    if (isScheduled(task, day)) items.push({ task, done, overdue: false });
  }
  return items;
}

/** Série en cours : occurrences prévues cochées d'affilée (aujourd'hui compte s'il est déjà coché) */
export function currentStreak(task: Schedulable, today: string, isDone: (taskId: string, day: string) => boolean, limit = 400) {
  if (task.recurrence === "once") return 0;
  let day = isDone(task.id, today) ? today : addDays(today, -1);
  let n = 0;
  for (let i = 0; i < limit && day >= task.starts_on; i++, day = addDays(day, -1)) {
    if (!isScheduled(task, day)) continue;
    if (!isDone(task.id, day)) break;
    n++;
  }
  return n;
}

/** Taux de réalisation sur les `days` derniers jours (null si rien de prévu) */
export function completionRate(task: Schedulable, today: string, isDone: (taskId: string, day: string) => boolean, days = 30) {
  let due = 0;
  let done = 0;
  for (let i = 0; i < days; i++) {
    const day = addDays(today, -i);
    if (day < task.starts_on) break;
    if (!isScheduled(task, day)) continue;
    due++;
    if (isDone(task.id, day)) done++;
  }
  return due ? done / due : null;
}

const WEEKDAY_SHORT = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];
const MONTHS_SHORT = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export function shortDay(day: string) {
  return `${Number(day.slice(8, 10))} ${MONTHS_SHORT[Number(day.slice(5, 7)) - 1]}`;
}

/** « Chaque jour », « lun. mer. ven. », « Le 5 du mois · jusqu'au 10 nov. »… */
export function recurrenceLabel(task: Schedulable) {
  let label: string;
  switch (task.recurrence) {
    case "once":
      label = task.due_on ? `Le ${shortDay(task.due_on)}` : "Une fois";
      break;
    case "daily":
      label = "Chaque jour";
      break;
    case "weekdays": {
      const days = [...(task.weekdays ?? [])].sort((a, b) => a - b);
      const key = days.join(",");
      label =
        key === "1,2,3,4,5" ? "En semaine" : key === "6,7" ? "Le week-end" : days.length === 7 ? "Chaque jour" : days.map((d) => WEEKDAY_SHORT[d - 1]).join(" ");
      break;
    }
    case "interval":
      label = (task.every_days ?? 1) > 1 ? `Tous les ${task.every_days} jours` : "Chaque jour";
      break;
    case "monthly":
      label = `Le ${task.month_day === 1 ? "1er" : task.month_day} du mois`;
      break;
  }
  if (task.ends_on && task.recurrence !== "once") label += ` · jusqu'au ${shortDay(task.ends_on)}`;
  return label;
}
