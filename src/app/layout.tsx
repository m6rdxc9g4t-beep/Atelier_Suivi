import type { Metadata, Viewport } from "next";
import "@fontsource-variable/nunito-sans";
import "@fontsource-variable/jetbrains-mono";
import "@/styles/atelier-brand/atelier-brand.css";
import "./globals.css";
import { ThemeScript } from "@/components/theme/theme-script";

export const metadata: Metadata = {
  title: { default: "atelier_Suivi", template: "%s · atelier_Suivi" },
  description: "Tes journées cochées : rappels, habitudes et dépenses envoyées à atelier_Trésorerie.",
  robots: { index: false, follow: false },
  applicationName: "atelier_Suivi",
  appleWebApp: { capable: true, title: "Suivi", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eff8fa" },
    { media: "(prefers-color-scheme: dark)", color: "#071012" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" data-atelier-app="suivi" suppressHydrationWarning className="h-full">
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
