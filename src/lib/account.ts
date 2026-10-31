/**
 * Compte unique de Suivi : si SUIVI_ACCOUNT_EMAIL est défini (Vercel, .env.local), seul ce compte peut entrer.
 * L'adresse reste hors du dépôt (public) ; sans la variable, tout compte du projet Supabase est accepté.
 */
export function accountEmail(): string | null {
  const email = process.env.SUIVI_ACCOUNT_EMAIL?.trim().toLowerCase();
  return email ? email : null;
}

export function isAllowedEmail(email: string | null | undefined): boolean {
  const allowed = accountEmail();
  return !allowed || (email ?? "").trim().toLowerCase() === allowed;
}

export const ACCOUNT_REFUSED = "Suivi est réservé à un seul compte : utilise l'adresse déjà remplie.";
