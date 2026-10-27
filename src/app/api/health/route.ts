/**
 * Sonde publique de la suite Atelier (portail du VPS, sélecteur de suite) :
 * ne dit que « ok », sans toucher à la session ni à la base.
 */
export function GET() {
  return Response.json({ status: "ok", app: "atelier-suivi" }, { headers: { "Cache-Control": "no-store" } });
}
