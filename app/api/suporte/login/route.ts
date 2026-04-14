import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password)
    return NextResponse.json({ error: "Email e senha obrigatórios" }, { status: 400 });

  const admin = createAdminClient();
  const { data: staff } = await admin
    .from("support_staff")
    .select("id, name, email, role, is_active, permissions, password_hash")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (!staff)
    return NextResponse.json({ error: "Email ou senha incorretos" }, { status: 401 });

  if (!staff.is_active)
    return NextResponse.json({ error: "Conta desativada." }, { status: 403 });

  if (!staff.password_hash)
    return NextResponse.json({ error: "Senha não configurada. Contate o administrador." }, { status: 403 });

  const hash = crypto.createHash("sha256").update(password + staff.id).digest("hex");
  if (staff.password_hash !== hash)
    return NextResponse.json({ error: "Email ou senha incorretos" }, { status: 401 });

  const token = crypto
    .createHash("sha256")
    .update(staff.id + Date.now().toString() + crypto.randomBytes(16).toString("hex"))
    .digest("hex");

  await admin
    .from("support_staff")
    .update({ current_token: token, last_login: new Date().toISOString() })
    .eq("id", staff.id);

  return NextResponse.json({
    token,
    staff: {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      role: staff.role,
      permissions: staff.permissions,
    },
  });
}
