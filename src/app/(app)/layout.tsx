import Link from "next/link";
import { ListChecks } from "lucide-react";
import { BottomNav, MobileSettingsLink, SideNav } from "@/components/nav/app-nav";
import { cn } from "@/lib/utils";

/**
 * Coquille de l'application, statique (pré-rendue), sur le modèle du portail de la suite :
 * barre latérale de 232 px (marque, navigation, thème en pied) et zone principale dont chaque
 * page pose sa barre haute de 44 px. Sur téléphone, la barre d'onglets est fixée en bas de
 * l'écran : le contenu garde une marge basse suffisante pour que les dernières tâches ne passent
 * jamais dessous.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-sidebar px-2 pt-3 pb-2 lg:flex">
        <AtelierBrand className="mx-2 mb-4 self-start" />
        <SideNav />
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="flex items-center justify-between border-b border-line bg-sidebar pt-[env(safe-area-inset-top)] pr-2 pl-5 lg:hidden">
          <AtelierBrand className="min-h-13" />
          <MobileSettingsLink />
        </header>
        <main className="w-full flex-1 pb-[calc(7.5rem+env(safe-area-inset-bottom))] lg:pb-16">{children}</main>
      </div>

      <BottomNav />
    </div>
  );
}

/** Marque commune de la suite Atelier (styles : src/styles/atelier-brand/atelier-brand.css) */
function AtelierBrand({ className }: { className?: string }) {
  return (
    <Link href="/aujourdhui" className={cn("atelier-brand", className)}>
      <span className="atelier-brand__tile" aria-hidden>
        <ListChecks />
      </span>
      <span className="atelier-brand__name">
        <span className="atelier-brand__prefix">Atelier </span>Suivi
      </span>
    </Link>
  );
}
