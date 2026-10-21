import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Retour du lien magique. Gère les deux formats Supabase :
 *  - ?code=…               (flux PKCE par défaut)
 *  - ?token_hash=…&type=…  (modèle d'e-mail personnalisé, fonctionne d'un appareil à l'autre)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next");
  // N'accepte que des chemins internes pour éviter les redirections ouvertes
  const next = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/aujourdhui";

  const supabase = await createClient();
  let ok = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    ok = !error;
  }

  return NextResponse.redirect(new URL(ok ? next : "/connexion?erreur=lien", origin));
}
