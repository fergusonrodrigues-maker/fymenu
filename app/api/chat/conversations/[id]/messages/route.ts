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

async function verifyOwnership(userId: string, convId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("support_conversations")
    .select("id, restaurant_id, restaurants!inner(owner_id)")
    .eq("id", convId)
    .single();
  if (!data) return null;
  if ((data.restaurants as any).owner_id !== userId) return null;
  return data;
}

// GET /api/chat/conversations/[id]/messages
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const conv = await verifyOwnership(user.id, id);
  if (!conv) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("support_messages")
    .select("id, sender_type, sender_name, message, read_at, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mark staff/system messages as read
  await admin
    .from("support_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", id)
    .in("sender_type", ["staff", "system"])
    .is("read_at", null);

  return NextResponse.json({ data });
}

// POST /api/chat/conversations/[id]/messages — send a client message
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const conv = await verifyOwnership(user.id, id);
  if (!conv) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });

  const { message } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: "Mensagem obrigatória" }, { status: 400 });

  const admin = createAdminClient();

  // Get sender name
  const { data: restaurant } = await admin
    .from("restaurants")
    .select("name")
    .eq("id", conv.restaurant_id)
    .single();

  const { data: profile } = await admin
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .single();
  const senderName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") || (restaurant?.name ?? "Cliente")
    : (restaurant?.name ?? "Cliente");

  const { data: msg, error } = await admin
    .from("support_messages")
    .insert({
      conversation_id: id,
      sender_type: "client",
      sender_user_id: user.id,
      sender_name: senderName,
      message: message.trim(),
    })
    .select("id, sender_type, sender_name, message, read_at, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update conversation last_message_at and reopen if resolved
  await admin
    .from("support_conversations")
    .update({
      last_message_at: new Date().toISOString(),
      status: "open",
    })
    .eq("id", id);

  return NextResponse.json({ data: msg }, { status: 201 });
}
