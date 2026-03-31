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

  if (body.action === "add_session") {
    const pkg = body.package_id
      ? await admin.from("photo_session_packages").select("price").eq("id", body.package_id).single()
      : null;
    const { data, error } = await admin
      .from("photo_sessions")
      .insert({
        restaurant_id: body.restaurant_id,
        package_id: body.package_id,
        city_id: body.city_id,
        scheduled_at: body.scheduled_at || null,
        photographer_name: body.photographer_name || null,
        notes: body.notes || null,
        price_charged: pkg?.data?.price ?? 0,
      })
      .select("*, photo_session_packages(name), photo_session_cities(city, state)")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ session: data });
  }

  if (body.action === "update_session") {
    const { id, action: _action, ...updates } = body;
    if (updates.status === "completed") updates.completed_at = new Date().toISOString();
    const { error } = await admin.from("photo_sessions").update(updates).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (body.action === "delete_session") {
    const { error } = await admin.from("photo_sessions").delete().eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (body.action === "add_package") {
    const { data, error } = await admin
      .from("photo_session_packages")
      .insert({
        name: body.name,
        description: body.description,
        num_photos: body.num_photos,
        includes_video: body.includes_video,
        price: body.price,
        duration_minutes: body.duration_minutes,
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ package: data });
  }

  if (body.action === "update_package") {
    const { id, action: _action, ...updates } = body;
    const { error } = await admin.from("photo_session_packages").update(updates).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (body.action === "delete_package") {
    const { error } = await admin.from("photo_session_packages").delete().eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (body.action === "add_city") {
    const { data, error } = await admin
      .from("photo_session_cities")
      .insert({ city: body.city, state: body.state })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ city: data });
  }

  if (body.action === "toggle_city") {
    const { error } = await admin
      .from("photo_session_cities")
      .update({ is_active: body.is_active })
      .eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (body.action === "delete_city") {
    const { error } = await admin.from("photo_session_cities").delete().eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
