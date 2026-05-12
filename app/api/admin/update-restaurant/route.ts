import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const {
    restaurantId,
    plan,
    status,
    free_access,
    trial_ends_at,
    is_complimentary,
    complimentary_reason,
  } = body;

  const admin = createAdminClient();
  const updates: Record<string, unknown> = {};

  if (plan !== undefined) updates.plan = plan;
  if (status !== undefined) updates.status = status;
  if (trial_ends_at !== undefined) updates.trial_ends_at = trial_ends_at;
  if (free_access !== undefined) {
    updates.free_access = free_access;
    if (free_access) updates.status = "active";
  }
  if (is_complimentary !== undefined) {
    updates.is_complimentary = !!is_complimentary;
    if (is_complimentary) {
      updates.complimentary_reason = complimentary_reason ?? null;
      updates.complimentary_granted_at = new Date().toISOString();
      updates.complimentary_granted_by = user.id;
      updates.status = "active";
      updates.trial_ends_at = null;
    }
  }

  const { error } = await admin
    .from("restaurants")
    .update(updates)
    .eq("id", restaurantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Sync units when free_access or is_complimentary changes
  const accessFlag = free_access ?? is_complimentary;
  if (free_access !== undefined || is_complimentary !== undefined) {
    if (accessFlag) {
      await admin
        .from("units")
        .update({ payment_active: true, is_published: true })
        .eq("restaurant_id", restaurantId);
    } else {
      const [{ data: restaurantRow }, { data: activeSub }] = await Promise.all([
        admin
          .from("restaurants")
          .select("free_access, is_complimentary")
          .eq("id", restaurantId)
          .single(),
        admin
          .from("subscriptions")
          .select("id")
          .eq("restaurant_id", restaurantId)
          .eq("status", "active")
          .limit(1)
          .maybeSingle(),
      ]);

      const stillFree = restaurantRow?.free_access || restaurantRow?.is_complimentary;
      if (!activeSub && !stillFree) {
        await admin
          .from("units")
          .update({ payment_active: false, is_published: false })
          .eq("restaurant_id", restaurantId);
      }
    }
  }

  return NextResponse.json({ success: true });
}
