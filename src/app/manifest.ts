import type { MetadataRoute } from "next";

/** Rend l'app installable : écran d'accueil de l'iPhone, Dock du Mac (Safari) */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "atelier_Suivi",
    short_name: "Suivi",
    description: "Tes journées cochées : rappels, habitudes et dépenses envoyées à atelier_Trésorerie.",
    lang: "fr",
    start_url: "/aujourdhui",
    scope: "/",
    display: "standalone",
    background_color: "#eff8fa",
    theme_color: "#eff8fa",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
