import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateSuporteToken, hasPermission } from "@/lib/suporte-auth";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const staff = await validateSuporteToken(req);
  if (!staff) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!hasPermission(staff, "gerenciar_staff"))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("support_staff")
    .select("id, name, email, role, is_active, last_login, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const staff = await validateSuporteToken(req);
  if (!staff) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!hasPermission(staff, "gerenciar_staff"))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { name, email, role, password } = await req.json();
  if (!name || !email || !role || !password)
    return NextResponse.json({ error: "name, email, role e password são obrigatórios" }, { status: 400 });

  const VALID_ROLES = ["viewer", "suporte", "moderador", "gerente", "admin"];
  if (!VALID_ROLES.includes(role))
    return NextResponse.json({ error: "Role inválido" }, { status: 400 });

  const admin = createAdminClient();

  // Check for duplicate email
  const { data: existing } = await admin
    .from("support_staff")
    .select("id")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (existing) return NextResponse.json({ error: "Email já cadastrado" }, { status: 409 });

  // We need the ID first to hash the password, so create then update
  const newId = crypto.randomUUID();
  const hash = crypto.createHash("sha256").update(password + newId).digest("hex");

  const { data: created, error } = await admin
    .from("support_staff")
    .insert({
      id: newId,
      name,
      email: email.toLowerCase().trim(),
      role,
      is_active: true,
      password_hash: hash,
      permissions: {},
    })
    .select("id, name, email, role, is_active")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: created }, { status: 201 });
}
