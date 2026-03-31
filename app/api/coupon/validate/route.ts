import { NextRequest, NextResponse } from "next/server";
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
