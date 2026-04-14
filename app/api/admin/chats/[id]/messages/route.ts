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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  const { id } = await params;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("support_messages")
    .select("id, sender_type, sender_name, sender_staff_id, message, read_at, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mark client messages as read
  await admin
    .from("support_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", id)
    .eq("sender_type", "client")
    .is("read_at", null);

  return NextResponse.json({ data });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  const { id } = await params;
  const { message } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: "Mensagem obrigatória" }, { status: 400 });

  const admin = createAdminClient();

  const { data: msg, error } = await admin
    .from("support_messages")
    .insert({
      conversation_id: id,
      sender_type: "staff",
      sender_name: "Admin",
      message: message.trim(),
    })
    .select("id, sender_type, sender_name, sender_staff_id, message, read_at, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin
    .from("support_conversations")
    .update({ last_message_at: new Date().toISOString(), status: "waiting_reply" })
    .eq("id", id);

  return NextResponse.json({ data: msg }, { status: 201 });
}
