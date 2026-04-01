import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password)
    return NextResponse.json({ error: "Email e senha obrigatórios" }, { status: 400 });

  const admin = createAdminClient();
  const { data: partner } = await admin
    .from("partners")
    .select("id, name, email, commission_percent, is_photographer, is_active, password_hash")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (!partner)
    return NextResponse.json({ error: "Email ou senha incorretos" }, { status: 401 });

  if (!partner.is_active)
    return NextResponse.json({ error: "Conta desativada." }, { status: 403 });

  const hash = crypto.createHash("sha256").update(password + partner.id).digest("hex");
  if (partner.password_hash !== hash)
    return NextResponse.json({ error: "Email ou senha incorretos" }, { status: 401 });

  const token = crypto
    .createHash("sha256")
    .update(partner.id + Date.now().toString() + crypto.randomBytes(16).toString("hex"))
    .digest("hex");

  await admin
    .from("partners")
    .update({ current_token: token, last_login_at: new Date().toISOString() })
    .eq("id", partner.id);

  return NextResponse.json({
    token,
    partner: {
      id: partner.id,
      name: partner.name,
      email: partner.email,
      commission_percent: partner.commission_percent,
      is_photographer: partner.is_photographer,
    },
  });
}
