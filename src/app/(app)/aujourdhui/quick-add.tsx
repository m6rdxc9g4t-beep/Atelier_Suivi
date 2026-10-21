"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Plus } from "lucide-react";
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
    <form action={action} className="mb-6" noValidate>
      <div className="flex gap-2">
        <label htmlFor="quick-title" className="sr-only">
          Nouvelle tâche
        </label>
        <input
          ref={input}
          id="quick-title"
          name="title"
          maxLength={120}
          autoComplete="off"
          defaultValue={state.values?.title}
          placeholder="Ajouter une tâche à faire…"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "quick-title-error" : undefined}
          className="h-12 min-w-0 flex-1 rounded-2xl border border-edge-soft bg-field px-4 text-ink placeholder:text-ink-soft/70 focus:border-accent focus:outline-none focus:focus-glow"
        />
        <SubmitButton aria-label="Ajouter la tâche" className="h-12 w-12 shrink-0 px-0 sm:w-auto sm:px-5">
          <Plus className="size-5" aria-hidden />
          <span className="hidden sm:inline">Ajouter</span>
        </SubmitButton>
        <Link href="/taches?nouvelle=1" className={buttonClasses("soft", "md", "h-12 shrink-0 rounded-2xl")}>
          Détails
        </Link>
      </div>
      {error && (
        <p id="quick-title-error" role="alert" className="mt-2 text-xs font-medium text-bad">
          {error}
        </p>
      )}
    </form>
  );
}
