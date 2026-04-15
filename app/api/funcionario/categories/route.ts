import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SESSION_COOKIE, decodeSession } from "@/lib/funcionario-session";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const session = decodeSession(token);
  if (!session) return NextResponse.json({ error: "Sessão expirada" }, { status: 401 });

  const admin = createAdminClient();
  const { data } = await admin
    .from("employee_category_links")
    .select("category_id, employee_categories(id, name)")
    .eq("employee_id", session.employee_id);

  const categories = (data ?? [])
    .map((r: any) => ({ id: r.employee_categories?.id, name: r.employee_categories?.name }))
    .filter((c: any) => c.id && c.name);

  return NextResponse.json({ categories });
}
