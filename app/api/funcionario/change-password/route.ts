import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export async function POST(req: NextRequest) {
  const { employeeId, currentPassword, newPassword } = await req.json();

  if (!employeeId || !currentPassword || !newPassword) {
    return NextResponse.json({ error: "Campos obrigatórios" }, { status: 400 });
  }

  if (newPassword.length < 4) {
    return NextResponse.json({ error: "Nova senha deve ter no mínimo 4 caracteres" }, { status: 400 });
  }

  const { data: emp } = await supabase
    .from("employees")
    .select("password_hash")
    .eq("id", employeeId)
    .single();

  if (!emp) return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 });

  if (emp.password_hash !== hashPassword(currentPassword)) {
    return NextResponse.json({ error: "Senha atual incorreta" }, { status: 401 });
  }

  await supabase.from("employees").update({
    password_hash: hashPassword(newPassword),
  }).eq("id", employeeId);

  return NextResponse.json({ ok: true });
}
