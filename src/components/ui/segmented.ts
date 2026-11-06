/**
 * Choix par boutons radio stylés (l'input reste dans le label, en sr-only).
 * segmented / segment : contrôle segmenté de la suite (rail neutre, option pressée sur surface).
 * chip : pastille de choix multiple (catégorie, fréquence, jours) ; choisie = voile de la signature.
 */
export const segmented = "flex gap-0.5 rounded-md bg-sunken p-0.5";

export const segment =
  "flex h-10 flex-1 cursor-pointer items-center justify-center rounded-sm px-3 font-medium text-muted transition-colors hover:text-ink lg:h-8 " +
  "has-checked:bg-surface has-checked:text-ink has-checked:shadow-pressed has-focus-visible:outline-2 has-focus-visible:outline-accent-line";

export const chip =
  "inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-edge-soft bg-surface px-3 font-medium text-ink-2 transition-colors hover:bg-sunken lg:h-[30px] lg:px-2.5 " +
  "has-checked:border-accent/50 has-checked:bg-accent-soft has-checked:text-ink has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent-line";
