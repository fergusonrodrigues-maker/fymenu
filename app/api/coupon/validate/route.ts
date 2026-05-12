import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const { code } = await req.json();
  if (!code) return NextResponse.json({ valid: false });

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data } = await admin
    .from("partner_coupons")
    .select("*, partners(name)")
    .ilike("code", code.trim())
    .eq("is_active", true)
    .maybeSingle();

  if (!data) return NextResponse.json({ valid: false });
  if (data.expires_at && data.expires_at < now) return NextResponse.json({ valid: false });
  if (data.max_uses !== null && data.current_uses >= data.max_uses) return NextResponse.json({ valid: false });

  return NextResponse.json({
    valid: true,
    discount_type: data.discount_type,
    discount_value: data.discount_value,
    trial_extra_days: data.trial_extra_days,
    partner_name: (data.partners as { name: string } | null)?.name ?? "",
  });
}

// GET /api/coupon/validate?code=ABC123&plan=menu
// Used by the authenticated checkout flow to live-validate a coupon.
// Checks plan restriction and per-restaurant idempotency in addition to base checks.
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ valid: false, error: "Unauthorized" }, { status: 401 });

  const code = (req.nextUrl.searchParams.get("code") ?? "").trim().toUpperCase();
  const plan = (req.nextUrl.searchParams.get("plan") ?? "").trim().toLowerCase();
  if (!code) return NextResponse.json({ valid: false, error: "Código vazio" }, { status: 400 });

  const admin = createAdminClient();
  const { data: coupon } = await admin
    .from("partner_coupons")
    .select("id, code, is_active, expires_at, max_uses, current_uses, trial_extra_days, discount_percent, discount_value, valid_for_plan, created_by_admin")
    .ilike("code", code)
    .maybeSingle();

  if (!coupon) return NextResponse.json({ valid: false, error: "Cupom não encontrado" }, { status: 404 });
  if (!coupon.is_active) return NextResponse.json({ valid: false, error: "Cupom desativado" }, { status: 400 });
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, error: "Cupom expirado" }, { status: 400 });
  }
  if (coupon.max_uses != null && coupon.current_uses >= coupon.max_uses) {
    return NextResponse.json({ valid: false, error: "Cupom esgotado" }, { status: 400 });
  }
  if (coupon.valid_for_plan && plan && coupon.valid_for_plan !== plan) {
    return NextResponse.json({
      valid: false,
      error: `Este cupom é válido apenas para o plano ${coupon.valid_for_plan}`,
    }, { status: 400 });
  }

  const { data: restaurant } = await admin
    .from("restaurants")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (restaurant) {
    const { data: prior } = await admin
      .from("coupon_redemptions")
      .select("id")
      .eq("coupon_id", coupon.id)
      .eq("restaurant_id", restaurant.id)
      .maybeSingle();
    if (prior) {
      return NextResponse.json({ valid: false, error: "Você já usou este cupom" }, { status: 400 });
    }
  }

  return NextResponse.json({
    valid: true,
    coupon: {
      code: coupon.code,
      trial_extra_days: coupon.trial_extra_days ?? 0,
      discount_percent: Number(coupon.discount_percent ?? 0),
      discount_value: Number(coupon.discount_value ?? 0),
      valid_for_plan: coupon.valid_for_plan,
    },
  });
}
