import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const token =
    req.headers.get("asaas-access-token") ||
    req.nextUrl.searchParams.get("token");

  if (token !== process.env.ASAAS_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const body = await req.json();
  const { event, payment } = body;
  const admin = createAdminClient();

  if (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") {
    const asaasSubId = payment?.subscription;
    if (asaasSubId) {
      await admin.from("subscriptions")
        .update({ status: "active" })
        .eq("asaas_subscription_id", asaasSubId);

      const { data: sub } = await admin
        .from("subscriptions")
        .select("restaurant_id")
        .eq("asaas_subscription_id", asaasSubId)
        .single();

      if (sub) {
        await admin.from("restaurants")
          .update({ status: "active" })
          .eq("id", sub.restaurant_id);

        await admin.from("units")
          .update({ payment_active: true, is_published: true })
          .eq("restaurant_id", sub.restaurant_id);
      }

      await admin.from("subscription_payments").upsert(
        {
          asaas_payment_id: payment.id,
          subscription_id: asaasSubId,
          amount: Math.round((payment.value ?? 0) * 100),
          status: "paid",
          billing_type: payment.billingType,
          due_date: payment.dueDate,
          paid_at: new Date().toISOString(),
          invoice_url: payment.invoiceUrl ?? null,
        },
        { onConflict: "asaas_payment_id" }
      );
    }
  }

  if (event === "PAYMENT_OVERDUE") {
    const asaasSubId = payment?.subscription;
    if (asaasSubId) {
      await admin.from("subscriptions")
        .update({ status: "overdue" })
        .eq("asaas_subscription_id", asaasSubId);
    }
  }

  if (event === "SUBSCRIPTION_INACTIVATED" || event === "SUBSCRIPTION_DELETED") {
    const subId = body.subscription?.id ?? body.id;
    if (subId) {
      const { data: sub } = await admin
        .from("subscriptions")
        .select("restaurant_id")
        .eq("asaas_subscription_id", subId)
        .single();

      if (sub) {
        await admin.from("subscriptions")
          .update({ status: "canceled", canceled_at: new Date().toISOString() })
          .eq("asaas_subscription_id", subId);

        await admin.from("restaurants")
          .update({ status: "canceled" })
          .eq("id", sub.restaurant_id);

        await admin.from("units")
          .update({ payment_active: false, is_published: false })
          .eq("restaurant_id", sub.restaurant_id);
      }
    }
  }

  return NextResponse.json({ received: true });
}
