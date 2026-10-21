import { z } from "zod";
import type { PostgrestError } from "@supabase/supabase-js";

/** État renvoyé par toutes les Server Actions de formulaire */
export type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  /** Valeurs saisies, renvoyées en cas d'erreur pour ne rien faire retaper */
  values?: Record<string, string>;
};

export const idleState: ActionState = { status: "idle" };

export function success(message?: string): ActionState {
  return { status: "success", message };
}

export function failure(message: string): ActionState {
  return { status: "error", message };
}

export function fromZodError(error: z.ZodError): ActionState {
  return {
    status: "error",
    message: "Certains champs sont à corriger.",
    fieldErrors: z.flattenError(error).fieldErrors as Record<string, string[] | undefined>,
  };
}

/** Traduit une erreur Postgres/PostgREST en message compréhensible */
export function fromDbError(error: PostgrestError, fallback = "L'enregistrement a échoué. Réessaie dans un instant."): ActionState {
  console.error("[supabase]", error.code, error.message);
  switch (error.code) {
    case "42501":
      return failure("Tu n'as pas accès à cet élément.");
    case "23505":
      return failure("Cet élément existe déjà.");
    case "23514":
      return failure("Une des valeurs saisies n'est pas acceptée.");
    case "P0001":
    case "P0002":
      // Messages levés volontairement par nos fonctions SQL
      return failure(error.message);
    default:
      return failure(fallback);
  }
}

/** FormData → objet simple (les champs multiples deviennent des tableaux) */
export function formToObject(formData: FormData) {
  const out: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {};
  for (const key of new Set(formData.keys())) {
    if (key.startsWith("$ACTION")) continue;
    const values = formData.getAll(key);
    out[key] = values.length > 1 ? values : values[0];
  }
  return out;
}
