import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isAllowedEmail } from "@/lib/account";
import { getSupabaseEnv } from "@/lib/env";
import type { Database } from "./database.types";

const PUBLIC_PATHS = ["/connexion", "/auth"];

/**
 * Rafraîchit la session Supabase à chaque requête et redirige les visiteurs
 * non connectés vers /connexion. L'isolation des données reste assurée par RLS.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = getSupabaseEnv();

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // Ne rien intercaler entre la création du client et getClaims().
  const { data } = await supabase.auth.getClaims();
  const { pathname } = request.nextUrl;

  // Compte unique (SUIVI_ACCOUNT_EMAIL) : toute autre session est fermée
  if (data?.claims?.sub && !isAllowedEmail(data.claims.email)) {
    await supabase.auth.signOut();
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/connexion";
    redirectUrl.search = "?erreur=compte";
    return withSessionCookies(NextResponse.redirect(redirectUrl), response);
  }

  const isLoggedIn = Boolean(data?.claims?.sub);
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!isLoggedIn && !isPublic) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/connexion";
    redirectUrl.search = pathname === "/" ? "" : `?suite=${encodeURIComponent(pathname)}`;
    return withSessionCookies(NextResponse.redirect(redirectUrl), response);
  }

  if (isLoggedIn && pathname === "/connexion") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/aujourdhui";
    redirectUrl.search = "";
    return withSessionCookies(NextResponse.redirect(redirectUrl), response);
  }

  return response;
}

/** Reporte les cookies de session rafraîchis sur une réponse de redirection. */
function withSessionCookies(redirect: NextResponse, from: NextResponse) {
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  const cacheControl = from.headers.get("cache-control");
  if (cacheControl) redirect.headers.set("cache-control", cacheControl);
  return redirect;
}
