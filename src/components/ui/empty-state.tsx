import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-[1.75rem] border border-dashed border-edge-soft px-6 py-10 text-center">
      <Icon className="size-7 text-accent-strong" aria-hidden strokeWidth={1.6} />
      <p className="mt-3 font-display text-lg font-extrabold text-ink">{title}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-ink-soft">{children}</div>}
    </div>
  );
}
