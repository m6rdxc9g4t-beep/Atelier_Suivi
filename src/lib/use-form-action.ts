"use client";

import { useActionState } from "react";
import { idleState, type ActionState } from "./actions";

type FormAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * useActionState + conservation des saisies : React réinitialise le formulaire
 * après chaque envoi ; en cas d'erreur on garde les valeurs pour les réafficher
 * via defaultValue={state.values?.champ}.
 */
export function useFormAction(action: FormAction) {
  return useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await action(prev, formData);
    if (result.status !== "error") return result;
    const values: Record<string, string> = {};
    formData.forEach((value, key) => {
      // jamais de mot de passe gardé en mémoire
      if (typeof value === "string" && !key.startsWith("$ACTION") && !/password|confirm/i.test(key)) values[key] = value;
    });
    return { ...result, values };
  }, idleState);
}
