import type { Metadata } from "next";
import { Suspense } from "react";
import { Activity } from "lucide-react";
import { LoginForm } from "./login-form";
import { Skeleton } from "@/components/ui/skeleton";
import { accountEmail } from "@/lib/account";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-5 py-12">
      <div className="w-full max-w-sm">
        <span className="atelier-brand text-ink">
          <span className="atelier-brand__tile" aria-hidden>
            <Activity />
          </span>
          <span className="atelier-brand__name">
            <span className="atelier-brand__prefix">atelier_</span>Suivi
          </span>
        </span>
        <h1 className="neon-title mt-6 font-display text-4xl leading-tight font-extrabold text-ink">Tes journées, cochées</h1>
        <p className="mt-3 mb-8 text-ink-soft">
          Rappels quotidiens, habitudes, et les dépenses qui partent toutes seules vers atelier_Trésorerie.
        </p>
        <Suspense fallback={<Skeleton className="h-64" />}>
          <LoginForm accountEmail={accountEmail()} />
        </Suspense>
      </div>
    </main>
  );
}
