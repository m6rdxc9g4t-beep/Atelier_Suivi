import { CalendarDays, ListChecks, Settings, Sun, Wallet, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; short: string; icon: LucideIcon };

export const NAV_ITEMS: NavItem[] = [
  { href: "/aujourdhui", label: "Aujourd'hui", short: "Aujourd'hui", icon: Sun },
  { href: "/semaine", label: "Semaine", short: "Semaine", icon: CalendarDays },
  { href: "/taches", label: "Tâches et rappels", short: "Tâches", icon: ListChecks },
  { href: "/tresorerie", label: "Trésorerie", short: "Trésorerie", icon: Wallet },
];

export const SETTINGS_ITEM: NavItem = { href: "/parametres", label: "Paramètres", short: "Réglages", icon: Settings };
