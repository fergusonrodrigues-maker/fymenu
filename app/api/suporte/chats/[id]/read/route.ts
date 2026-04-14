import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateSuporteToken, hasPermission } from "@/lib/suporte-auth";

// POST /api/suporte/chats/[id]/read — mark client messages in this conversation as read
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await validateSuporteToken(req);
  if (!staff) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!hasPermission(staff, "responder_tickets"))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id } = await params;
  const admin = createAdminClient();

  const { error } = await admin
    .from("support_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", id)
    .eq("sender_type", "client")
    .is("read_at", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
