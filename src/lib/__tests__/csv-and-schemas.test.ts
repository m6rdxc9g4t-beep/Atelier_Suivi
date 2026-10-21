import { describe, expect, it } from "vitest";
import { centsToFrench, tresorerieCsv } from "@/lib/csv";
import { formatSignedCents } from "@/lib/format";
import { completeWithLineSchema, taskSchema } from "@/lib/validation/schemas";

describe("export CSV pour Trésorerie", () => {
  const csv = tresorerieCsv([
    { id: "0f4c2a9e-0000-0000-0000-000000000000", day: "2026-10-21", label: "Pharmacie ; sirop", amount_cents: -890, category: "Santé", account: "Compte courant", task_title: "Pharmacie" },
    { id: "1a2b3c4d-0000-0000-0000-000000000000", day: "2026-10-05", label: "Remboursement", amount_cents: 1500, category: null, account: null, task_title: null },
  ]);
  const lines = csv.replace("﻿", "").trim().split("\r\n");

  it("a les colonnes reconnues par l'import de Trésorerie", () => {
    expect(lines[0]).toBe("Date;Libellé;Montant;Catégorie;Compte;Notes");
  });
  it("date française, virgule décimale, signe, échappement", () => {
    expect(lines[1]).toBe('21/10/2026;"Pharmacie ; sirop";-8,90;Santé;Compte courant;atelier_Suivi · Pharmacie [suivi:0f4c2a9e]');
    expect(lines[2]).toBe("05/10/2026;Remboursement;15,00;;;atelier_Suivi [suivi:1a2b3c4d]");
  });
  it("convertit les centimes", () => {
    expect(centsToFrench(-5)).toBe("-0,05");
    expect(centsToFrench(123456)).toBe("1234,56");
    expect(formatSignedCents(-890)).toMatch(/^−8,90\s€$/);
  });
});

describe("schéma de tâche", () => {
  const base = { title: "Sport", category: "sport", moment: "soir", recurrence: "weekdays", finance_kind: "depense" };

  it("accepte une tâche certains jours", () => {
    const r = taskSchema.safeParse({ ...base, weekdays: ["1", "3", "5"] });
    expect(r.success && r.data.weekdays).toEqual([1, 3, 5]);
  });
  it("exige au moins un jour", () => {
    const r = taskSchema.safeParse(base);
    expect(r.success).toBe(false);
  });
  it("lien Trésorerie : montant obligatoire sauf s'il est demandé à chaque fois", () => {
    const daily = { ...base, recurrence: "daily", finance_enabled: "on" };
    expect(taskSchema.safeParse(daily).success).toBe(false);
    expect(taskSchema.safeParse({ ...daily, finance_ask: "on" }).success).toBe(true);
    const r = taskSchema.safeParse({ ...daily, finance_amount: "29,90" });
    expect(r.success && r.data.finance_amount).toBe(2990);
  });
  it("la fin d'une cure suit son début", () => {
    const r = taskSchema.safeParse({ ...base, recurrence: "daily", starts_on: "2026-10-21", ends_on: "2026-10-01" });
    expect(r.success).toBe(false);
  });
});

describe("coche avec montant", () => {
  it("convertit « 8,90 » en centimes", () => {
    const r = completeWithLineSchema.safeParse({
      task_id: "0f4c2a9e-1111-4222-8333-944455556666",
      day: "2026-10-21",
      with_line: "true",
      amount: "8,90",
      kind: "depense",
    });
    expect(r.success && r.data.amount).toBe(890);
  });
});
