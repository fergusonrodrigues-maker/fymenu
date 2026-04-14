import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateSuporteToken, hasPermission } from "@/lib/suporte-auth";

export async function GET(req: NextRequest) {
  const staff = await validateSuporteToken(req);
  if (!staff) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!hasPermission(staff, "responder_tickets"))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "all";
  const priority = searchParams.get("priority") ?? "all";
  const mine = searchParams.get("mine") === "1";
  const q = searchParams.get("q") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 25;
  const from = (page - 1) * limit;

  const admin = createAdminClient();

  let query = admin
    .from("support_conversations")
    .select(`
      id, subject, status, priority, last_message_at, resolved_at, created_at,
      assigned_staff_id,
      restaurants!inner(id, name, plan),
      support_staff(id, name)
    `, { count: "exact" })
    .order("last_message_at", { ascending: false })
    .range(from, from + limit - 1);

  if (status !== "all") query = query.eq("status", status);
  if (priority !== "all") query = query.eq("priority", priority);
  if (mine) query = query.eq("assigned_staff_id", staff.id);
  if (q) {
    query = query.or(`subject.ilike.%${q}%,restaurants.name.ilike.%${q}%`);
  }

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Count unread messages per conversation (client messages without read_at)
  const convIds = (data ?? []).map((c) => c.id);
  let unreadByConv: Record<string, number> = {};
  if (convIds.length > 0) {
    const { data: unread } = await admin
      .from("support_messages")
      .select("conversation_id")
      .in("conversation_id", convIds)
      .eq("sender_type", "client")
      .is("read_at", null);
    for (const m of unread ?? []) {
      unreadByConv[m.conversation_id] = (unreadByConv[m.conversation_id] ?? 0) + 1;
    }
  }

  const result = (data ?? []).map((c) => ({
    ...c,
    unread: unreadByConv[c.id] ?? 0,
  }));

  return NextResponse.json({ data: result, count, page, limit });
}
