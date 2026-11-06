import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "soft" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

/**
 * Boutons de la suite : 30 px sur ordinateur (26 px en petit), zone tactile ≥ 40 px sur téléphone.
 * primary : plein, dans la signature (un par écran) · soft : neutre bordé · ghost : sans fond · danger : texte rouge.
 */
export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-md border font-medium whitespace-nowrap transition-colors",
    "disabled:cursor-not-allowed disabled:opacity-50",
    size === "md" ? "h-10 px-4 text-ui lg:h-[30px] lg:px-3" : "h-9 px-3 text-small lg:h-[26px] lg:px-2",
    variant === "primary" && "border-transparent bg-accent text-accent-ink hover:bg-accent-hover",
    variant === "soft" && "border-edge-soft bg-surface text-ink hover:bg-sunken active:bg-selected",
    variant === "ghost" && "border-transparent text-muted hover:bg-sunken hover:text-ink",
    variant === "danger" && "border-transparent text-bad hover:bg-bad-soft",
    className,
  );
}

/** Bouton carré d'icône (navigation de jour, fermeture) : 30 px sur ordinateur, 40 px au doigt */
export function iconButtonClasses(className?: string) {
  return cn(
    "grid size-10 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-sunken hover:text-ink lg:size-[30px]",
    className,
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />;
}
