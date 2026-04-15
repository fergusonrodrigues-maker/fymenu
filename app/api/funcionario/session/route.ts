import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  SESSION_COOKIE, SESSION_DURATION_MS,
  decodeSession, encodeSession, createSessionData,
} from "@/lib/funcionario-session";

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const session = decodeSession(token);
  if (!session) return NextResponse.json({ error: "Sessão expirada" }, { status: 401 });

  const { categoryId } = await req.json();
  if (!categoryId) return NextResponse.json({ error: "categoryId obrigatório" }, { status: 400 });

  const admin = createAdminClient();

  // Verify employee has this category
  const { data: link } = await admin
    .from("employee_category_links")
    .select("category_id, employee_categories(id, name)")
    .eq("employee_id", session.employee_id)
    .eq("category_id", categoryId)
    .maybeSingle();

  if (!link) return NextResponse.json({ error: "Sem acesso a essa função" }, { status: 403 });

  const category = (link as any).employee_categories;
  const newSession = createSessionData({
    ...session,
    active_category_id: category.id,
    active_category_name: category.name,
  });

  const newToken = encodeSession(newSession);
  const response = NextResponse.json({ success: true, category });
  response.cookies.set(SESSION_COOKIE, newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: SESSION_DURATION_MS / 1000,
    path: "/",
  });
  return response;
}
