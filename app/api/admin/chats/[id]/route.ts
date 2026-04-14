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
    .from("support_conversations")
    .select(`id, subject, status, priority, last_message_at, resolved_at, created_at, assigned_staff_id, restaurants!inner(id, name, plan), support_staff(id, name)`)
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const admin = createAdminClient();

  const updates: Record<string, unknown> = {};
  if (body.status !== undefined) {
    updates.status = body.status;
    if (body.status === "resolved") updates.resolved_at = new Date().toISOString();
    if (body.status === "open" || body.status === "waiting_reply") updates.resolved_at = null;
  }
  if (body.priority !== undefined) updates.priority = body.priority;
  if (body.assigned_staff_id !== undefined) updates.assigned_staff_id = body.assigned_staff_id;

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: "Nenhum campo" }, { status: 400 });

  const { error } = await admin.from("support_conversations").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
