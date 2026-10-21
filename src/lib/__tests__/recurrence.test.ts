import { describe, expect, it } from "vitest";
import {
  addDays,
  completionRate,
  currentStreak,
  diffDays,
  isScheduled,
  isoWeekday,
  itemsForDay,
  recurrenceLabel,
  weekEnding,
  type Schedulable,
} from "@/lib/recurrence";

const base: Schedulable = {
  id: "t",
  recurrence: "daily",
  due_on: null,
  weekdays: null,
  every_days: null,
  month_day: null,
  starts_on: "2026-10-01",
  ends_on: null,
  paused: false,
  done_on: null,
};
const task = (patch: Partial<Schedulable>): Schedulable => ({ ...base, ...patch });
const doneSet = (pairs: string[]) => (id: string, day: string) => pairs.includes(`${id}@${day}`);
const never = () => false;

describe("calendrier", () => {
  it("ajoute des jours en traversant le changement d'heure et les mois", () => {
    expect(addDays("2026-10-24", 2)).toBe("2026-10-26");
    expect(addDays("2026-03-31", 1)).toBe("2026-04-01");
    expect(diffDays("2026-10-01", "2026-10-31")).toBe(30);
  });
  it("numérote les jours du lundi (1) au dimanche (7)", () => {
    expect(isoWeekday("2026-10-19")).toBe(1);
    expect(isoWeekday("2026-10-21")).toBe(3);
    expect(isoWeekday("2026-10-25")).toBe(7);
  });
  it("donne les 7 derniers jours", () => {
    expect(weekEnding("2026-10-21")).toEqual(["2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18", "2026-10-19", "2026-10-20", "2026-10-21"]);
  });
});

describe("isScheduled", () => {
  it("respecte le début et la fin (cure)", () => {
    const cure = task({ starts_on: "2026-10-10", ends_on: "2026-10-20" });
    expect(isScheduled(cure, "2026-10-09")).toBe(false);
    expect(isScheduled(cure, "2026-10-15")).toBe(true);
    expect(isScheduled(cure, "2026-10-21")).toBe(false);
  });
  it("certains jours de la semaine", () => {
    const sport = task({ recurrence: "weekdays", weekdays: [1, 3, 5] });
    expect(isScheduled(sport, "2026-10-21")).toBe(true);
    expect(isScheduled(sport, "2026-10-22")).toBe(false);
  });
  it("tous les N jours depuis le début", () => {
    const plantes = task({ recurrence: "interval", every_days: 3, starts_on: "2026-10-21" });
    expect(isScheduled(plantes, "2026-10-21")).toBe(true);
    expect(isScheduled(plantes, "2026-10-23")).toBe(false);
    expect(isScheduled(plantes, "2026-10-24")).toBe(true);
  });
  it("chaque mois, le 31 tombe le dernier jour des mois courts", () => {
    const loyer = task({ recurrence: "monthly", month_day: 31 });
    expect(isScheduled(loyer, "2026-11-30")).toBe(true);
    expect(isScheduled(loyer, "2026-10-31")).toBe(true);
    expect(isScheduled(loyer, "2026-10-30")).toBe(false);
    expect(isScheduled(task({ recurrence: "monthly", month_day: 29 }), "2027-02-28")).toBe(true);
  });
});

describe("itemsForDay", () => {
  const today = "2026-10-21";
  it("une tâche ponctuelle sans date reste à faire aujourd'hui", () => {
    const t = task({ id: "a", recurrence: "once" });
    expect(itemsForDay([t], today, today, never)).toHaveLength(1);
    expect(itemsForDay([t], "2026-10-20", today, never)).toHaveLength(0);
  });
  it("une tâche datée non faite revient aujourd'hui en retard", () => {
    const t = task({ id: "a", recurrence: "once", due_on: "2026-10-18" });
    const [item] = itemsForDay([t], today, today, never);
    expect(item.overdue).toBe(true);
  });
  it("une tâche faite reste visible le jour où elle a été cochée, même en pause", () => {
    const t = task({ id: "a", recurrence: "once", done_on: "2026-10-20", paused: true });
    const isDone = doneSet(["a@2026-10-20"]);
    expect(itemsForDay([t], "2026-10-20", today, isDone)[0].done).toBe(true);
    expect(itemsForDay([t], today, today, isDone)).toHaveLength(0);
  });
  it("une tâche en pause disparaît", () => {
    expect(itemsForDay([task({ paused: true })], today, today, never)).toHaveLength(0);
  });
});

describe("séries et taux", () => {
  const sport = task({ id: "s", recurrence: "weekdays", weekdays: [1, 3, 5] });
  it("compte les occurrences prévues cochées d'affilée", () => {
    const isDone = doneSet(["s@2026-10-21", "s@2026-10-19", "s@2026-10-16"]);
    expect(currentStreak(sport, "2026-10-21", isDone)).toBe(3);
  });
  it("aujourd'hui pas encore coché ne casse pas la série", () => {
    const isDone = doneSet(["s@2026-10-19", "s@2026-10-16"]);
    expect(currentStreak(sport, "2026-10-21", isDone)).toBe(2);
  });
  it("taux sur les jours prévus seulement", () => {
    const isDone = doneSet(["s@2026-10-21", "s@2026-10-19"]);
    expect(completionRate(sport, "2026-10-21", isDone, 7)).toBe(2 / 3);
    expect(completionRate(task({ recurrence: "weekdays", weekdays: [6], starts_on: "2026-10-21" }), "2026-10-21", never, 7)).toBeNull();
  });
});

describe("recurrenceLabel", () => {
  it("décrit la fréquence en français", () => {
    expect(recurrenceLabel(task({ recurrence: "weekdays", weekdays: [5, 1, 3] }))).toBe("lun. mer. ven.");
    expect(recurrenceLabel(task({ recurrence: "weekdays", weekdays: [1, 2, 3, 4, 5] }))).toBe("En semaine");
    expect(recurrenceLabel(task({ recurrence: "monthly", month_day: 1 }))).toBe("Le 1er du mois");
    expect(recurrenceLabel(task({ ends_on: "2026-11-10" }))).toBe("Chaque jour · jusqu'au 10 nov.");
    expect(recurrenceLabel(task({ recurrence: "once", due_on: "2026-10-21" }))).toBe("Le 21 oct.");
  });
});
