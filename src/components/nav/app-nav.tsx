"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { ThemePicker } from "@/components/theme/theme-picker";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, SETTINGS_ITEM, type NavItem } from "./nav-items";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Le chemin courant n'est connu qu'à l'exécution : chaque navigation est rendue
 * une première fois sans onglet actif (coquille statique), puis complétée.
 */
function withPathname(View: (props: { pathname: string }) => React.ReactNode) {
  function Live() {
    return <View pathname={usePathname()} />;
  }
  return function Nav() {
    return (
      <Suspense fallback={<View pathname="" />}>
        <Live />
      </Suspense>
    );
  };
}

/** Navigation latérale (écrans larges) : entrées de 30 px, l'entrée courante sur fond neutre */
export const SideNav = withPathname(function SideNavView({ pathname }) {
  return (
    <nav aria-label="Navigation principale" className="flex flex-1 flex-col gap-px">
      {NAV_ITEMS.map((item) => (
        <SideLink key={item.href} item={item} active={isActive(pathname, item.href)} />
      ))}
      <div className="mt-auto flex flex-col gap-2">
        <SideLink item={SETTINGS_ITEM} active={isActive(pathname, SETTINGS_ITEM.href)} />
        <div className="px-1 pb-1">
          <ThemePicker compact />
        </div>
      </div>
    </nav>
  );
});

function SideLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-[30px] items-center gap-2.5 rounded-md px-2 font-medium transition-colors",
        active ? "bg-selected text-ink" : "text-ink-2 hover:bg-sunken hover:text-ink",
      )}
    >
      <Icon className={cn("size-4", active ? "text-ink" : "text-faint")} aria-hidden strokeWidth={1.75} />
      {item.label}
    </Link>
  );
}

/** Barre d'onglets du bas (téléphone) : à portée de pouce, onglet courant sur pastille neutre */
export const BottomNav = withPathname(function BottomNavView({ pathname }) {
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-sidebar/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 pt-1.5 pb-1 text-meta font-medium",
                  active ? "text-ink" : "text-muted",
                )}
              >
                <span className={cn("grid h-7 w-12 place-items-center rounded-full transition-colors", active && "bg-selected")}>
                  <Icon className="size-5" aria-hidden strokeWidth={active ? 2 : 1.75} />
                </span>
                {item.short}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
});

/** Lien réglages de l'en-tête mobile */
export const MobileSettingsLink = withPathname(function MobileSettingsLinkView({ pathname }) {
  const Icon = SETTINGS_ITEM.icon;
  const active = isActive(pathname, SETTINGS_ITEM.href);
  return (
    <Link
      href={SETTINGS_ITEM.href}
      aria-label={SETTINGS_ITEM.label}
      aria-current={active ? "page" : undefined}
      className={cn("grid size-11 place-items-center rounded-md", active ? "bg-selected text-ink" : "text-muted hover:bg-sunken hover:text-ink")}
    >
      <Icon className="size-5" aria-hidden strokeWidth={1.75} />
    </Link>
  );
});
