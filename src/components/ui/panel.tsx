import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

/** Conteneur principal : grand arrondi, trait et halo dans la couleur de l'app */
export function Panel({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn("neon-panel rounded-[1.75rem] border border-edge bg-surface p-5 sm:p-6", className)} {...props} />;
}

/** Titre de section à l'intérieur d'une page */
export function SectionTitle({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <h2 className="mb-3 flex items-baseline gap-2 font-display text-xl font-extrabold text-ink">
      {children}
      {typeof count === "number" && <span className="font-sans text-sm text-ink-soft">{count}</span>}
    </h2>
  );
}
