import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const admin = createAdminClient();

  if (body.action === "add") {
    const { name, email, role, permissions } = body;
    const { data, error } = await admin
      .from("support_staff")
      .insert({ name, email, role, permissions, created_by: user.id })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ staff: data });
  }

  if (body.action === "edit") {
    const { id, name, email, role, permissions } = body;
    const { error } = await admin
      .from("support_staff")
      .update({ name, email, role, permissions })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (body.action === "set_password") {
    const { id, password } = body;
    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Senha deve ter pelo menos 6 caracteres" }, { status: 400 });
    }
    const hash = crypto.createHash("sha256").update(password + id).digest("hex");
    const { error } = await admin
      .from("support_staff")
      .update({ password_hash: hash })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (body.action === "toggle") {
    const { id, is_active } = body;
    const { error } = await admin
      .from("support_staff")
      .update({ is_active })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (body.action === "remove") {
    const { id } = body;
    const { error } = await admin.from("support_staff").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
