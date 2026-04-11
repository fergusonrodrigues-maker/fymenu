import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { subscriptionConfirmedEmail } from "@/lib/email-templates";
import { PLAN_LABELS } from "@/lib/asaas";

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

        // Envia email de confirmação de assinatura
        try {
          const { data: subRecord } = await admin
            .from("subscriptions")
            .select("plan, value")
            .eq("asaas_subscription_id", asaasSubId)
            .single();

          const { data: restaurant } = await admin
            .from("restaurants")
            .select("name, owner_id")
            .eq("id", sub.restaurant_id)
            .single();

          if (restaurant) {
            const { data: profile } = await admin
              .from("profiles")
              .select("first_name")
              .eq("id", restaurant.owner_id)
              .maybeSingle();

            const { data: authUser } = await admin.auth.admin.getUserById(restaurant.owner_id);
            const email = authUser?.user?.email;

            if (email) {
              const planKey = subRecord?.plan ?? "menu";
              const planLabel = PLAN_LABELS[planKey] ?? planKey;
              const valueFormatted = subRecord?.value
                ? `R$ ${(subRecord.value / 100).toFixed(2).replace(".", ",")}`
                : "";
              const displayName = profile?.first_name || restaurant.name;
              const template = subscriptionConfirmedEmail(displayName, planLabel, valueFormatted);
              await sendEmail({ to: email, ...template });
            }
          }
        } catch (emailErr) {
          console.error("Failed to send subscription confirmed email:", emailErr);
        }
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
