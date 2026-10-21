"use client";

import { Field, Input, Select } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { centsToInput } from "@/lib/format";
import { MONEY_KINDS, TRESORERIE_CATEGORIES } from "@/lib/meta";
import type { TresoLineRow } from "@/lib/supabase/database.types";
import { useFormAction } from "@/lib/use-form-action";
import { updateLine } from "./actions";

/** Correction d'une ligne en attente (montant, libellé, catégorie, compte, date) */
export function LineForm({ line }: { line: Pick<TresoLineRow, "id" | "day" | "label" | "amount_cents" | "category" | "account"> }) {
  const [state, action] = useFormAction(updateLine);
  const v = state.values;
  const err = (n: string) => state.fieldErrors?.[n];
  const categories = line.category && !TRESORERIE_CATEGORIES.includes(line.category) ? [line.category, ...TRESORERIE_CATEGORIES] : TRESORERIE_CATEGORIES;
  const idp = `l-${line.id.slice(0, 8)}`;

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2" noValidate>
      <input type="hidden" name="line_id" value={line.id} />
      <Field label="Libellé" name={`${idp}-label`} errors={err("label")} className="sm:col-span-2">
        <Input id={`${idp}-label`} name="label" maxLength={200} defaultValue={v?.label ?? line.label} />
      </Field>
      <Field label="Montant (€)" name={`${idp}-amount`} errors={err("amount")}>
        <Input id={`${idp}-amount`} name="amount" inputMode="decimal" className="font-mono" defaultValue={v?.amount ?? centsToInput(Math.abs(line.amount_cents))} />
      </Field>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-ink">Sens</legend>
        <div className="flex gap-2">
          {MONEY_KINDS.map((k) => (
            <label
              key={k.value}
              className="flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-2xl border border-edge-soft bg-surface px-3 text-sm font-semibold text-ink-soft has-checked:border-treso has-checked:text-treso"
            >
              <input type="radio" name="kind" value={k.value} defaultChecked={(v?.kind ?? (line.amount_cents < 0 ? "depense" : "recette")) === k.value} className="sr-only" />
              {k.label}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Date" name={`${idp}-day`} errors={err("day")}>
        <Input id={`${idp}-day`} name="day" type="date" defaultValue={v?.day ?? line.day} />
      </Field>
      <Field label="Catégorie" name={`${idp}-category`}>
        <Select id={`${idp}-category`} name="category" defaultValue={v?.category ?? line.category ?? "Divers"}>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
      </Field>
      <Field label="Compte" name={`${idp}-account`} className="sm:col-span-2">
        <Input id={`${idp}-account`} name="account" maxLength={60} defaultValue={v?.account ?? line.account ?? ""} />
      </Field>
      <FormMessage state={state} className="sm:col-span-2" />
      <SubmitButton size="sm" pendingLabel="Enregistrement…" className="justify-self-start">
        Enregistrer la ligne
      </SubmitButton>
    </form>
  );
}
