import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SESSION_COOKIE, decodeSession } from "@/lib/funcionario-session";

const VALID_STATUSES = ["working", "break", "lunch", "off", "absent", "vacation"];

/**
 * PATCH /api/funcionario/status
 * Atualiza current_status do funcionário autenticado.
 * Body: { status: string }
 */
export async function PATCH(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const session = decodeSession(token);
  if (!session)
    return NextResponse.json({ error: "Sessão expirada" }, { status: 401 });

  const { status } = await req.json();
  if (!status || !VALID_STATUSES.includes(status))
    return NextResponse.json({ error: "Status inválido" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin
    .from("employees")
    .update({ current_status: status })
    .eq("id", session.employee_id);

  if (error)
    return NextResponse.json({ error: "Erro ao atualizar status" }, { status: 500 });

  return NextResponse.json({ status });
}
