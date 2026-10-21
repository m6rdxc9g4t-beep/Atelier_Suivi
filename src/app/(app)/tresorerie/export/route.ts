import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { tresorerieCsv } from "@/lib/csv";
import { todayInTimezone } from "@/lib/format";

/**
 * GET /tresorerie/export : les lignes en attente au format d'import d'atelier_Trésorerie
 * (Transactions → Importer). Ne change pas leur statut : on les marque « envoyées »
 * une fois l'import fait, depuis la page Trésorerie.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });

  const { data, error } = await supabase
    .from("treso_lines")
    .select("id, day, label, amount_cents, category, account, task_title")
    .eq("status", "pending")
    .order("day")
    .order("created_at");
  if (error) return NextResponse.json({ error: "Lecture des lignes impossible." }, { status: 500 });

  return new NextResponse(tresorerieCsv(data), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="atelier_Suivi-tresorerie-${todayInTimezone()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
