import type { Metadata } from "next";
import { Activity } from "lucide-react";
import { PasswordForm } from "@/app/connexion/password-form";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

/** Arrivée du lien « mot de passe oublié » : la session est déjà ouverte, il reste à choisir le mot de passe */
export default function NewPasswordPage() {
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
        <h1 className="neon-title mt-6 font-display text-4xl leading-tight font-extrabold text-ink">Nouveau mot de passe</h1>
        <p className="mt-3 mb-8 text-ink-soft">Choisis le mot de passe que tu taperas la prochaine fois pour te connecter.</p>
        <PasswordForm next="/aujourdhui" />
      </div>
    </main>
  );
}
