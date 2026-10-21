"use client";

import { Button } from "@/components/ui/button";

export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="neon-panel rounded-[1.75rem] border border-edge bg-surface p-8">
      <h1 className="font-display text-2xl font-extrabold text-ink">Cette page n&apos;a pas pu se charger</h1>
      <p className="mt-2 text-ink-soft">
        La connexion à la base de données a échoué. Vérifie ta connexion internet puis réessaie.
      </p>
      {error.digest && <p className="mt-2 text-xs text-ink-soft">Référence : {error.digest}</p>}
      <Button className="mt-6" onClick={() => retry()}>
        Réessayer
      </Button>
    </div>
  );
}
