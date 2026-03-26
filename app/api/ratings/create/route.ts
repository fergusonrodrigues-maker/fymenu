import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Support both camelCase (doc spec) and snake_case
    const order_id = body.order_id ?? body.orderId;
    const employee_id = body.employee_id ?? body.employeeId;
    const { rating, comment } = body;
    const rated_by = body.rated_by ?? body.ratedBy ?? "Cliente Anônimo";

    if (!order_id || !employee_id || !rating) {
      return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Avaliação deve ser entre 1 e 5" }, { status: 400 });
    }

    const supabase = await createClient();

    // Get employee's unit_id
    const { data: employee, error: empErr } = await supabase
      .from("employees")
      .select("id, unit_id")
      .eq("id", employee_id)
      .single();

    if (empErr || !employee) {
      return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 });
    }

    // Check for duplicate rating on same order+employee
    const { data: existing } = await supabase
      .from("employee_ratings")
      .select("id")
      .eq("order_id", order_id)
      .eq("employee_id", employee_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Pedido já foi avaliado" }, { status: 409 });
    }

    const { data, error } = await supabase
      .from("employee_ratings")
      .insert({
        order_id,
        employee_id,
        unit_id: employee.unit_id,
        rating,
        comment: comment || null,
        rated_by,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Avaliação registrada com sucesso!", rating: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
