import { Plus } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Formulaire repliable (details/summary natif, sans JS) pour garder les pages
 * centrées sur le contenu plutôt que sur la saisie. Une ligne de liste quand il est fermé.
 */
export function Disclosure({ label, children, defaultOpen }: { label: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="group border-b border-line" open={defaultOpen}>
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2.5 px-5 font-medium text-ink-2 transition-colors hover:bg-sunken hover:text-ink lg:min-h-10 [&::-webkit-details-marker]:hidden">
        <Plus className="size-4 text-faint transition-transform group-open:rotate-45" aria-hidden />
        {label}
      </summary>
      <div className="max-w-2xl px-5 pt-2 pb-6">{children}</div>
    </details>
  );
}
