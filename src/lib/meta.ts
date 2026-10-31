import type { MoneyKind, RecurrenceKind, TaskCategory, TaskMoment } from "@/lib/supabase/database.types";

/** Catégories de tâches. Leurs couleurs portent un sens : elles ne prennent jamais la signature. */
export const CATEGORIES: { value: TaskCategory; label: string; color: string }[] = [
  { value: "sante", label: "Santé", color: "var(--cat-sante)" },
  { value: "sport", label: "Sport", color: "var(--cat-sport)" },
  { value: "maison", label: "Maison", color: "var(--cat-maison)" },
  { value: "achats", label: "Achats", color: "var(--cat-achats)" },
  { value: "bien_etre", label: "Bien-être", color: "var(--cat-bien-etre)" },
  { value: "autre", label: "Autre", color: "var(--cat-autre)" },
];

export const MOMENTS: { value: TaskMoment; label: string }[] = [
  { value: "matin", label: "Matin" },
  { value: "midi", label: "Midi" },
  { value: "apres_midi", label: "Après-midi" },
  { value: "soir", label: "Soir" },
  { value: "journee", label: "À tout moment" },
];

export const RECURRENCES: { value: RecurrenceKind; label: string }[] = [
  { value: "once", label: "Une fois" },
  { value: "daily", label: "Chaque jour" },
  { value: "weekdays", label: "Certains jours" },
  { value: "interval", label: "Tous les N jours" },
  { value: "monthly", label: "Chaque mois" },
];

export const MONEY_KINDS: { value: MoneyKind; label: string }[] = [
  { value: "depense", label: "Dépense" },
  { value: "recette", label: "Recette" },
];

export const WEEKDAYS = [
  { value: 1, short: "L", label: "lundi" },
  { value: 2, short: "M", label: "mardi" },
  { value: 3, short: "M", label: "mercredi" },
  { value: 4, short: "J", label: "jeudi" },
  { value: 5, short: "V", label: "vendredi" },
  { value: 6, short: "S", label: "samedi" },
  { value: 7, short: "D", label: "dimanche" },
];

/**
 * Catégories par défaut d'atelier_Trésorerie (database.DEFAULT_CATEGORIES) : la synchronisation
 * retrouve la catégorie par son nom exact, d'où ces libellés à l'identique.
 */
export const TRESORERIE_CATEGORIES = [
  "Santé",
  "Courses",
  "Logement",
  "Transport",
  "Énergie & Internet",
  "Restaurants",
  "Loisirs",
  "Abonnements",
  "Shopping",
  "Impôts & Taxes",
  "Divers",
  "Salaire",
  "Revenus annexes",
];

export const DEFAULT_ACCOUNT = "Compte courant";

export const categoryOf = (value: TaskCategory) => CATEGORIES.find((c) => c.value === value) ?? CATEGORIES[CATEGORIES.length - 1];
export const momentOf = (value: TaskMoment) => MOMENTS.find((m) => m.value === value) ?? MOMENTS[MOMENTS.length - 1];
