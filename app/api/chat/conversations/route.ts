import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

async function getUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// GET /api/chat/conversations — list conversations for current user's restaurant
export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const admin = createAdminClient();

  // Get the restaurant owned by this user
  const { data: restaurant } = await admin
    .from("restaurants")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (!restaurant) return NextResponse.json({ error: "Restaurante não encontrado" }, { status: 404 });

  const { data, error } = await admin
    .from("support_conversations")
    .select(`
      id, subject, status, priority, last_message_at, resolved_at, created_at,
      assigned_staff_id,
      support_staff(name)
    `)
    .eq("restaurant_id", restaurant.id)
    .order("last_message_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Count unread messages (from staff/system, without read_at)
  const convIds = (data ?? []).map((c) => c.id);
  let unreadByConv: Record<string, number> = {};
  if (convIds.length > 0) {
    const { data: unread } = await admin
      .from("support_messages")
      .select("conversation_id")
      .in("conversation_id", convIds)
      .in("sender_type", ["staff", "system"])
      .is("read_at", null);
    for (const m of unread ?? []) {
      unreadByConv[m.conversation_id] = (unreadByConv[m.conversation_id] ?? 0) + 1;
    }
  }

  const result = (data ?? []).map((c) => ({
    ...c,
    unread: unreadByConv[c.id] ?? 0,
  }));

  return NextResponse.json({ data: result, restaurant_id: restaurant.id });
}

// POST /api/chat/conversations — create a new conversation
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { subject, unit_id, first_message } = await req.json();
  if (!subject?.trim()) return NextResponse.json({ error: "Assunto obrigatório" }, { status: 400 });
  if (!first_message?.trim()) return NextResponse.json({ error: "Mensagem obrigatória" }, { status: 400 });

  const admin = createAdminClient();

  const { data: restaurant } = await admin
    .from("restaurants")
    .select("id, name")
    .eq("owner_id", user.id)
    .single();

  if (!restaurant) return NextResponse.json({ error: "Restaurante não encontrado" }, { status: 404 });

  // Create conversation
  const { data: conv, error: convErr } = await admin
    .from("support_conversations")
    .insert({
      restaurant_id: restaurant.id,
      unit_id: unit_id ?? null,
      subject: subject.trim(),
      status: "open",
      priority: "normal",
      created_by_user_id: user.id,
      last_message_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (convErr || !conv) return NextResponse.json({ error: convErr?.message ?? "Erro" }, { status: 500 });

  // Get user display name
  const { data: profile } = await admin
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .single();
  const senderName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") || restaurant.name
    : restaurant.name;

  // Insert first message
  await admin.from("support_messages").insert({
    conversation_id: conv.id,
    sender_type: "client",
    sender_user_id: user.id,
    sender_name: senderName,
    message: first_message.trim(),
  });

  return NextResponse.json({ id: conv.id }, { status: 201 });
}
