import { Plus } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Formulaire repliable (details/summary natif, sans JS) pour garder les pages
 * centrées sur le contenu plutôt que sur la saisie.
 */
export function Disclosure({ label, children, defaultOpen }: { label: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="neon-panel group mb-8 rounded-[1.75rem] border border-edge bg-surface open:pb-2 open:neon-panel-strong" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-[1.75rem] px-5 py-4 font-medium text-ink hover:bg-accent-faint [&::-webkit-details-marker]:hidden">
        <span className="grid size-8 place-items-center rounded-full bg-accent text-accent-ink transition-transform group-open:rotate-45">
          <Plus className="size-4" aria-hidden />
        </span>
        {label}
      </summary>
      <div className="px-5 pb-4 pt-1">{children}</div>
    </details>
  );
}
