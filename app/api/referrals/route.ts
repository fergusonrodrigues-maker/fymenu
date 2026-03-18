import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  let body: { email?: string; referred_by?: string; user_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, referred_by, user_id } = body;

  if (!email || !referred_by) {
    return NextResponse.json(
      { error: "Campos 'email' e 'referred_by' são obrigatórios" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Validate referrer code exists (must match a restaurant's slug or id)
  const { data: referrer } = await admin
    .from("restaurants")
    .select("id")
    .or(`id.eq.${referred_by},slug.eq.${referred_by}`)
    .maybeSingle();

  if (!referrer) {
    return NextResponse.json({ error: "Código de referência inválido" }, { status: 400 });
  }

  // Check for duplicate
  const { data: existing } = await admin
    .from("referrals")
    .select("id")
    .eq("referred_email", email)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "Este e-mail já foi indicado anteriormente" },
      { status: 409 }
    );
  }

  const { error } = await admin.from("referrals").insert({
    referrer_code: referred_by,
    referred_email: email,
    user_id: user_id ?? null,
    status: "pending",
  });

  if (error) {
    return NextResponse.json({ error: "Erro ao registrar indicação" }, { status: 500 });
  }

  console.log(`[Referral] ${email} indicado por ${referred_by}`);

  return NextResponse.json({ success: true, message: "Indicação registrada com sucesso!" });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Parâmetro 'code' obrigatório" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { count } = await admin
    .from("referrals")
    .select("*", { count: "exact", head: true })
    .eq("referrer_code", code);

  return NextResponse.json({ referrer_code: code, total_referrals: count ?? 0 });
}
