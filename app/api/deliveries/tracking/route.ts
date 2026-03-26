import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST — Add a GPS tracking point
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Support both camelCase and snake_case
    const delivery_id = body.delivery_id ?? body.deliveryId;
    const latitude = body.latitude ?? body.lat;
    const longitude = body.longitude ?? body.lng;
    const accuracy = body.accuracy_meters ?? body.accuracy;
    const status = body.status;

    if (!delivery_id || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
    }

    const supabase = await createClient();

    // Verify delivery exists
    const { data: delivery, error: deliveryErr } = await supabase
      .from("deliveries")
      .select("id, status")
      .eq("id", delivery_id)
      .single();

    if (deliveryErr || !delivery) {
      return NextResponse.json({ error: "Entrega não encontrada" }, { status: 404 });
    }

    // Insert tracking point (column names match DB: latitude, longitude, accuracy_meters, timestamp)
    const { error: trackErr } = await supabase
      .from("delivery_tracking")
      .insert({ delivery_id, latitude, longitude, accuracy_meters: accuracy ?? null });

    if (trackErr) throw trackErr;

    // Auto-transition to in_route on first GPS ping
    if (delivery.status === "pending") {
      await supabase
        .from("deliveries")
        .update({ status: "in_route", pickup_time: new Date().toISOString() })
        .eq("id", delivery_id);
    }

    // Handle explicit status transitions
    if (status && status !== delivery.status) {
      const updateData: any = { status };
      if (status === "delivered") updateData.delivery_time = new Date().toISOString();
      await supabase.from("deliveries").update(updateData).eq("id", delivery_id);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET — Get tracking info for an order
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  // Support both order_id (by order_intent) and delivery_id (direct)
  const order_id = searchParams.get("order_id");
  const delivery_id = searchParams.get("deliveryId") ?? searchParams.get("delivery_id");

  if (!order_id && !delivery_id) {
    return NextResponse.json({ error: "order_id ou delivery_id é obrigatório" }, { status: 400 });
  }

  try {
    const supabase = await createClient();

    let query = supabase
      .from("deliveries")
      .select(`
        id, status, pickup_time, delivery_time, duration_minutes, distance_km,
        employees!deliveries_employee_id_fkey(id, name, phone),
        delivery_tracking(latitude, longitude, accuracy_meters, timestamp)
      `)
      .order("timestamp", { referencedTable: "delivery_tracking", ascending: false });

    if (delivery_id) {
      query = query.eq("id", delivery_id);
    } else {
      // Find delivery by matching against order_intents
      // deliveries.order_id references the order
      query = query.eq("order_id", order_id!);
    }

    const { data: delivery, error } = await query.maybeSingle();

    if (error || !delivery) {
      return NextResponse.json({ error: "Entrega não encontrada" }, { status: 404 });
    }

    const tracking = (delivery.delivery_tracking as any[]) ?? [];
    const latest = tracking[0] ?? null;

    return NextResponse.json({
      delivery: {
        id: delivery.id,
        status: delivery.status,
        picked_up_at: delivery.pickup_time,
        delivered_at: delivery.delivery_time,
        estimated_minutes: delivery.duration_minutes,
        duration_minutes: delivery.duration_minutes,
        distance_km: delivery.distance_km,
        deliverer: delivery.employees,
        current_location: latest ? { lat: latest.latitude, lng: latest.longitude } : null,
        tracking_points: tracking.map((t: any) => ({
          lat: t.latitude,
          lng: t.longitude,
          accuracy: t.accuracy_meters,
          recorded_at: t.timestamp,
        })),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
