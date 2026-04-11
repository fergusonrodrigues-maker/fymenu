import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const { partnerId, currentPassword, newPassword } = await req.json();
  if (!partnerId || !currentPassword || !newPassword)
    return NextResponse.json({ error: "Campos obrigatórios" }, { status: 400 });
  if (newPassword.length < 6)
    return NextResponse.json({ error: "Mínimo 6 caracteres" }, { status: 400 });

  const admin = createAdminClient();
  const { data: partner } = await admin
    .from("partners")
    .select("id, password_hash")
    .eq("id", partnerId)
    .single();

  if (!partner)
    return NextResponse.json({ error: "Parceiro não encontrado" }, { status: 404 });

  // Hash uses password + partner.id salt (same as login)
  const currentHash = crypto
    .createHash("sha256")
    .update(currentPassword + partner.id)
    .digest("hex");

  if (partner.password_hash !== currentHash)
    return NextResponse.json({ error: "Senha atual incorreta" }, { status: 401 });

  const newHash = crypto
    .createHash("sha256")
    .update(newPassword + partner.id)
    .digest("hex");

  await admin.from("partners").update({ password_hash: newHash }).eq("id", partner.id);
  return NextResponse.json({ ok: true });
}
