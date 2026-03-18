import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { unit_id, table_number, notes, items } = body;

    if (!unit_id || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const supabase = await createClient();

    // Verificar que a unidade existe e está publicada
    const { data: unit, error: unitErr } = await supabase
      .from("units")
      .select("id, restaurant_id")
      .eq("id", unit_id)
      .eq("is_published", true)
      .single();

    if (unitErr || !unit) {
      return NextResponse.json({ error: "Unidade não encontrada" }, { status: 404 });
    }

    // Calcular total
    const total = items.reduce(
      (sum: number, item: { qty: number; unit_price: number }) =>
        sum + item.qty * item.unit_price,
      0
    );

    const { data: order, error: insertErr } = await supabase
      .from("order_intents")
      .insert({
        restaurant_id: unit.restaurant_id,
        unit_id,
        items,
        subtotal: total,
        discount: 0,
        total,
        status: "draft",
        waiter_status: "pending",
        table_number: table_number ?? null,
        notes: notes ?? null,
        kitchen_status: "waiting",
      })
      .select("id, table_number, total, created_at")
      .single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, order }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
