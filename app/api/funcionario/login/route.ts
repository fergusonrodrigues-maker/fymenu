import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createHash } from "crypto";

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export async function POST(req: NextRequest) {
  const { cpf, password } = await req.json();
  if (!cpf || !password)
    return NextResponse.json({ error: "CPF e senha obrigatórios" }, { status: 400 });

  const admin = createAdminClient();

  // Look up employee by CPF (normalized — digits only)
  const normalizedCpf = cpf.replace(/\D/g, "");
  const { data: employee } = await admin
    .from("employees")
    .select("id, name, role, team, unit_id, password_hash, is_active, units(slug, name)")
    .eq("cpf", normalizedCpf)
    .single();

  if (!employee)
    return NextResponse.json({ error: "CPF não encontrado" }, { status: 401 });

  if (employee.is_active === false)
    return NextResponse.json({ error: "Conta desativada" }, { status: 403 });

  if (employee.password_hash !== hashPassword(password))
    return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });

  const unit = employee.units as any;

  return NextResponse.json({
    employee: {
      id: employee.id,
      name: employee.name,
      role: employee.role,
      team: employee.team,
      unit_id: employee.unit_id,
      unit_slug: unit?.slug ?? null,
      unit_name: unit?.name ?? null,
    },
  });
}
