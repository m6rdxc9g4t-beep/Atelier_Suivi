import type { ReactNode } from "react";

/**
 * Barre haute de la vue (44 px, collante sur ordinateur) : contexte en gris puis titre de la vue,
 * actions à droite. L'intro éventuelle passe dessous, en une ligne discrète.
 */
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
    <>
      <header className="z-20 flex min-h-13 items-center gap-3 border-b border-line bg-paper px-5 lg:sticky lg:top-0 lg:min-h-11 lg:bg-paper/90 lg:backdrop-blur-md lg:backdrop-saturate-150">
        {/* Téléphone : titre puis contexte dessous ; ordinateur : fil « contexte / titre » sur une ligne */}
        <h1 className="flex min-w-0 flex-1 flex-col py-1.5 text-strong font-semibold text-ink lg:flex-row lg:items-baseline lg:gap-2 lg:py-0 lg:text-ui">
          {eyebrow && (
            <span className="order-2 flex shrink-0 items-baseline gap-2 text-small font-medium text-muted lg:order-none lg:text-ui">
              {eyebrow}
              <span className="hidden text-faint lg:inline" aria-hidden>
                /
              </span>
            </span>
          )}
          <span className="order-1 min-w-0 truncate first-letter:uppercase lg:order-none">{title}</span>
        </h1>
        {action}
      </header>
      {intro && (
        <div className="border-b border-line px-5 py-3">
          <p className="max-w-3xl text-muted">{intro}</p>
        </div>
      )}
    </>
  );
}
