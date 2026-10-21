import { z } from "zod";

const empty = (v: unknown) => v === undefined || v === null || (typeof v === "string" && v.trim() === "");

/** Texte obligatoire, nettoyé */
export const requiredText = (max: number, label = "Ce champ") =>
  z
    .string({ error: `${label} est obligatoire.` })
    .trim()
    .min(1, `${label} est obligatoire.`)
    .max(max, `${max} caractères maximum.`);

/** Texte optionnel : chaîne vide → null */
export const optionalText = (max: number) =>
  z.preprocess(
    (v) => (empty(v) ? null : String(v).trim()),
    z.string().max(max, `${max} caractères maximum.`).nullable(),
  );

/** Montant positif optionnel, accepte la virgule décimale */
export const optionalAmount = z.preprocess(
  (v) => (empty(v) ? null : Number(String(v).replace(",", ".").replace(/\s/g, ""))),
  z.number({ error: "Montant invalide." }).nonnegative("Le montant doit être positif.").max(1_000_000).nullable(),
);

/** Montant strictement positif obligatoire */
export const requiredAmount = z.preprocess(
  (v) => (empty(v) ? undefined : Number(String(v).replace(",", ".").replace(/\s/g, ""))),
  z
    .number({ error: "Indique un montant." })
    .positive("Le montant doit être supérieur à 0.")
    .max(1_000_000, "Montant trop élevé.")
    .transform((n) => Math.round(n * 100) / 100),
);

/** Date AAAA-MM-JJ optionnelle */
export const optionalDate = z.preprocess(
  (v) => (empty(v) ? null : v),
  z.iso.date({ error: "Date invalide." }).nullable(),
);

/** Date AAAA-MM-JJ obligatoire */
export const requiredDate = z.iso.date({ error: "Indique une date." });

/** Horodatage ISO (converti côté navigateur depuis l'heure locale) */
export const optionalDateTime = z.preprocess(
  (v) => (empty(v) ? null : v),
  z.iso.datetime({ offset: true, error: "Date et heure invalides." }).nullable(),
);

export const requiredDateTime = z.iso.datetime({ offset: true, error: "Indique une date et une heure." });

export const uuid = z.uuid({ error: "Identifiant invalide." });

export const optionalCoordinate = (min: number, max: number) =>
  z.preprocess((v) => (empty(v) ? null : Number(v)), z.number().min(min).max(max).nullable());
