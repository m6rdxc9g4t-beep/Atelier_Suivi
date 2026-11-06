"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { THEME_MODES, type ThemeMode } from "./theme-constants";

const ICONS = { system: Monitor, light: Sun, dark: Moon } as const;

function subscribe(onChange: () => void) {
  window.addEventListener("atelier-theme", onChange);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    window.removeEventListener("atelier-theme", onChange);
    document.removeEventListener("visibilitychange", onChange);
  };
}
const read = (): ThemeMode => window.atelierTheme?.get() ?? "system";

/**
 * Choix Système / Clair / Sombre : préférence commune à la suite Atelier
 * (window.atelierTheme, posé par le script de thème ; cookie sur le VPS, sinon cet appareil).
 * `compact` : icônes seules, pour le pied de la barre latérale.
 */
export function ThemePicker({ compact = false }: { compact?: boolean }) {
  const mode = useSyncExternalStore(subscribe, read, () => "system" as ThemeMode);

  const control = (
    <div className="inline-flex gap-0.5 rounded-md bg-sunken p-0.5">
      {THEME_MODES.map((m) => {
        const Icon = ICONS[m.value];
        const pressed = mode === m.value;
        return (
          <button
            key={m.value}
            type="button"
            aria-pressed={pressed}
            aria-label={compact ? m.label : undefined}
            title={compact ? m.label : undefined}
            onClick={() => window.atelierTheme?.set(m.value)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-sm font-medium text-small text-muted transition-colors hover:text-ink",
              compact ? "size-6" : "h-9 px-3 lg:h-6 lg:px-2",
              pressed && "bg-surface text-ink shadow-pressed",
            )}
          >
            <Icon className={compact ? "size-3.5" : "size-4 lg:size-3.5"} aria-hidden strokeWidth={1.75} />
            {!compact && m.label}
          </button>
        );
      })}
    </div>
  );

  if (compact) return control;
  return (
    <fieldset>
      <legend className="sr-only">Apparence</legend>
      {control}
    </fieldset>
  );
}
