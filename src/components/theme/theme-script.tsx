import { THEME_STORAGE_KEY } from "./theme-constants";

/**
 * Applique le thème (clair/sombre) mémorisé avant le premier affichage, pour éviter
 * un flash. Par défaut : comme l'appareil.
 */
const script = `(function(){try{
var t=localStorage.getItem("${THEME_STORAGE_KEY}")||"system";
var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);
document.documentElement.classList.toggle("dark",d);
}catch(e){}})();`;

export function ThemeScript() {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
