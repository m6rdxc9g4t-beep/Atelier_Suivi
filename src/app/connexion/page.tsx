import type { Metadata } from "next";
import { Suspense } from "react";
import { ListChecks } from "lucide-react";
import { LoginForm } from "./login-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-5 pt-[max(3rem,env(safe-area-inset-top))] pb-12">
      <div className="w-full max-w-[340px]">
        <span className="atelier-brand">
          <span className="atelier-brand__tile" aria-hidden>
            <ListChecks />
          </span>
          <span className="atelier-brand__name">
            <span className="atelier-brand__prefix">Atelier </span>Suivi
          </span>
        </span>
        <h1 className="mt-8 text-page font-semibold tracking-[-0.012em] text-ink">Tes journées, cochées</h1>
        <p className="mt-1.5 mb-6 text-strong text-muted">
          Rappels quotidiens, habitudes, et les dépenses qui partent toutes seules vers Atelier Trésorerie.
        </p>
        <Suspense fallback={<Skeleton className="h-64" />}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
