/** Ancienne clé (avant la préférence commune de la suite) : reprise une fois par theme-script, puis effacée. */
export const LEGACY_THEME_KEY = "atelier-suivi-theme";

export const THEME_MODES = [
  { value: "system", label: "Système" },
  { value: "light", label: "Clair" },
  { value: "dark", label: "Sombre" },
] as const;

export type ThemeMode = (typeof THEME_MODES)[number]["value"];

/** API posée par src/styles/atelier-brand/atelier-theme.js (copie du kit) */
declare global {
  interface Window {
    atelierTheme?: {
      get: () => ThemeMode;
      set: (pref: ThemeMode) => void;
      resolved: () => "light" | "dark";
    };
  }
}
