"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "./button";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  pendingLabel?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  name?: string;
  value?: string;
  "aria-label"?: string;
};

/** Bouton d'envoi qui se désactive pendant l'exécution de la Server Action */
export function SubmitButton({ children, pendingLabel, variant, size, className, ...rest }: Props) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClasses(variant, size, className)} {...rest}>
      {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
