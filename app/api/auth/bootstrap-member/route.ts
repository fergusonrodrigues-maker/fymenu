import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Cria restaurant_members owner pro user autenticado logo após o signup.
// Idempotente via SELECT-then-INSERT (a tabela não tem UNIQUE
// (restaurant_id, user_id), então .upsert(onConflict:...) falha).
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { restaurantId } = body as { restaurantId?: string };
    if (!restaurantId) {
      return NextResponse.json({ error: "missing_restaurant_id" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Só dono do restaurant pode bootstrappar o próprio member.
    const { data: restaurant } = await admin
      .from("restaurants")
      .select("id, owner_id")
      .eq("id", restaurantId)
      .single();

    if (!restaurant) {
      return NextResponse.json({ error: "restaurant_not_found" }, { status: 404 });
    }

    if (restaurant.owner_id !== user.id) {
      return NextResponse.json({ error: "not_owner" }, { status: 403 });
    }

    const { data: existing } = await admin
      .from("restaurant_members")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ ok: true, already: true });
    }

    const { error: insertError } = await admin
      .from("restaurant_members")
      .insert({
        restaurant_id: restaurantId,
        user_id: user.id,
        role: "owner",
        status: "active",
        invited_email: user.email ?? "",
        activated_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("[bootstrap-member] insert failed", insertError);
      return NextResponse.json(
        { error: "insert_failed", detail: insertError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[bootstrap-member] exception", e);
    return NextResponse.json(
      { error: "internal_error", detail: e?.message },
      { status: 500 },
    );
  }
}
