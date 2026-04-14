import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

async function verifyAdmin() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null;
  return user;
}

export async function GET(req: NextRequest) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "all";
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
  if (q) query = query.ilike("restaurants.name", `%${q}%`);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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

  return NextResponse.json({
    data: (data ?? []).map((c) => ({ ...c, unread: unreadByConv[c.id] ?? 0 })),
    count, page, limit,
  });
}
