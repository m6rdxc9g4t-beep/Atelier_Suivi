import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/** Icônes d'écran d'accueil : l'onde de Suivi sur iPhone, logo complet partout ailleurs (Mac, iPad…) */
const APPLE_ICON_PATH = "/apple-touch-icon.png";
const IPHONE_ICON = "/icons/apple-icon-iphone.png";
const MAIN_ICON = "/icons/apple-icon-main.png";
/** Manifeste dont les icônes sont l'onde (iOS récent peut s'en servir pour l'écran d'accueil) */
const IPHONE_MANIFEST = "/icons/manifest-iphone.webmanifest";

const isIphone = (request: NextRequest) => /iPhone|iPod/.test(request.headers.get("user-agent") ?? "");

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === APPLE_ICON_PATH) {
    // iPadOS se présente comme un Mac : seul l'iPhone (et l'iPod) reçoit l'onde
    const target = isIphone(request) ? IPHONE_ICON : MAIN_ICON;
    const response = NextResponse.rewrite(new URL(target, request.url));
    response.headers.set("Vary", "User-Agent");
    response.headers.set("Cache-Control", "no-cache");
    return response;
  }
  if (request.nextUrl.pathname === "/manifest.webmanifest") {
    const response = isIphone(request)
      ? NextResponse.rewrite(new URL(IPHONE_MANIFEST, request.url))
      : NextResponse.next();
    response.headers.set("Vary", "User-Agent");
    return response;
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    "/apple-touch-icon.png",
    "/manifest.webmanifest",
    // Tout le reste sauf la sonde de santé, les fichiers statiques et les images
    "/((?!api/health|_next/static|_next/image|favicon.ico|icon|apple-icon|apple-touch-icon|manifest.webmanifest|icons/|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)",
  ],
};
