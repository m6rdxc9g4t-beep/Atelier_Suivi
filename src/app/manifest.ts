import type { MetadataRoute } from "next";

/** Rend l'app installable : Dock du Mac (Safari), logo complet. L'iPhone reçoit public/icons/manifest-iphone.webmanifest (proxy). */
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
    background_color: "#071012",
    theme_color: "#071012",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
