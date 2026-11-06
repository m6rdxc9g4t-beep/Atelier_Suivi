import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** État vide : icône discrète, titre (15 px, 600), une phrase et l'action utile */
export function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="grid size-10 place-items-center rounded-lg border border-edge bg-surface text-faint">
        <Icon className="size-5" aria-hidden strokeWidth={1.75} />
      </span>
      <p className="mt-3 text-title font-semibold text-ink">{title}</p>
      {children && <div className="mt-1 max-w-sm text-muted">{children}</div>}
    </div>
  );
}
