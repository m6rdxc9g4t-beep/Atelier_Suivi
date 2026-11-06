// Copie verbatim du kit (Atelier_Projets/design-system/brand/atelier-theme.js), lue comme texte
// (règle Turbopack « type: text » dans next.config.ts) pour être posée en ligne dans <head>.
import atelierTheme from "@/styles/atelier-brand/atelier-theme.js";
import { LEGACY_THEME_KEY } from "./theme-constants";

/**
 * Reprise, une seule fois, de l'ancienne préférence propre à Suivi (avant la préférence commune
 * de la suite) : elle devient la préférence commune, puis l'ancienne clé est effacée.
 */
const migrate = `(function(){try{
var old=localStorage.getItem("${LEGACY_THEME_KEY}");
if(old===null)return;
localStorage.removeItem("${LEGACY_THEME_KEY}");
if(localStorage.getItem("atelier:theme")===null&&!/(?:^|; )atelier_theme=/.test(document.cookie))window.atelierTheme.set(old);
}catch(e){}})();`;

/**
 * Applique le thème (préférence commune de la suite : Système, Clair ou Sombre) avant le premier
 * affichage : script bloquant en tête de page, sans requête réseau. Pose data-theme, la classe
 * « dark » (Tailwind) et data-theme-pref sur <html>, puis expose window.atelierTheme.
 */
export function ThemeScript() {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: `${atelierTheme}\n${migrate}` }}
    />
  );
}
