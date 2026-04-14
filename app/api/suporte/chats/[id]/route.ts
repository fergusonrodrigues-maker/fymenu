import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateSuporteToken, hasPermission } from "@/lib/suporte-auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await validateSuporteToken(req);
  if (!staff) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!hasPermission(staff, "responder_tickets"))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const admin = createAdminClient();

  const updates: Record<string, unknown> = {};
  const VALID_STATUSES = ["open", "waiting_reply", "resolved", "closed"];
  const VALID_PRIORITIES = ["low", "normal", "high", "urgent"];

  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status))
      return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    updates.status = body.status;
    if (body.status === "resolved") updates.resolved_at = new Date().toISOString();
    if (body.status === "open" || body.status === "waiting_reply") updates.resolved_at = null;
  }
  if (body.priority !== undefined) {
    if (!VALID_PRIORITIES.includes(body.priority))
      return NextResponse.json({ error: "Prioridade inválida" }, { status: 400 });
    updates.priority = body.priority;
  }
  if (body.assigned_staff_id !== undefined) {
    updates.assigned_staff_id = body.assigned_staff_id;
  }
  // "assign to me"
  if (body.assign_to_me === true) {
    updates.assigned_staff_id = staff.id;
  }

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 });

  const { error } = await admin.from("support_conversations").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await validateSuporteToken(req);
  if (!staff) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!hasPermission(staff, "responder_tickets"))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id } = await params;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("support_conversations")
    .select(`
      id, subject, status, priority, last_message_at, resolved_at, created_at,
      assigned_staff_id,
      restaurants!inner(id, name, plan),
      support_staff(id, name)
    `)
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
