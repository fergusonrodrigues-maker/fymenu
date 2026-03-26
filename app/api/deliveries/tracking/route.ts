import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST — Add a tracking point
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { delivery_id, lat, lng, status } = body;

    if (!delivery_id || lat === undefined || lng === undefined) {
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

    // Insert tracking point
    const { error: trackErr } = await supabase
      .from("delivery_tracking")
      .insert({ delivery_id, lat, lng });

    if (trackErr) throw trackErr;

    // Update delivery status if provided
    if (status && status !== delivery.status) {
      const updateData: any = { status };
      if (status === "delivered") updateData.delivered_at = new Date().toISOString();
      if (status === "in_transit") updateData.picked_up_at = new Date().toISOString();

      await supabase
        .from("deliveries")
        .update(updateData)
        .eq("id", delivery_id);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET — Get tracking info for an order
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("order_id");

  if (!orderId) {
    return NextResponse.json({ error: "order_id é obrigatório" }, { status: 400 });
  }

  try {
    const supabase = await createClient();

    const { data: delivery, error } = await supabase
      .from("deliveries")
      .select(`
        id, status, picked_up_at, delivered_at, estimated_minutes,
        employees!deliveries_deliverer_id_fkey(id, name, phone),
        delivery_tracking(lat, lng, recorded_at)
      `)
      .eq("order_intent_id", orderId)
      .order("recorded_at", { referencedTable: "delivery_tracking", ascending: false })
      .single();

    if (error || !delivery) {
      return NextResponse.json({ error: "Entrega não encontrada" }, { status: 404 });
    }

    const tracking = (delivery.delivery_tracking as any[]) ?? [];
    const latest = tracking[0] ?? null;

    return NextResponse.json({
      delivery: {
        id: delivery.id,
        status: delivery.status,
        picked_up_at: delivery.picked_up_at,
        delivered_at: delivery.delivered_at,
        estimated_minutes: delivery.estimated_minutes,
        deliverer: delivery.employees,
        current_location: latest ? { lat: latest.lat, lng: latest.lng } : null,
        tracking_points: tracking,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
