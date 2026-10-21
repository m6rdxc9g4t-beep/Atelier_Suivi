"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
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

/** Navigation latérale (écrans larges) */
export const SideNav = withPathname(function SideNavView({ pathname }) {
  return (
    <nav aria-label="Navigation principale" className="flex flex-1 flex-col gap-1">
      {NAV_ITEMS.map((item) => (
        <SideLink key={item.href} item={item} active={isActive(pathname, item.href)} />
      ))}
      <div className="mt-auto">
        <SideLink item={SETTINGS_ITEM} active={isActive(pathname, SETTINGS_ITEM.href)} />
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
        "flex items-center gap-3 rounded-xl px-4 py-2.5 text-[0.95rem] transition-colors",
        active ? "atelier-nav-active font-semibold" : "text-ink-soft hover:bg-accent-faint hover:text-ink",
      )}
    >
      <Icon className={cn("size-[1.15rem]", active && "text-accent-strong")} aria-hidden strokeWidth={active ? 2.2 : 1.8} />
      {item.label}
    </Link>
  );
}

/** Barre d'onglets du bas (mobile) */
export const BottomNav = withPathname(function BottomNavView({ pathname }) {
  return (
    <nav
      aria-label="Navigation principale"
      className="neon-panel fixed inset-x-0 bottom-0 z-30 border-t border-edge bg-sidebar/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
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
                  "flex flex-col items-center gap-1 min-h-14 justify-center py-2 text-[0.72rem]",
                  active ? "font-semibold text-accent-strong" : "text-ink-soft",
                )}
              >
                <Icon className="size-5" aria-hidden strokeWidth={active ? 2.2 : 1.8} />
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
      className={cn("grid size-10 place-items-center rounded-full", active ? "bg-accent-soft text-accent-strong" : "text-ink-soft hover:bg-accent-faint")}
    >
      <Icon className="size-5" aria-hidden />
    </Link>
  );
});
