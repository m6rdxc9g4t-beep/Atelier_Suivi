"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Icône d'écran d'accueil propre à l'iPhone (l'onde de Suivi) : le Mac et l'iPad prennent le logo complet.
 *
 * Safari lit l'icône dans la page au moment de « Sur l'écran d'accueil » : d'abord
 * <link rel="apple-touch-icon">, puis les icônes du manifeste. On remplace donc ces deux liens
 * directement dans la page quand l'appareil est un iPhone, avec des adresses jamais vues par
 * l'iPhone (pour qu'aucun cache ne ressorte une ancienne icône).
 */
const IPHONE_ICON = "/icons/apple-icon-iphone.png?v=3";
const IPHONE_MANIFEST = "/icons/manifest-iphone.webmanifest?v=3";

const apply = `(function(){try{
if(!/iPhone|iPod/.test(navigator.userAgent))return;
var h=document.head;
function fix(rel,href){var ls=document.querySelectorAll('link[rel="'+rel+'"]');
if(!ls.length){var l=document.createElement("link");l.rel=rel;h.appendChild(l);ls=[l]}
for(var i=0;i<ls.length;i++){if(ls[i].getAttribute("href")!==href)ls[i].setAttribute("href",href)}}
fix("manifest","${IPHONE_MANIFEST}");
fix("apple-touch-icon","${IPHONE_ICON}");
}catch(e){}})();`;

/** Avant le premier affichage (chargement complet de la page) */
export function IphoneIconsScript() {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: apply }}
    />
  );
}

/** Après chaque navigation : Next réécrit les balises de métadonnées, on les corrige à nouveau */
export function IphoneIcons() {
  const pathname = usePathname();
  useEffect(() => {
    if (!/iPhone|iPod/.test(navigator.userAgent)) return;
    const run = new Function(apply);
    run();
    // Next ajoute ou réécrit des balises <link> après coup (métadonnées en différé, navigation) :
    // on corrige dès qu'elles apparaissent. run() ne modifie rien si tout est déjà bon, donc pas de boucle.
    const observer = new MutationObserver(() => run());
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["href"] });
    return () => observer.disconnect();
  }, [pathname]);
  return null;
}
