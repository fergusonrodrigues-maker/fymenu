import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  asaasRequest,
  getOrCreateAsaasCustomer,
  PLAN_PRICES,
} from "@/lib/asaas";

// Map lowercase client cycle → Asaas uppercase cycle
const CYCLE_MAP: Record<string, string> = {
  monthly: "MONTHLY",
  quarterly: "QUARTERLY",
  semiannual: "SEMIANNUALLY",
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { restaurantId, plan, cycle } = await req.json();

  const validPlans = ["menupro", "business"];
  const validCycles = ["monthly", "quarterly", "semiannual"];

  if (!validPlans.includes(plan) || !validCycles.includes(cycle)) {
    return NextResponse.json(
      { error: "Plano ou ciclo inválido" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: restaurant } = await admin
    .from("restaurants")
    .select("id, name, whatsapp, instagram, owner_document, owner_phone")
    .eq("id", restaurantId)
    .eq("owner_id", user.id)
    .single();

  if (!restaurant) {
    return NextResponse.json(
      { error: "Restaurante não encontrado" },
      { status: 404 }
    );
  }

  const isSandbox = process.env.ASAAS_SANDBOX === "true";

  // Garante que existe uma unit de preview
  async function ensureUnit() {
    const { data: existingUnits } = await admin
      .from("units")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .limit(1);

    if (!existingUnits || existingUnits.length === 0) {
      const slug = `preview-${restaurantId.slice(0, 8)}`;
      await admin.from("units").insert({
        restaurant_id: restaurantId,
        name: restaurant!.name,
        slug,
        whatsapp: restaurant!.whatsapp,
        instagram: restaurant!.instagram,
        is_published: false,
      });
    }
  }

  if (isSandbox) {
    // Sandbox: ativa direto sem pagamento
    const isBusinessTrial = plan === "business";
    await ensureUnit();
    await admin
      .from("restaurants")
      .update({
        plan,
        status: isBusinessTrial ? "trial" : "active",
        onboarding_completed: true,
      })
      .eq("id", restaurantId);

    return NextResponse.json({ success: true });
  }

  // Produção: gerar assinatura no Asaas
  try {
    const asaasCycle = CYCLE_MAP[cycle];
    const customerId = await getOrCreateAsaasCustomer(restaurant);
    const value = PLAN_PRICES[plan][asaasCycle] / 100;

    const subscriptionData: Record<string, unknown> = {
      customer: customerId,
      billingType: "CREDIT_CARD",
      value,
      nextDueDate: new Date().toISOString().split("T")[0],
      cycle: asaasCycle,
      description: `FyMenu ${plan === "menupro" ? "MenuPro" : "Business"}`,
      externalReference: restaurantId,
    };

    if (plan === "business") {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 7);
      subscriptionData.nextDueDate = trialEnd.toISOString().split("T")[0];
    }

    const asaasSub = await asaasRequest("POST", "/subscriptions", subscriptionData);

    await admin.from("subscriptions").insert({
      restaurant_id: restaurantId,
      asaas_subscription_id: asaasSub.id,
      asaas_customer_id: customerId,
      plan,
      cycle: asaasCycle,
      billing_type: "CREDIT_CARD",
      value: PLAN_PRICES[plan][asaasCycle],
      status: plan === "business" ? "active" : "pending",
      next_due_date: subscriptionData.nextDueDate,
      started_at: new Date().toISOString(),
    });

    await admin
      .from("restaurants")
      .update({
        plan,
        status: plan === "business" ? "trial" : "active",
        onboarding_completed: true,
      })
      .eq("id", restaurantId);

    if (plan === "business") {
      await admin
        .from("units")
        .update({ payment_active: true })
        .eq("restaurant_id", restaurantId);
    }

    const paymentsRes = await asaasRequest(
      "GET",
      `/subscriptions/${asaasSub.id}/payments`
    );
    const firstPayment = paymentsRes.data?.[0];
    const checkoutUrl: string | null = firstPayment?.invoiceUrl ?? null;

    return NextResponse.json({ success: true, checkoutUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
