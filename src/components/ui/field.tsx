import { cn } from "@/lib/utils";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const control =
  "w-full rounded-2xl border border-edge-soft bg-field px-4 py-2.5 text-ink placeholder:text-ink-soft/70 " +
  "transition-colors focus:border-accent focus:outline-none focus-visible:outline-none focus:focus-glow " +
  "aria-[invalid=true]:border-bad";

type FieldProps = {
  label: string;
  name: string;
  hint?: string;
  errors?: string[];
  children: ReactNode;
  className?: string;
};

/** Libellé + contrôle + aide + erreurs, reliés par aria-describedby */
export function Field({ label, name, hint, errors, children, className }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={name} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && !errors?.length && (
        <p id={`${name}-hint`} className="text-xs text-ink-soft">
          {hint}
        </p>
      )}
      {errors?.length ? (
        <p id={`${name}-error`} className="text-xs font-medium text-bad" role="alert">
          {errors[0]}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(name: string, invalid?: boolean) {
  return invalid ? `${name}-error` : `${name}-hint`;
}

type WithInvalid = { invalid?: boolean };

export function Input({ className, invalid, name, ...props }: InputHTMLAttributes<HTMLInputElement> & WithInvalid) {
  return (
    <input
      id={name}
      name={name}
      aria-invalid={invalid || undefined}
      aria-describedby={(props.id ?? name) ? describedBy((props.id ?? name)!, invalid) : undefined}
      className={cn(control, "h-11", className)}
      {...props}
    />
  );
}

export function Textarea({
  className,
  invalid,
  name,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & WithInvalid) {
  return (
    <textarea
      id={name}
      name={name}
      aria-invalid={invalid || undefined}
      aria-describedby={(props.id ?? name) ? describedBy((props.id ?? name)!, invalid) : undefined}
      className={cn(control, "min-h-24 resize-y leading-relaxed", className)}
      {...props}
    />
  );
}

export function Select({ className, invalid, name, ...props }: SelectHTMLAttributes<HTMLSelectElement> & WithInvalid) {
  return (
    <select
      id={name}
      name={name}
      aria-invalid={invalid || undefined}
      aria-describedby={(props.id ?? name) ? describedBy((props.id ?? name)!, invalid) : undefined}
      className={cn(control, "h-11 appearance-none bg-[length:1rem] pr-10", className)}
      {...props}
    />
  );
}
