import type { ReactNode } from "react";

/** En-tête de page : petite étiquette, titre arrondi avec halo de la couleur de l'app, intro, actions */
export function PageHeader({
  eyebrow,
  title,
  intro,
  action,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  intro?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 max-w-xl">
        {eyebrow && <p className="eyebrow text-accent-strong">{eyebrow}</p>}
        <h1 className="neon-title mt-1 font-display text-3xl leading-tight font-extrabold text-balance text-ink first-letter:uppercase sm:text-4xl">
          {title}
        </h1>
        {intro && <p className="mt-2 text-ink-soft">{intro}</p>}
      </div>
      {action}
    </header>
  );
}
