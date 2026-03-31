import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const { code, restaurant_id } = await req.json();
  if (!code || !restaurant_id) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: coupon } = await admin
    .from("partner_coupons")
    .select("*, partners(commission_percent)")
    .ilike("code", code.trim())
    .eq("is_active", true)
    .maybeSingle();

  if (!coupon) return NextResponse.json({ error: "Cupom inválido" }, { status: 400 });
  if (coupon.expires_at && coupon.expires_at < now) {
    return NextResponse.json({ error: "Cupom expirado" }, { status: 400 });
  }
  if (coupon.max_uses !== null && coupon.current_uses >= coupon.max_uses) {
    return NextResponse.json({ error: "Cupom esgotado" }, { status: 400 });
  }

  // Increment uses
  await admin
    .from("partner_coupons")
    .update({ current_uses: coupon.current_uses + 1 })
    .eq("id", coupon.id);

  // Create referral
  const partnerCommission = (coupon.partners as { commission_percent: number } | null)?.commission_percent ?? 0;
  await admin.from("partner_referrals").insert({
    partner_id: coupon.partner_id,
    restaurant_id,
    coupon_id: coupon.id,
    coupon_code: coupon.code,
    commission_percent: partnerCommission,
    status: "active",
  });

  // Apply trial days if applicable
  if (coupon.discount_type === "trial_days" && coupon.trial_extra_days > 0) {
    const trialEnd = new Date(Date.now() + coupon.trial_extra_days * 86400000).toISOString();
    await admin
      .from("restaurants")
      .update({ trial_ends_at: trialEnd, status: "trial" })
      .eq("id", restaurant_id);
  }

  return NextResponse.json({ success: true });
}
