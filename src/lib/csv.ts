import type { TresoLineRow } from "@/lib/supabase/database.types";
import { formatFrenchDate } from "@/lib/format";

/**
 * Export des lignes pour l'import de relevés d'atelier_Trésorerie (services/importer.py) :
 * colonnes reconnues par leur nom (Date, Libellé, Montant, Catégorie), séparateur « ; »,
 * virgule décimale, montant négatif pour une dépense. Chaque ligne porte sa référence
 * Suivi dans les notes : l'empreinte d'import de Trésorerie évite les doublons.
 */
export type CsvLine = Pick<TresoLineRow, "id" | "day" | "label" | "amount_cents" | "category" | "account" | "task_title">;

const HEADER = ["Date", "Libellé", "Montant", "Catégorie", "Compte", "Notes"];

function cell(value: string) {
  return /[;"\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function centsToFrench(cents: number) {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, "0")}`;
}

export function tresorerieCsv(lines: CsvLine[]) {
  const rows = lines.map((l) =>
    [
      formatFrenchDate(l.day),
      l.label,
      centsToFrench(l.amount_cents),
      l.category ?? "",
      l.account ?? "",
      `atelier_Suivi${l.task_title ? ` · ${l.task_title}` : ""} [suivi:${l.id.slice(0, 8)}]`,
    ]
      .map(cell)
      .join(";"),
  );
  // BOM : Excel et Numbers ouvrent alors le fichier en UTF-8
  return `﻿${[HEADER.join(";"), ...rows].join("\r\n")}\r\n`;
}
