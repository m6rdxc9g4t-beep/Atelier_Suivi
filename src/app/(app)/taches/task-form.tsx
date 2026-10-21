"use client";

import { useState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/actions";
import { centsToInput } from "@/lib/format";
import { CATEGORIES, DEFAULT_ACCOUNT, MOMENTS, MONEY_KINDS, RECURRENCES, TRESORERIE_CATEGORIES, WEEKDAYS } from "@/lib/meta";
import type { RecurrenceKind, TaskRow } from "@/lib/supabase/database.types";
import { useFormAction } from "@/lib/use-form-action";
import { cn } from "@/lib/utils";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

const chip =
  "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-edge-soft bg-surface px-4 text-sm font-semibold text-ink-soft transition-colors " +
  "has-checked:border-edge has-checked:bg-accent-soft has-checked:text-accent-strong has-focus-visible:outline-2 has-focus-visible:outline-accent";

/** Formulaire de tâche (création et modification), avec son lien Trésorerie facultatif */
export function TaskForm({ action, task, today }: { action: Action; task?: TaskRow; today: string }) {
  const [state, formAction] = useFormAction(action);
  const v = state.values;
  const err = (name: string) => state.fieldErrors?.[name];

  const [recurrence, setRecurrence] = useState<RecurrenceKind>(task?.recurrence ?? "once");
  const [weekdays, setWeekdays] = useState<number[]>(task?.weekdays ?? []);
  const [financeOn, setFinanceOn] = useState(task?.finance_enabled ?? false);
  const [ask, setAsk] = useState(task?.finance_ask ?? false);

  const categories =
    task?.finance_category && !TRESORERIE_CATEGORIES.includes(task.finance_category)
      ? [task.finance_category, ...TRESORERIE_CATEGORIES]
      : TRESORERIE_CATEGORIES;

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {task && <input type="hidden" name="task_id" value={task.id} />}

      <Field label="Tâche" name="title" errors={err("title")}>
        <Input
          name="title"
          maxLength={120}
          required
          placeholder="Séance de sport, prendre la cure, ménage…"
          defaultValue={v?.title ?? task?.title}
          invalid={Boolean(err("title"))}
        />
      </Field>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink">Catégorie</legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <label key={c.value} className={chip}>
              <input type="radio" name="category" value={c.value} defaultChecked={(v?.category ?? task?.category ?? "autre") === c.value} className="sr-only" />
              <span className="size-2.5 rounded-full" style={{ background: c.color }} aria-hidden />
              {c.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink">Fréquence</legend>
        <div className="flex flex-wrap gap-2">
          {RECURRENCES.map((r) => (
            <label key={r.value} className={chip}>
              <input
                type="radio"
                name="recurrence"
                value={r.value}
                checked={recurrence === r.value}
                onChange={() => setRecurrence(r.value)}
                className="sr-only"
              />
              {r.label}
            </label>
          ))}
        </div>
      </fieldset>

      {recurrence === "once" && (
        <Field label="Date (facultative)" name="due_on" hint="Sans date, la tâche reste dans « Aujourd'hui » jusqu'à ce que tu la coches." errors={err("due_on")}>
          <Input name="due_on" type="date" defaultValue={v?.due_on ?? task?.due_on ?? ""} />
        </Field>
      )}

      {recurrence === "weekdays" && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink">Jours</legend>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((d) => (
              <label key={d.value} className={cn(chip, "w-11 justify-center px-0")} title={d.label}>
                <input
                  type="checkbox"
                  name="weekdays"
                  value={d.value}
                  checked={weekdays.includes(d.value)}
                  onChange={(e) => setWeekdays((cur) => (e.target.checked ? [...cur, d.value] : cur.filter((x) => x !== d.value)))}
                  className="sr-only"
                  aria-label={d.label}
                />
                <span aria-hidden>{d.short}</span>
              </label>
            ))}
          </div>
          {err("weekdays") && (
            <p role="alert" className="mt-2 text-xs font-medium text-bad">
              {err("weekdays")?.[0]}
            </p>
          )}
        </fieldset>
      )}

      {recurrence === "interval" && (
        <Field label="Tous les … jours" name="every_days" errors={err("every_days")}>
          <Input name="every_days" type="number" min={1} max={365} inputMode="numeric" defaultValue={v?.every_days ?? task?.every_days ?? 2} className="max-w-40" />
        </Field>
      )}

      {recurrence === "monthly" && (
        <Field label="Jour du mois" name="month_day" hint="Un 31 tombe le dernier jour des mois plus courts." errors={err("month_day")}>
          <Input name="month_day" type="number" min={1} max={31} inputMode="numeric" defaultValue={v?.month_day ?? task?.month_day ?? Number(today.slice(8, 10))} className="max-w-40" />
        </Field>
      )}

      {recurrence !== "once" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="À partir du" name="starts_on" errors={err("starts_on")}>
            <Input name="starts_on" type="date" defaultValue={v?.starts_on ?? task?.starts_on ?? today} />
          </Field>
          <Field label="Jusqu'au (facultatif)" name="ends_on" hint="Pratique pour une cure." errors={err("ends_on")}>
            <Input name="ends_on" type="date" defaultValue={v?.ends_on ?? task?.ends_on ?? ""} />
          </Field>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Moment" name="moment">
          <Select name="moment" defaultValue={v?.moment ?? task?.moment ?? "journee"}>
            {MOMENTS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Note" name="note" errors={err("note")}>
          <Textarea name="note" maxLength={300} rows={2} className="min-h-11" placeholder="Dosage, durée, détail…" defaultValue={v?.note ?? task?.note ?? ""} />
        </Field>
      </div>

      <section className="flex flex-col gap-4 rounded-[1.5rem] border border-treso bg-treso-soft p-4 sm:p-5">
        <label className="flex min-h-11 cursor-pointer items-center gap-3 font-semibold text-treso">
          <input
            type="checkbox"
            name="finance_enabled"
            checked={financeOn}
            onChange={(e) => setFinanceOn(e.target.checked)}
            className="size-5 accent-[var(--treso)]"
          />
          Lien Trésorerie : préparer une ligne quand je coche
        </label>

        {financeOn && (
          <>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium text-ink">
              <input type="checkbox" name="finance_ask" checked={ask} onChange={(e) => setAsk(e.target.checked)} className="size-5 accent-[var(--treso)]" />
              Demander le montant à chaque fois (pharmacie, courses…)
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={ask ? "Montant proposé (€, facultatif)" : "Montant (€)"}
                name="finance_amount"
                errors={err("finance_amount")}
              >
                <Input
                  name="finance_amount"
                  inputMode="decimal"
                  placeholder="0,00"
                  className="font-mono"
                  defaultValue={v?.finance_amount ?? centsToInput(task?.finance_amount_cents)}
                  invalid={Boolean(err("finance_amount"))}
                />
              </Field>
              <fieldset>
                <legend className="mb-1.5 text-sm font-medium text-ink">Sens</legend>
                <div className="flex gap-2">
                  {MONEY_KINDS.map((k) => (
                    <label
                      key={k.value}
                      className="flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-2xl border border-edge-soft bg-surface px-3 text-sm font-semibold text-ink-soft has-checked:border-treso has-checked:text-treso"
                    >
                      <input type="radio" name="finance_kind" value={k.value} defaultChecked={(v?.finance_kind ?? task?.finance_kind ?? "depense") === k.value} className="sr-only" />
                      {k.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
            <Field label="Libellé dans Trésorerie" name="finance_label" hint="Par défaut : le nom de la tâche." errors={err("finance_label")}>
              <Input name="finance_label" maxLength={120} placeholder="Pharmacie : sirop" defaultValue={v?.finance_label ?? task?.finance_label ?? ""} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Catégorie Trésorerie" name="finance_category">
                <Select name="finance_category" defaultValue={v?.finance_category ?? task?.finance_category ?? "Divers"}>
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Compte" name="finance_account" hint="Le nom exact du compte dans Trésorerie.">
                <Input name="finance_account" maxLength={60} defaultValue={v?.finance_account ?? task?.finance_account ?? DEFAULT_ACCOUNT} />
              </Field>
            </div>
          </>
        )}
      </section>

      {task && (
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium text-ink">
          <input type="checkbox" name="paused" defaultChecked={task.paused} className="size-5 accent-[var(--atelier-signature)]" />
          En pause : n&apos;apparaît plus jusqu&apos;à ce que je la réactive
        </label>
      )}

      {/* La valeur de sens doit exister même sans lien Trésorerie (schéma) */}
      {!financeOn && <input type="hidden" name="finance_kind" value={task?.finance_kind ?? "depense"} />}

      <FormMessage state={state} />
      <SubmitButton pendingLabel="Enregistrement…" className="self-start">
        {task ? "Enregistrer" : "Créer la tâche"}
      </SubmitButton>
    </form>
  );
}
