import { cn } from "@/lib/utils";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

/** Champ de la suite : 36 px sur ordinateur (44 px au doigt), bord 1 px, focus = bord accent + voile de 3 px */
const control =
  "w-full rounded-md border border-edge-soft bg-field px-3 text-input text-ink " +
  "transition-[border-color,box-shadow] hover:border-faint focus:border-accent focus:outline-none focus-visible:outline-none focus:focus-ring " +
  "aria-[invalid=true]:border-bad disabled:opacity-50";

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
      <label htmlFor={name} className="font-medium text-ink-2">
        {label}
      </label>
      {children}
      {hint && !errors?.length && (
        <p id={`${name}-hint`} className="text-small text-muted">
          {hint}
        </p>
      )}
      {errors?.length ? (
        <p id={`${name}-error`} className="text-small font-medium text-bad" role="alert">
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
      className={cn(control, "h-11 lg:h-9", className)}
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
      className={cn(control, "min-h-24 resize-y py-2 leading-normal", className)}
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
      className={cn(control, "select-chevron h-11 appearance-none pr-8 lg:h-9", className)}
      {...props}
    />
  );
}
