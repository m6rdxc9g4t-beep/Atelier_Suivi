import { z } from "zod";
import { optionalDate, optionalText, requiredDate, requiredText, uuid } from "./common";

const empty = (v: unknown) => v === undefined || v === null || (typeof v === "string" && v.trim() === "");
const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

/** « 8,90 » → 890 centimes (null si vide) */
export const optionalCents = z.preprocess(
  (v) => (empty(v) ? null : Number(String(v).replace(/\s/g, "").replace("€", "").replace(",", "."))),
  z
    .number({ error: "Montant invalide." })
    .positive("Le montant doit être supérieur à 0.")
    .max(999_999.99, "Montant trop élevé.")
    .transform((n) => Math.round(n * 100))
    .nullable(),
);

export const requiredCents = z.preprocess(
  (v) => (empty(v) ? undefined : Number(String(v).replace(/\s/g, "").replace("€", "").replace(",", "."))),
  z
    .number({ error: "Indique un montant." })
    .positive("Le montant doit être supérieur à 0.")
    .max(999_999.99, "Montant trop élevé.")
    .transform((n) => Math.round(n * 100)),
);

const smallInt = (min: number, max: number, message: string) =>
  z.preprocess((v) => (empty(v) ? null : Number(v)), z.number({ error: message }).int(message).min(min, message).max(max, message).nullable());

const weekdays = z.preprocess(
  (v) => (v === undefined ? [] : (Array.isArray(v) ? v : [v]).map(Number)),
  z.array(z.number().int().min(1).max(7)),
);

const category = z.enum(["sante", "sport", "maison", "achats", "bien_etre", "autre"], { error: "Choisis une catégorie." });
const moment = z.enum(["matin", "midi", "apres_midi", "soir", "journee"], { error: "Choisis un moment." });
const recurrence = z.enum(["once", "daily", "weekdays", "interval", "monthly"], { error: "Choisis une fréquence." });
const moneyKind = z.enum(["depense", "recette"], { error: "Dépense ou recette ?" });

/** Formulaire de tâche (création et modification) */
export const taskSchema = z
  .object({
    title: requiredText(120, "Le nom de la tâche"),
    category,
    moment,
    note: optionalText(300),
    recurrence,
    due_on: optionalDate,
    weekdays,
    every_days: smallInt(1, 365, "Entre 1 et 365 jours."),
    month_day: smallInt(1, 31, "Un jour entre 1 et 31."),
    starts_on: optionalDate,
    ends_on: optionalDate,
    paused: checkbox,
    finance_enabled: checkbox,
    finance_ask: checkbox,
    finance_amount: optionalCents,
    finance_kind: moneyKind,
    finance_label: optionalText(120),
    finance_category: optionalText(60),
    finance_account: optionalText(60),
  })
  .superRefine((t, ctx) => {
    if (t.recurrence === "weekdays" && t.weekdays.length === 0)
      ctx.addIssue({ code: "custom", path: ["weekdays"], message: "Choisis au moins un jour." });
    if (t.recurrence === "interval" && t.every_days === null)
      ctx.addIssue({ code: "custom", path: ["every_days"], message: "Indique tous les combien de jours." });
    if (t.recurrence === "monthly" && t.month_day === null)
      ctx.addIssue({ code: "custom", path: ["month_day"], message: "Indique le jour du mois." });
    if (t.recurrence !== "once" && t.starts_on && t.ends_on && t.ends_on < t.starts_on)
      ctx.addIssue({ code: "custom", path: ["ends_on"], message: "La fin doit suivre le début." });
    if (t.finance_enabled && !t.finance_ask && t.finance_amount === null)
      ctx.addIssue({ code: "custom", path: ["finance_amount"], message: "Indique un montant, ou coche « Demander le montant à chaque fois »." });
  });

export type TaskInput = z.infer<typeof taskSchema>;

/** Cocher une tâche liée à Trésorerie, avec le montant réel */
export const completeWithLineSchema = z.object({
  task_id: uuid,
  day: requiredDate,
  with_line: checkbox,
  amount: optionalCents,
  kind: moneyKind,
  label: optionalText(200),
  category: optionalText(60),
  account: optionalText(60),
});

/** Modifier une ligne Trésorerie en attente */
export const lineSchema = z.object({
  line_id: uuid,
  day: requiredDate,
  label: requiredText(200, "Le libellé"),
  amount: requiredCents,
  kind: moneyKind,
  category: optionalText(60),
  account: optionalText(60),
});

export const tokenSchema = z.object({ label: requiredText(60, "Le nom de l'appareil") });

export const profileSchema = z.object({ display_name: requiredText(60, "Ton prénom") });

const next = z.preprocess(
  (v) => (typeof v === "string" && v.startsWith("/") && !v.startsWith("//") ? v : undefined),
  z.string().optional(),
);

export const loginSchema = z.object({
  // espaces retirés avant validation (le clavier iPhone en ajoute souvent un)
  email: z.string({ error: "Indique ton adresse e-mail." }).trim().toLowerCase().pipe(z.email({ error: "Adresse e-mail invalide." })),
  next,
});

/** Code à 6 chiffres reçu par e-mail (remplace le lien sur iPhone : l'app installée et Safari ne partagent pas leurs cookies) */
export const codeLoginSchema = loginSchema.extend({
  code: z
    .string({ error: "Indique le code reçu par e-mail." })
    .transform((v) => v.replace(/\s/g, ""))
    .pipe(z.string().regex(/^\d{6,10}$/, "Le code reçu par e-mail fait 6 chiffres.")),
});

export const passwordLoginSchema = loginSchema.extend({
  password: z.string({ error: "Indique ton mot de passe." }).min(1, "Indique ton mot de passe.").max(200),
});

const newPassword = z.string({ error: "Choisis un mot de passe." }).min(8, "8 caractères minimum.").max(200, "200 caractères maximum.");

/** Changement de mot de passe depuis les Paramètres (comme Atelier Dates) */
export const passwordChangeSchema = z
  .object({
    password: newPassword,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], error: "Les deux mots de passe ne correspondent pas." });

/** Création de compte : e-mail + mot de passe choisi (et confirmé), comme Atelier Dates */
export const signUpSchema = loginSchema
  .extend({
    password: newPassword,
    confirm: z.string({ error: "Confirme ton mot de passe." }),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], error: "Les deux mots de passe ne correspondent pas." });

export const daySchema = requiredDate;
export { uuid };
