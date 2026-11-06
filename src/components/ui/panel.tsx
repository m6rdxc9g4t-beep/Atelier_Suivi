import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

/** Panneau de formulaire ou de réglages : surface, trait de 1 px, coins de 10 px, plat au repos */
export function Panel({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn("rounded-lg border border-edge bg-surface p-4 lg:p-5", className)} {...props} />;
}

/** Titre de section à l'intérieur d'un panneau */
export function SectionTitle({ children, count }: { children: ReactNode; count?: number }) {
  return (
    <h2 className="mb-3 flex items-baseline gap-2 text-strong font-semibold text-ink">
      {children}
      {typeof count === "number" && <span className="text-meta font-medium text-faint tabular-nums">{count}</span>}
    </h2>
  );
}

/**
 * En-tête de groupe d'une liste dense : fond de barre latérale, titre 600, compteur et note en gris.
 * Collant sous la barre haute sur ordinateur.
 */
export function GroupHeader({ id, title, count, note, action }: { id?: string; title: ReactNode; count?: ReactNode; note?: ReactNode; action?: ReactNode }) {
  return (
    <div className="z-10 flex min-h-10 items-center gap-2 border-b border-line bg-sidebar px-5 py-2 lg:sticky lg:top-11 lg:min-h-9">
      <h2 id={id} className="flex min-w-0 flex-1 items-baseline gap-2 font-medium text-muted">
        <span className="font-semibold text-ink">{title}</span>
        {count !== undefined && <span className="text-meta text-faint tabular-nums">{count}</span>}
        {note && <span className="truncate">{note}</span>}
      </h2>
      {action}
    </div>
  );
}
