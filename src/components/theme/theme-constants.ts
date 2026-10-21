export const THEME_STORAGE_KEY = "atelier-suivi-theme";

export const THEME_MODES = [
  { value: "system", label: "Comme l'appareil" },
  { value: "light", label: "Clair" },
  { value: "dark", label: "Sombre" },
] as const;

export type ThemeMode = (typeof THEME_MODES)[number]["value"];
