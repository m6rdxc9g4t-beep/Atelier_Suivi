import { APP_TIMEZONE } from "@/lib/env";

const LOCALE = "fr-FR";

/** Date du jour (AAAA-MM-JJ) dans le fuseau de l'app */
export function todayInTimezone(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIMEZONE }).format(now);
}

/** « mercredi 21 octobre » */
export function formatLongDay(day: string) {
  return new Intl.DateTimeFormat(LOCALE, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(`${day}T00:00:00Z`),
  );
}

/** « mer. » */
export function formatWeekdayShort(day: string) {
  return new Intl.DateTimeFormat(LOCALE, { weekday: "short", timeZone: "UTC" })
    .format(new Date(`${day}T00:00:00Z`))
    .replace(".", "");
}

/** « 21/10/2026 » */
export function formatFrenchDate(day: string) {
  const [y, m, d] = day.split("-");
  return `${d}/${m}/${y}`;
}

const EUR = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "EUR" });

/** 1250 → « 12,50 € » */
export function formatCents(cents: number) {
  return EUR.format(cents / 100);
}

/** −890 → « −8,90 € », 1500 → « +15,00 € » */
export function formatSignedCents(cents: number) {
  return `${cents < 0 ? "−" : "+"}${EUR.format(Math.abs(cents) / 100)}`;
}

/** 890 → « 8,90 » (valeur d'un champ de saisie) */
export function centsToInput(cents: number | null | undefined) {
  return cents ? (cents / 100).toFixed(2).replace(".", ",") : "";
}

export function plural(n: number, singular: string, pluralForm = `${singular}s`) {
  return `${new Intl.NumberFormat(LOCALE).format(n)} ${Math.abs(n) > 1 ? pluralForm : singular}`;
}

export function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
