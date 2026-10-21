import Link from "next/link";
import { Activity } from "lucide-react";
import { BottomNav, MobileSettingsLink, SideNav } from "@/components/nav/app-nav";
import { cn } from "@/lib/utils";

/**
 * Coquille de l'application, statique (pré-rendue). Sur téléphone, la barre d'onglets
 * est fixée en bas de l'écran : le contenu garde une marge basse suffisante pour que
 * les dernières tâches ne passent jamais dessous.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-8 px-5 py-8 lg:flex lg:border-r lg:border-edge lg:bg-sidebar">
        <AtelierBrand className="px-4" />
        <SideNav />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between px-5 pt-[max(1.25rem,env(safe-area-inset-top))] lg:hidden">
          <AtelierBrand />
          <MobileSettingsLink />
        </header>
        <main className="w-full max-w-3xl flex-1 px-5 pt-6 pb-[calc(7.5rem+env(safe-area-inset-bottom))] sm:px-8 lg:pt-12 lg:pb-16">
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}

/** Marque commune de la suite Atelier (styles : src/styles/atelier-brand/atelier-brand.css) */
function AtelierBrand({ className }: { className?: string }) {
  return (
    <Link href="/aujourdhui" className={cn("atelier-brand text-ink", className)}>
      <span className="atelier-brand__tile" aria-hidden>
        <Activity />
      </span>
      <span className="atelier-brand__name">
        <span className="atelier-brand__prefix">atelier_</span>Suivi
      </span>
    </Link>
  );
}
