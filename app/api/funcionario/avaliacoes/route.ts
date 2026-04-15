import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SESSION_COOKIE, decodeSession } from "@/lib/funcionario-session";

/**
 * GET /api/funcionario/avaliacoes
 * Retorna as avaliações do funcionário autenticado.
 * Tenta employee_ratings; se a tabela não existir, retorna lista vazia.
 */
export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const session = decodeSession(token);
  if (!session)
    return NextResponse.json({ error: "Sessão expirada" }, { status: 401 });

  const admin = createAdminClient();

  const { data: ratings, error } = await admin
    .from("employee_ratings")
    .select("id, rating, comment, created_at, order_id")
    .eq("employee_id", session.employee_id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Table may not exist in all plans — return empty gracefully
  if (error) return NextResponse.json({ ratings: [] });

  const total = ratings?.length ?? 0;
  const avg =
    total > 0
      ? ratings!.reduce((s, r) => s + (r.rating ?? 0), 0) / total
      : null;

  return NextResponse.json({ ratings: ratings ?? [], avg, total });
}
