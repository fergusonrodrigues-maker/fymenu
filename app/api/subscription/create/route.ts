import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { asaasRequest, getOrCreateAsaasCustomer, PLAN_PRICES } from "@/lib/asaas";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { plan, cycle, billingType } = await req.json();

  if (!PLAN_PRICES[plan]?.[cycle]) {
    return NextResponse.json({ error: "Plano ou ciclo inválido" }, { status: 400 });
  }
  if (plan === "business" && billingType === "PIX") {
    return NextResponse.json({ error: "Plano Business aceita apenas cartão de crédito" }, { status: 400 });
  }
  if ((cycle === "QUARTERLY" || cycle === "SEMIANNUALLY") && billingType === "PIX") {
    return NextResponse.json({ error: "Ciclos trimestral e semestral aceitam apenas cartão" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: restaurant } = await admin
    .from("restaurants")
    .select("id, name, whatsapp, owner_document, owner_phone")
    .eq("owner_id", user.id)
    .single();

  if (!restaurant) return NextResponse.json({ error: "Restaurante não encontrado" }, { status: 404 });

  try {
    const customerId = await getOrCreateAsaasCustomer(restaurant);
    const value = PLAN_PRICES[plan][cycle] / 100;

    const subscriptionData: any = {
      customer: customerId,
      billingType: billingType === "PIX" ? "PIX" : "CREDIT_CARD",
      value,
      nextDueDate: new Date().toISOString().split("T")[0],
      cycle,
      description: `FyMenu ${plan.charAt(0).toUpperCase() + plan.slice(1)} - ${
        cycle === "MONTHLY" ? "Mensal" : cycle === "QUARTERLY" ? "Trimestral" : "Semestral"
      }`,
      externalReference: restaurant.id,
    };

    if (plan === "business") {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 7);
      subscriptionData.nextDueDate = trialEnd.toISOString().split("T")[0];
    }

    const asaasSub = await asaasRequest("POST", "/subscriptions", subscriptionData);

    await admin.from("subscriptions").insert({
      restaurant_id: restaurant.id,
      asaas_subscription_id: asaasSub.id,
      asaas_customer_id: customerId,
      plan,
      cycle,
      billing_type: billingType,
      value: PLAN_PRICES[plan][cycle],
      status: plan === "business" ? "active" : "pending",
      next_due_date: subscriptionData.nextDueDate,
      started_at: new Date().toISOString(),
    });

    await admin.from("restaurants")
      .update({ plan, status: plan === "business" ? "trial" : "active" })
      .eq("id", restaurant.id);

    if (plan === "business") {
      await admin.from("units").update({ payment_active: true }).eq("restaurant_id", restaurant.id);
    }

    const paymentsRes = await asaasRequest("GET", `/subscriptions/${asaasSub.id}/payments`);
    const firstPayment = paymentsRes.data?.[0];

    let paymentLink: string | null = null;
    let pixData: { qrCode: string; copyPaste: string } | null = null;

    if (firstPayment) {
      paymentLink = firstPayment.invoiceUrl;

      if (billingType === "PIX" && firstPayment.id) {
        try {
          const pixInfo = await asaasRequest("GET", `/payments/${firstPayment.id}/pixQrCode`);
          pixData = { qrCode: pixInfo.encodedImage, copyPaste: pixInfo.payload };
        } catch {}
      }

      await admin.from("subscription_payments").insert({
        asaas_payment_id: firstPayment.id,
        subscription_id: asaasSub.id,
        amount: Math.round(firstPayment.value * 100),
        status: firstPayment.status,
        billing_type: billingType,
        due_date: firstPayment.dueDate,
        invoice_url: firstPayment.invoiceUrl,
        pix_qr_code: pixData?.qrCode ?? null,
        pix_copy_paste: pixData?.copyPaste ?? null,
      });
    }

    return NextResponse.json({
      success: true,
      subscriptionId: asaasSub.id,
      paymentLink,
      pixData,
      plan,
      cycle,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
