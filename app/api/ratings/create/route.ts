import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { order_intent_id, employee_id, rating, comment } = body;

    if (!order_intent_id || !employee_id || !rating) {
      return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Avaliação deve ser entre 1 e 5" }, { status: 400 });
    }

    const supabase = await createClient();

    // Verify the order_intent exists
    const { data: order, error: orderErr } = await supabase
      .from("order_intents")
      .select("id, unit_id")
      .eq("id", order_intent_id)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
    }

    // Check for duplicate rating
    const { data: existing } = await supabase
      .from("employee_ratings")
      .select("id")
      .eq("order_intent_id", order_intent_id)
      .eq("employee_id", employee_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Pedido já foi avaliado" }, { status: 409 });
    }

    const { data, error } = await supabase
      .from("employee_ratings")
      .insert({
        order_intent_id,
        employee_id,
        rating,
        comment: comment || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, rating: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
