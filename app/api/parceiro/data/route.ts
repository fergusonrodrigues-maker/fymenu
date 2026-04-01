import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: partner } = await admin
    .from("partners")
    .select("id, name, email, commission_percent, is_photographer, is_active, total_earned, total_paid, created_at")
    .eq("current_token", token)
    .eq("is_active", true)
    .single();

  if (!partner) return NextResponse.json({ error: "Token inválido" }, { status: 401 });

  const [referrals, coupons, payouts] = await Promise.all([
    admin
      .from("partner_referrals")
      .select("id, restaurant_id, coupon_code, commission_percent, status, created_at, restaurants(name, plan, status)")
      .eq("partner_id", partner.id)
      .order("created_at", { ascending: false }),
    admin
      .from("partner_coupons")
      .select("id, code, discount_type, discount_value, discount_percent, trial_extra_days, current_uses, max_uses, is_active, expires_at")
      .eq("partner_id", partner.id),
    admin
      .from("partner_payouts")
      .select("id, amount, period_start, period_end, status, payment_method, paid_at")
      .eq("partner_id", partner.id)
      .order("created_at", { ascending: false }),
  ]);

  let photoSessions: any[] = [];
  if (partner.is_photographer) {
    const { data } = await admin
      .from("photo_sessions")
      .select("id, status, scheduled_at, completed_at, price_charged, payment_status, photos_delivered, photo_session_packages(name), photo_session_cities(city, state), restaurants(name)")
      .eq("partner_id", partner.id);
    photoSessions = data ?? [];
  }

  return NextResponse.json({
    partner,
    referrals: referrals.data ?? [],
    coupons: coupons.data ?? [],
    payouts: payouts.data ?? [],
    photoSessions,
  });
}
