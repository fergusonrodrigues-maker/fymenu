import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const admin = createAdminClient();

  if (body.action === "add_partner") {
    const { data, error } = await admin
      .from("partners")
      .insert({
        name: body.name,
        email: body.email,
        phone: body.phone || null,
        document: body.document || null,
        commission_percent: body.commission_percent ?? 10,
        is_photographer: body.is_photographer ?? false,
        notes: body.notes || null,
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ partner: data });
  }

  if (body.action === "update_partner") {
    const { id, action: _action, ...updates } = body;
    const { error } = await admin.from("partners").update(updates).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (body.action === "delete_partner") {
    const { error } = await admin.from("partners").delete().eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (body.action === "add_coupon") {
    const { data, error } = await admin
      .from("partner_coupons")
      .insert({
        partner_id: body.partner_id,
        code: body.code,
        discount_type: body.discount_type,
        discount_percent: body.discount_type === "percent" ? (body.discount_value ?? 0) : 0,
        discount_value: body.discount_value ?? 0,
        trial_extra_days: body.trial_extra_days ?? 0,
        max_uses: body.max_uses || null,
        expires_at: body.expires_at || null,
      })
      .select("*, partners(name)")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ coupon: data });
  }

  if (body.action === "update_coupon") {
    const { id, action: _action, ...updates } = body;
    const { error } = await admin.from("partner_coupons").update(updates).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (body.action === "delete_coupon") {
    const { error } = await admin.from("partner_coupons").delete().eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (body.action === "add_payout") {
    const { data, error } = await admin
      .from("partner_payouts")
      .insert({
        partner_id: body.partner_id,
        amount: body.amount,
        period_start: body.period_start,
        period_end: body.period_end,
        status: "pending",
        payment_method: body.payment_method || null,
        notes: body.notes || null,
      })
      .select("*, partners(name)")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ payout: data });
  }

  if (body.action === "mark_paid") {
    const { error } = await admin
      .from("partner_payouts")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (body.action === "delete_payout") {
    const { error } = await admin.from("partner_payouts").delete().eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
