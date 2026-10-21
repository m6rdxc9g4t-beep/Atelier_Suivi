import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "soft" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors",
    "disabled:cursor-not-allowed disabled:opacity-60",
    size === "md" ? "h-11 px-5 text-[0.95rem]" : "h-9 px-3.5 text-sm",
    variant === "primary" && "atelier-btn-primary hover:brightness-110",
    variant === "soft" && "border border-edge-soft bg-accent-faint text-ink hover:bg-accent-soft",
    variant === "ghost" && "text-ink-soft hover:bg-accent-faint hover:text-ink",
    variant === "danger" && "text-bad hover:bg-bad-soft",
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
