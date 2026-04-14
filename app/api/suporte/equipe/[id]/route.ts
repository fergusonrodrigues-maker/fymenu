import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateSuporteToken, hasPermission } from "@/lib/suporte-auth";
import crypto from "crypto";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await validateSuporteToken(req);
  if (!staff) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!hasPermission(staff, "gerenciar_staff"))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  const admin = createAdminClient();

  // Fetch target staff to validate existence
  const { data: target } = await admin
    .from("support_staff")
    .select("id, role")
    .eq("id", id)
    .single();

  if (!target) return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 });

  const updates: Record<string, unknown> = {};
  const VALID_ROLES = ["viewer", "suporte", "moderador", "gerente", "admin"];

  if (body.name !== undefined) updates.name = body.name;
  if (body.is_active !== undefined) updates.is_active = body.is_active;
  if (body.role !== undefined) {
    if (!VALID_ROLES.includes(body.role))
      return NextResponse.json({ error: "Role inválido" }, { status: 400 });
    updates.role = body.role;
  }
  if (body.password) {
    updates.password_hash = crypto.createHash("sha256").update(body.password + id).digest("hex");
    updates.current_token = null; // invalidate existing sessions
  }

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 });

  const { error } = await admin.from("support_staff").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await validateSuporteToken(req);
  if (!staff) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!hasPermission(staff, "gerenciar_staff"))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id } = await params;

  // Prevent self-deletion
  if (id === staff.id)
    return NextResponse.json({ error: "Não é possível remover a própria conta" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from("support_staff").update({ is_active: false }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
