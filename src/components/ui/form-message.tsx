import { CircleAlert, CircleCheck } from "lucide-react";
import type { ActionState } from "@/lib/actions";
import { cn } from "@/lib/utils";

/** Message global d'un formulaire (succès ou erreur), annoncé aux lecteurs d'écran */
export function FormMessage({ state, className }: { state: ActionState; className?: string }) {
  if (state.status === "idle" || !state.message) return null;
  const isError = state.status === "error";
  const Icon = isError ? CircleAlert : CircleCheck;
  return (
    <p
      role={isError ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-2xl px-4 py-3 text-sm",
        isError ? "bg-bad-soft text-bad" : "bg-good-soft text-good",
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{state.message}</span>
    </p>
  );
}
