import type { Metadata, Viewport } from "next";
import "@/styles/atelier-brand/atelier-brand.css";
import "./globals.css";
import { Suspense } from "react";
import { ThemeScript } from "@/components/theme/theme-script";
import { IphoneIcons, IphoneIconsScript } from "@/components/theme/iphone-icons";

export const metadata: Metadata = {
  title: { default: "Atelier Suivi", template: "%s · Atelier Suivi" },
  description: "Tes journées cochées : rappels, habitudes et dépenses envoyées à Atelier Trésorerie.",
  robots: { index: false, follow: false },
  applicationName: "Atelier Suivi",
  appleWebApp: { capable: true, title: "Suivi", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  // Icône d'écran d'accueil : une seule adresse, servie par le proxy selon l'appareil
  // (plein cadre sur iPhone, qui arrondit lui-même). Changer ?v= force les appareils à la retélécharger.
  icons: { apple: [{ url: "/apple-touch-icon.png?v=3", sizes: "180x180", type: "image/png" }] },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfbfc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1012" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" data-atelier-app="suivi" suppressHydrationWarning className="h-full">
      <head>
        <ThemeScript />
        <IphoneIconsScript />
      </head>
      <body className="min-h-full">
        {children}
        <Suspense fallback={null}>
          <IphoneIcons />
        </Suspense>
      </body>
    </html>
  );
}
