"use client";

import { useActionState, type ReactNode } from "react";
import { idleState, type ActionState } from "@/lib/actions";
import { cn } from "@/lib/utils";

/**
 * Petit formulaire pour les actions en un clic (voter, supprimer…).
 * Affiche l'erreur éventuelle juste en dessous, et peut demander confirmation.
 */
export function ActionForm({
  action,
  children,
  className,
  confirmMessage,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
  confirmMessage?: string;
}) {
  const [state, formAction] = useActionState(action, idleState);
  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirmMessage && !window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {children}
      {state.status === "error" && (
        <p role="alert" className={cn("mt-2 w-full basis-full text-xs font-medium text-bad")}>
          {state.message}
        </p>
      )}
    </form>
  );
}
