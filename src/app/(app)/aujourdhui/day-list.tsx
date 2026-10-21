"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { ArrowRight, Check, CheckCheck, Ellipsis, ListPlus } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClasses } from "@/components/ui/button";
import { formatCents, formatSignedCents } from "@/lib/format";
import { MOMENTS, categoryOf } from "@/lib/meta";
import type { MoneyKind, TaskCategory, TaskMoment } from "@/lib/supabase/database.types";
import { shortDay } from "@/lib/recurrence";
import { cn } from "@/lib/utils";
import { setTaskDone } from "./actions";
import { AmountDialog, type AmountTarget } from "./amount-dialog";

export type DayItemView = {
  id: string;
  title: string;
  category: TaskCategory;
  moment: TaskMoment;
  note: string | null;
  recurrence: string;
  done: boolean;
  overdue: boolean;
  dueOn: string | null;
  paused: boolean;
  streak: number;
  finance: {
    ask: boolean;
    amountCents: number | null;
    kind: MoneyKind;
    label: string;
    category: string | null;
    account: string | null;
  } | null;
  line: { amountCents: number; sent: boolean } | null;
};

type Notice = { message: string; undo?: { id: string } } | null;

/**
 * Liste du jour groupée par moment. La coche s'affiche tout de suite (useOptimistic) ;
 * le serveur confirme puis la page se rafraîchit. Une tâche dont le montant est à saisir
 * ouvre d'abord la fenêtre de montant.
 */
