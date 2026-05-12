import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_PLANS = new Set(["menu", "menupro", "business"]);

function randomCode(len = 8) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

async function requireSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null;
  return user;
}

// POST /api/admin/coupons → create admin coupon
export async function POST(req: NextRequest) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const trial_extra_days = Number(body?.trial_extra_days);
  const valid_for_plan = body?.valid_for_plan;
  const rawCode = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
  const max_uses = body?.max_uses == null ? 1 : Number(body.max_uses);
  const expires_at = body?.expires_at || null;
  const discount_percent = Number(body?.discount_percent ?? 0);
  const discount_value = Number(body?.discount_value ?? 0);

  if (!Number.isFinite(trial_extra_days) || trial_extra_days < 0) {
    return NextResponse.json({ error: "trial_extra_days obrigatório" }, { status: 400 });
  }
  if (!valid_for_plan || !ALLOWED_PLANS.has(valid_for_plan)) {
    return NextResponse.json({ error: "valid_for_plan deve ser menu, menupro ou business" }, { status: 400 });
  }
  if (!Number.isFinite(max_uses) || max_uses < 1) {
    return NextResponse.json({ error: "max_uses inválido" }, { status: 400 });
  }

  const code = rawCode || randomCode(8);
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("partner_coupons")
    .select("id")
    .eq("code", code)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Código já existe. Escolha outro." }, { status: 409 });
  }

  const discount_type = trial_extra_days > 0
    ? "trial_days"
    : (discount_percent > 0 ? "percent" : (discount_value > 0 ? "fixed" : "trial_days"));

  const { data, error } = await admin
    .from("partner_coupons")
    .insert({
      partner_id: null,
      code,
      discount_type,
      discount_percent,
      discount_value,
      trial_extra_days,
      max_uses,
      current_uses: 0,
      is_active: true,
      expires_at,
      valid_for_plan,
      created_by_admin: true,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    coupon: data,
    checkout_url: `/checkout?plan=${valid_for_plan}&coupon=${code}`,
  });
}

// GET /api/admin/coupons → list admin-created coupons
export async function GET() {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("partner_coupons")
    .select("*")
    .eq("created_by_admin", true)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ coupons: data ?? [] });
}

// DELETE /api/admin/coupons?id=<uuid> → soft-disable
export async function DELETE(req: NextRequest) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin
    .from("partner_coupons")
    .update({ is_active: false })
    .eq("id", id)
    .eq("created_by_admin", true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
