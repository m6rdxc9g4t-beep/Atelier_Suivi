"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Plus, SlidersHorizontal } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { useFormAction } from "@/lib/use-form-action";
import { quickAddTask } from "./actions";

/** Ajout rapide d'une tâche ponctuelle ; « Détails » ouvre le formulaire complet */
export function QuickAdd() {
  const [state, action] = useFormAction(quickAddTask);
  const input = useRef<HTMLInputElement>(null);
  const error = state.fieldErrors?.title?.[0] ?? (state.status === "error" ? state.message : undefined);

  useEffect(() => {
    if (state.status === "success" && input.current) {
      input.current.value = "";
      input.current.focus();
    }
  }, [state]);

  return (
    <form action={action} className="border-b border-line px-5 py-3" noValidate>
      <div className="flex max-w-3xl gap-2">
        <label htmlFor="quick-title" className="sr-only">
          Nouvelle tâche
        </label>
        <div className="relative min-w-0 flex-1">
          <Plus className="pointer-events-none absolute top-1/2 left-3 hidden size-4 -translate-y-1/2 text-faint sm:block" aria-hidden />
          <input
            ref={input}
            id="quick-title"
            name="title"
            maxLength={120}
            autoComplete="off"
            enterKeyHint="done"
            defaultValue={state.values?.title}
            placeholder="Ajouter une tâche à faire…"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "quick-title-error" : undefined}
            className="h-11 w-full rounded-md border border-edge-soft bg-field px-3 sm:pl-9 text-input text-ink transition-[border-color,box-shadow] hover:border-faint focus:border-accent-line focus:outline-none focus:focus-ring aria-[invalid=true]:border-bad lg:h-[30px]"
          />
        </div>
        <SubmitButton aria-label="Ajouter la tâche" className="max-lg:h-11 max-sm:w-11 max-sm:px-0">
          <Plus className="size-5 sm:hidden" aria-hidden />
          <span className="hidden sm:inline">Ajouter</span>
        </SubmitButton>
        <Link href="/taches?nouvelle=1" aria-label="Détails" className={buttonClasses("soft", "md", "max-lg:h-11 max-sm:w-11 max-sm:px-0")}>
          <SlidersHorizontal className="size-4 sm:hidden" aria-hidden />
          <span className="hidden sm:inline">Détails</span>
        </Link>
      </div>
      {error && (
        <p id="quick-title-error" role="alert" className="mt-2 text-small font-medium text-bad">
          {error}
        </p>
      )}
    </form>
  );
}