export function DayList({ items, day, isFuture }: { items: DayItemView[]; day: string; isFuture: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(items, (state, change: { id: string; done: boolean }) =>
    state.map((item) => (item.id === change.id ? { ...item, done: change.done } : item)),
  );
  const [, startTransition] = useTransition();
  const [notice, setNotice] = useState<Notice>(null);
  const [amountFor, setAmountFor] = useState<AmountTarget | null>(null);

  function toggle(item: DayItemView) {
    const next = !item.done;
    if (next && item.finance?.ask) {
      setAmountFor({ id: item.id, title: item.title, day, finance: item.finance });
      return;
    }
    startTransition(async () => {
      setOptimistic({ id: item.id, done: next });
      const result = await setTaskDone(item.id, day, next);
      if (result.needsAmount && item.finance) {
        setAmountFor({ id: item.id, title: item.title, day, finance: item.finance });
        return;
      }
      setNotice(result.message ? { message: result.message, undo: result.undoable ? { id: item.id } : undefined } : null);
    });
  }

  function undo(id: string) {
    setNotice(null);
    startTransition(async () => {
      setOptimistic({ id, done: false });
      const result = await setTaskDone(id, day, false);
      if (!result.ok && result.message) setNotice({ message: result.message });
    });
  }

  if (!optimistic.length) {
    return (
      <EmptyState icon={ListPlus} title={isFuture ? "Rien de prévu ce jour-là" : "Rien de prévu"}>
        <p>Ajoute une tâche ponctuelle ou un rappel qui revient : ta séance de sport, ta cure, le ménage du samedi.</p>
        <Link href="/taches?nouvelle=1" className={buttonClasses("primary", "md", "mt-4")}>
          Nouvelle tâche
        </Link>
      </EmptyState>
    );
  }

  return (
    <>
      <div className="space-y-5">
        {MOMENTS.map((moment) => {
          const group = optimistic.filter((i) => i.moment === moment.value);
          if (!group.length) return null;
          const n = group.filter((i) => i.done).length;
          return (
            <section key={moment.value} aria-labelledby={`moment-${moment.value}`}>
              <h2 id={`moment-${moment.value}`} className="eyebrow mb-2 ml-1 flex gap-2 text-ink-soft">
                {moment.label}
                <span className="text-ink-soft/70 tabular-nums">
                  {n}/{group.length}
                </span>
              </h2>
              <ul className="neon-panel divide-y divide-line rounded-[1.5rem] border border-edge bg-surface">
                {group.map((item) => (
                  <Row key={item.id} item={item} disabled={isFuture} onToggle={() => toggle(item)} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      {notice && (
        <div
          role="status"
          className="neon-panel fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-edge bg-surface py-2 pr-2 pl-4 text-sm font-semibold text-ink lg:bottom-6"
        >
          <span className="min-w-0 flex-1">{notice.message}</span>
          {notice.undo && (
            <button type="button" onClick={() => undo(notice.undo!.id)} className={buttonClasses("soft", "sm")}>
              Annuler
            </button>
          )}
          <button type="button" onClick={() => setNotice(null)} className={buttonClasses("ghost", "sm")} aria-label="Fermer le message">
            OK
          </button>
        </div>
      )}

      {amountFor && (
        <AmountDialog
          target={amountFor}
          onClose={() => setAmountFor(null)}
          onDone={(message) => {
            setAmountFor(null);
            setNotice({ message, undo: { id: amountFor.id } });
          }}
        />
      )}
    </>
  );
}

function Row({ item, disabled, onToggle }: { item: DayItemView; disabled: boolean; onToggle: () => void }) {
  const category = categoryOf(item.category);
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 py-2 pr-1 pl-1.5 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto]">
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-pressed={item.done}
        aria-label={`${item.done ? "Décocher" : "Cocher"} : ${item.title}`}
        className="group grid size-12 place-items-center rounded-full disabled:cursor-default"
      >
        <span
          className={cn(
            "grid size-7 place-items-center rounded-full border-2 transition-[background,box-shadow,transform] group-active:scale-90",
            item.done ? "glow-accent border-accent bg-accent text-accent-ink" : "border-edge text-transparent group-hover:glow-accent",
            disabled && "border-dashed opacity-60",
          )}
        >
          <Check className="size-4" strokeWidth={3.2} aria-hidden />
        </span>
      </button>

      <div className="min-w-0 py-1">
        <p className={cn("font-semibold break-words text-ink", item.done && "text-ink-soft line-through decoration-edge")}>{item.title}</p>
        <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[0.8rem] text-ink-soft">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: category.color }} aria-hidden />
            {category.label}
          </span>
          <span>{item.recurrence}</span>
          {item.overdue && item.dueOn && <span className="font-semibold text-bad">En retard · prévu le {shortDay(item.dueOn)}</span>}
          {item.streak > 1 && <span className="font-mono text-accent-strong">série : {item.streak}</span>}
          {item.paused && <span className="eyebrow text-[0.65rem]">En pause</span>}
        </p>
        {item.note && !item.done && <p className="mt-1 text-[0.8rem] text-ink-soft/90">{item.note}</p>}
      </div>

      <div className="col-start-2 row-start-2 sm:col-start-3 sm:row-start-1">
        <FinanceBadge item={item} />
      </div>

      <Link
        href={`/taches/${item.id}`}
        aria-label={`Modifier : ${item.title}`}
        className="col-start-3 row-start-1 grid size-11 place-items-center rounded-full text-ink-soft hover:bg-accent-faint hover:text-accent-strong sm:col-start-4"
      >
        <Ellipsis className="size-5" aria-hidden />
      </Link>
    </li>
  );
}

function FinanceBadge({ item }: { item: DayItemView }) {
  if (item.line) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-[0.8rem] font-semibold whitespace-nowrap text-treso",
          item.line.sent ? "border border-treso" : "bg-treso-soft",
        )}
        title={item.line.sent ? "Envoyée à Trésorerie" : "En attente d'envoi vers Trésorerie"}
      >
        {item.line.sent ? <CheckCheck className="size-3.5" aria-hidden /> : <ArrowRight className="size-3.5" aria-hidden />}
        {formatSignedCents(item.line.amountCents)}
      </span>
    );
  }
  if (!item.finance || item.done) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-treso-soft px-2.5 py-1 text-[0.8rem] font-semibold whitespace-nowrap text-treso">
      <ArrowRight className="size-3.5" aria-hidden />
      {item.finance.ask ? "Trésorerie · montant à saisir" : `Trésorerie · ${formatCents(item.finance.amountCents ?? 0)}`}
    </span>
  );
}
