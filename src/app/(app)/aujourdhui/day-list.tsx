"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { ArrowRight, Check, CheckCheck, Ellipsis, ListPlus } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClasses, iconButtonClasses } from "@/components/ui/button";
import { GroupHeader } from "@/components/ui/panel";
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
      {MOMENTS.map((moment) => {
        const group = optimistic.filter((i) => i.moment === moment.value);
        if (!group.length) return null;
        const n = group.filter((i) => i.done).length;
        return (
          <section key={moment.value} aria-labelledby={`moment-${moment.value}`}>
            <GroupHeader id={`moment-${moment.value}`} title={moment.label} count={`${n}/${group.length}`} />
            <ul>
              {group.map((item) => (
                <Row key={item.id} item={item} disabled={isFuture} onToggle={() => toggle(item)} />
              ))}
            </ul>
          </section>
        );
      })}

      {notice && (
        <div
          role="status"
          className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md items-center gap-2 rounded-lg border border-edge bg-surface py-1.5 pr-1.5 pl-3.5 font-medium text-ink shadow-pop lg:bottom-6 lg:left-[232px]"
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

/**
 * Une tâche du jour : rond à cocher (zone de 44 px au doigt), titre, détails en gris,
 * montant Trésorerie, accès à la modification. Sur ordinateur, ligne de 40 px.
 */
function Row({ item, disabled, onToggle }: { item: DayItemView; disabled: boolean; onToggle: () => void }) {
  const category = categoryOf(item.category);
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-1 border-b border-line pr-2 pl-1.5 transition-colors hover:bg-sunken/60 lg:min-h-10 lg:grid-cols-[auto_minmax(0,1fr)_auto_auto] lg:pr-3 lg:pl-2.5">
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-pressed={item.done}
        aria-label={`${item.done ? "Décocher" : "Cocher"} : ${item.title}`}
        className="group grid size-11 place-items-center rounded-md disabled:cursor-default lg:size-8"
      >
        <span
          className={cn(
            "grid size-[22px] place-items-center rounded-full border-[1.5px] transition-[background-color,border-color,transform] duration-150 ease-out group-active:scale-90 lg:size-4",
            item.done ? "border-accent bg-accent text-accent-ink" : "border-edge-soft text-transparent group-hover:border-accent",
            disabled && "border-dashed opacity-60 group-hover:border-edge-soft",
          )}
        >
          <Check className="size-3.5 lg:size-2.5" strokeWidth={3.5} aria-hidden />
        </span>
      </button>

      <div className="min-w-0 py-2.5 lg:flex lg:flex-wrap lg:items-baseline lg:gap-x-3 lg:py-2">
        <p className={cn("font-medium break-words text-ink", item.done && "text-muted line-through decoration-faint")}>{item.title}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-small text-muted lg:mt-0">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: category.color }} aria-hidden />
            {category.label}
          </span>
          <span>{item.recurrence}</span>
          {item.overdue && item.dueOn && <span className="font-medium text-bad">En retard · prévu le {shortDay(item.dueOn)}</span>}
          {item.streak > 1 && <span className="tabular-nums">série : {item.streak}</span>}
          {item.paused && <span className="rounded-xs border border-edge-soft px-1 text-meta">En pause</span>}
        </p>
        {item.note && !item.done && <p className="mt-0.5 text-small text-faint lg:mt-0 lg:basis-full">{item.note}</p>}
      </div>

      <div className="col-start-2 row-start-2 pb-2.5 lg:col-start-3 lg:row-start-1 lg:pb-0">
        <FinanceBadge item={item} />
      </div>

      <Link
        href={`/taches/${item.id}`}
        aria-label={`Modifier : ${item.title}`}
        className={iconButtonClasses("col-start-3 row-start-1 lg:col-start-4")}
      >
        <Ellipsis className="size-4" aria-hidden />
      </Link>
    </li>
  );
}

function FinanceBadge({ item }: { item: DayItemView }) {
  if (item.line) {
    return (
      <span
        className={cn(
          "inline-flex h-6 items-center gap-1 rounded-sm px-1.5 text-small font-medium whitespace-nowrap text-treso tabular-nums",
          item.line.sent ? "border border-treso/40" : "bg-treso-soft",
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
    <span className="inline-flex h-6 items-center gap-1 rounded-sm bg-treso-soft px-1.5 text-small font-medium whitespace-nowrap text-treso tabular-nums">
      <ArrowRight className="size-3.5" aria-hidden />
      {item.finance.ask ? "Trésorerie · montant à saisir" : `Trésorerie · ${formatCents(item.finance.amountCents ?? 0)}`}
    </span>
  );
}
