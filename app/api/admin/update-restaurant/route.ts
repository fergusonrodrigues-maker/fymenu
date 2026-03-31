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
  const { restaurantId, plan, status, free_access } = body;

  const admin = createAdminClient();
  const updates: Record<string, unknown> = {};

  if (plan !== undefined) updates.plan = plan;
  if (status !== undefined) updates.status = status;
  if (free_access !== undefined) {
    updates.free_access = free_access;
    if (free_access) updates.status = "active";
  }

  const { error } = await admin
    .from("restaurants")
    .update(updates)
    .eq("id", restaurantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
