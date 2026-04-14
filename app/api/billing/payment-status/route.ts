import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { asaasRequest } from "@/lib/asaas";

const CONFIRMED = new Set(["CONFIRMED", "RECEIVED"]);

export async function GET(req: NextRequest) {
  const paymentId = req.nextUrl.searchParams.get("paymentId");
  if (!paymentId) return NextResponse.json({ error: "paymentId obrigatório" }, { status: 400 });

  try {
    const payment = await asaasRequest("GET", `/payments/${paymentId}`);
    const status: string = payment.status ?? "PENDING";

    const admin = createAdminClient();

    await admin.from("payments")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("asaas_payment_id", paymentId);

    if (CONFIRMED.has(status)) {
      const { data: row } = await admin
        .from("payments")
        .select("restaurant_id, plan")
        .eq("asaas_payment_id", paymentId)
        .single();

      if (row) {
        await admin.from("restaurants")
          .update({ plan: row.plan, status: row.plan === "business" ? "trial" : "active" })
          .eq("id", row.restaurant_id);
      }
    }

    return NextResponse.json({ status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
