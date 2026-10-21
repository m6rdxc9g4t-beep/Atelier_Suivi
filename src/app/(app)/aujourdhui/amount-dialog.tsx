"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Field, Input, Select } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { centsToInput, formatLongDay } from "@/lib/format";
import { DEFAULT_ACCOUNT, MONEY_KINDS, TRESORERIE_CATEGORIES } from "@/lib/meta";
import type { MoneyKind } from "@/lib/supabase/database.types";
import { useFormAction } from "@/lib/use-form-action";
import { completeWithAmount } from "./actions";

export type AmountTarget = {
  id: string;
  title: string;
  day: string;
  finance: { amountCents: number | null; kind: MoneyKind; label: string; category: string | null; account: string | null };
};

/** Fenêtre (dialog natif) : montant réel d'une tâche liée à Trésorerie avant de la cocher */
export function AmountDialog({ target, onClose, onDone }: { target: AmountTarget; onClose: () => void; onDone: (message: string) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, action] = useFormAction(completeWithAmount);
  const { finance } = target;
  const categories = finance.category && !TRESORERIE_CATEGORIES.includes(finance.category) ? [finance.category, ...TRESORERIE_CATEGORIES] : TRESORERIE_CATEGORIES;

  useEffect(() => {
    const el = dialog.current;
    if (el && !el.open) el.showModal();
  }, []);

  const handled = useRef(false);
  useEffect(() => {
    if (state.status === "success" && !handled.current) {
      handled.current = true;
      onDone(state.message ?? "Tâche cochée.");
    }
  }, [state, onDone]);

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialog.current) dialog.current?.close();
      }}
      aria-labelledby="amount-title"
      className="neon-panel-strong m-auto w-[min(32rem,calc(100vw-1.5rem))] max-w-none rounded-[1.75rem] border border-edge bg-surface p-0 text-ink backdrop:bg-black/50 backdrop:backdrop-blur-sm max-sm:mb-0 max-sm:w-full max-sm:rounded-b-none"
    >
      <form action={action} className="flex flex-col gap-4 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6" noValidate>
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="eyebrow text-treso">Lien atelier_Trésorerie</p>
            <h2 id="amount-title" className="mt-1 font-display text-xl font-extrabold break-words">
              {target.title}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              Indique le montant réel : une ligne datée du {formatLongDay(target.day)} sera prête à envoyer.
            </p>
          </div>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            aria-label="Fermer"
            className="grid size-11 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-accent-faint hover:text-ink"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <input type="hidden" name="task_id" value={target.id} />
        <input type="hidden" name="day" value={target.day} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Montant (€)" name="amount" errors={state.fieldErrors?.amount}>
            <Input
              name="amount"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0,00"
              defaultValue={state.values?.amount ?? centsToInput(finance.amountCents)}
              invalid={Boolean(state.fieldErrors?.amount)}
              className="font-mono text-lg"
              autoFocus
            />
          </Field>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-sm font-medium text-ink">Sens</legend>
            <div className="flex gap-2">
              {MONEY_KINDS.map((k) => (
                <label key={k.value} className="flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-2xl border border-edge-soft px-3 text-sm font-semibold text-ink-soft has-checked:border-treso has-checked:bg-treso-soft has-checked:text-treso">
                  <input type="radio" name="kind" value={k.value} defaultChecked={(state.values?.kind ?? finance.kind) === k.value} className="sr-only" />
                  {k.label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <Field label="Libellé dans Trésorerie" name="label" errors={state.fieldErrors?.label}>
          <Input name="label" maxLength={200} defaultValue={state.values?.label ?? finance.label} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Catégorie" name="category">
            <Select name="category" defaultValue={state.values?.category ?? finance.category ?? "Divers"}>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Compte" name="account">
            <Input name="account" maxLength={60} defaultValue={state.values?.account ?? finance.account ?? DEFAULT_ACCOUNT} />
          </Field>
        </div>

        <FormMessage state={state.status === "error" && !state.fieldErrors ? state : { status: "idle" }} />

        <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
          <SubmitButton name="with_line" value="false" variant="ghost" className="mr-auto">
            Cocher sans ligne
          </SubmitButton>
          <SubmitButton name="with_line" value="true" pendingLabel="Enregistrement…">
            Cocher et préparer la ligne
          </SubmitButton>
        </div>
      </form>
    </dialog>
  );
}
