import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateSuporteToken, hasPermission } from "@/lib/suporte-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await validateSuporteToken(req);
  if (!staff) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!hasPermission(staff, "responder_tickets"))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id } = await params;
  const canSeeStaffNames = hasPermission(staff, "gerenciar_planos"); // gerente+

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("support_messages")
    .select("id, sender_type, sender_name, sender_staff_id, message, read_at, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mask staff names if viewer/suporte (can't see who sent what)
  const messages = (data ?? []).map((m) => ({
    ...m,
    sender_name: m.sender_type === "staff" && !canSeeStaffNames ? "Suporte" : m.sender_name,
    sender_staff_id: canSeeStaffNames ? m.sender_staff_id : undefined,
  }));

  return NextResponse.json({ data: messages });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await validateSuporteToken(req);
  if (!staff) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!hasPermission(staff, "responder_tickets"))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id } = await params;
  const { message } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: "Mensagem obrigatória" }, { status: 400 });

  const admin = createAdminClient();

  const { data: msg, error } = await admin
    .from("support_messages")
    .insert({
      conversation_id: id,
      sender_type: "staff",
      sender_staff_id: staff.id,
      sender_name: staff.name,
      message: message.trim(),
    })
    .select("id, sender_type, sender_name, sender_staff_id, message, read_at, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update conversation: set status to waiting_reply and bump last_message_at
  await admin
    .from("support_conversations")
    .update({ last_message_at: new Date().toISOString(), status: "waiting_reply" })
    .eq("id", id);

  return NextResponse.json({ data: msg }, { status: 201 });
}
