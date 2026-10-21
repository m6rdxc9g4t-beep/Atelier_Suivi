"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { THEME_MODES, THEME_STORAGE_KEY, type ThemeMode } from "./theme-constants";

function apply(mode: ThemeMode) {
  const dark = mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

/** Choix du mode clair / sombre (mémorisé sur cet appareil) */
export function ThemePicker() {
  const [mode, setMode] = useState<ThemeMode>("system");

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture unique de la préférence locale
      setMode((localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode) ?? "system");
    } catch {
      /* stockage indisponible */
    }
  }, []);

  function choose(next: ThemeMode) {
    setMode(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* stockage indisponible : le choix vaut pour cette visite */
    }
    apply(next);
  }

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-ink">Apparence</legend>
      <div className="inline-flex flex-wrap rounded-full border border-edge-soft bg-accent-faint p-1">
        {THEME_MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            aria-pressed={mode === m.value}
            onClick={() => choose(m.value)}
            className={cn(
              "min-h-10 rounded-full px-4 text-sm transition-colors",
              mode === m.value ? "bg-selected font-semibold text-ink" : "text-ink-soft hover:text-ink",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
