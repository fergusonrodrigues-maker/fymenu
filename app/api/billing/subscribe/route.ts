import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { asaasRequest, AsaasError } from "@/lib/asaas";

// ── [DEBUG] log Asaas config on module load ──────────────────────────────────
const _asaasBase = process.env.ASAAS_SANDBOX === "true"
  ? "https://sandbox.asaas.com/api/v3"
  : "https://api.asaas.com/v3";
const _keyPrefix = process.env.ASAAS_API_KEY?.substring(0, 10) ?? "MISSING";
console.log(`[billing/subscribe] ASAAS_BASE=${_asaasBase} ASAAS_KEY_PREFIX=${_keyPrefix} SANDBOX=${process.env.ASAAS_SANDBOX}`);

const PRICES: Record<string, Record<string, number>> = {
  menu:     { monthly: 19990,  quarterly: 53970,  semiannual: 95940 },
  menupro:  { monthly: 39990,  quarterly: 107970, semiannual: 191940 },
  business: { monthly: 159900, quarterly: 419700, semiannual: 719400 },
};

const PLAN_LABELS:  Record<string, string> = { menu: "Menu", menupro: "MenuPro", business: "Business" };
const CYCLE_LABELS: Record<string, string> = { monthly: "Mensal", quarterly: "Trimestral", semiannual: "Semestral" };

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { planId, cycle, paymentMethod, creditCard, creditCardHolderInfo } = await req.json();

  const amount = PRICES[planId]?.[cycle];
  if (!amount) return NextResponse.json({ error: "Plano ou ciclo inválido" }, { status: 400 });
  if (!["PIX", "CREDIT_CARD"].includes(paymentMethod)) {
    return NextResponse.json({ error: "Método de pagamento inválido" }, { status: 400 });
  }

  const admin = createAdminClient();

  // ── Lookup restaurant by owner_id ────────────────────────────────────────
  const { data: restaurant } = await admin
    .from("restaurants")
    .select("id, name, whatsapp, owner_document, owner_phone")
    .eq("owner_id", user.id)
    .single();

  if (!restaurant) return NextResponse.json({ error: "Restaurante não encontrado" }, { status: 404 });

  try {
    // ── Get existing customer ID from subscriptions table ────────────────
    const { data: existingSub } = await admin
      .from("subscriptions")
      .select("asaas_customer_id")
      .eq("restaurant_id", restaurant.id)
      .not("asaas_customer_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let customerId: string = existingSub?.asaas_customer_id || "";

    // ── Get or create Asaas customer ────────────────────────────────────────
    if (!customerId) {
      const customer = await asaasRequest("POST", "/customers", {
        name: restaurant.name,
        cpfCnpj: restaurant.owner_document || undefined,
        phone: (restaurant.whatsapp || restaurant.owner_phone || "").replace(/\D/g, "") || undefined,
        externalReference: restaurant.id,
      });
      customerId = customer.id;
    }

    const dueDateStr = new Date(Date.now() + 86_400_000).toISOString().split("T")[0]; // tomorrow

    const paymentBody: Record<string, unknown> = {
      customer: customerId,
      billingType: paymentMethod,
      value: amount / 100,
      dueDate: dueDateStr,
      description: `FyMenu ${PLAN_LABELS[planId]} - ${CYCLE_LABELS[cycle]}`,
      externalReference: restaurant.id,
    };

    if (paymentMethod === "CREDIT_CARD") {
      if (!creditCard) return NextResponse.json({ error: "Dados do cartão são obrigatórios" }, { status: 400 });
      const [expiryMonth, expiryRaw] = (creditCard.expiry || `${creditCard.expiryMonth}/${creditCard.expiryYear}`).split("/");
      const expiryYear = expiryRaw?.length === 2 ? `20${expiryRaw}` : expiryRaw;

      paymentBody.creditCard = {
        holderName: creditCard.holderName,
        number: String(creditCard.number).replace(/\s/g, ""),
        expiryMonth: expiryMonth?.trim(),
        expiryYear: expiryYear?.trim(),
        ccv: creditCard.ccv,
      };
      if (creditCardHolderInfo) {
        paymentBody.creditCardHolderInfo = {
          name: creditCardHolderInfo.name,
          email: creditCardHolderInfo.email,
          cpfCnpj: String(creditCardHolderInfo.cpfCnpj || "").replace(/\D/g, ""),
          postalCode: String(creditCardHolderInfo.postalCode || "").replace(/\D/g, ""),
          addressNumber: creditCardHolderInfo.addressNumber || "S/N",
          phone: String(creditCardHolderInfo.phone || "").replace(/\D/g, ""),
        };
      }
    }

    // ── Create payment in Asaas ──────────────────────────────────────────────
    const payment = await asaasRequest("POST", "/payments", paymentBody);

    const subRow: Record<string, unknown> = {
      restaurant_id: restaurant.id,
      asaas_subscription_id: payment.id,
      asaas_customer_id: customerId,
      plan: planId,
      cycle,
      billing_type: paymentMethod,
      value: amount,
      status: payment.status || "PENDING",
      next_due_date: dueDateStr,
      started_at: new Date().toISOString(),
    };

    // ── PIX ──────────────────────────────────────────────────────────────────
    if (paymentMethod === "PIX") {
      let pixQrCode = "";
      let pixPayload = "";
      let expirationDate: string | null = null;

      try {
        const pixData = await asaasRequest("GET", `/payments/${payment.id}/pixQrCode`);
        pixQrCode = pixData.encodedImage || "";
        pixPayload = pixData.payload || "";
        expirationDate = pixData.expirationDate || null;
      } catch (e) {
        console.warn("[billing/subscribe] PIX QR fetch failed:", e);
      }

      await admin.from("subscriptions").insert(subRow);

      return NextResponse.json({
        success: true,
        paymentId: payment.id,
        pixQrCode,
        pixPayload,
        expirationDate,
      });
    }

    // ── Credit Card ──────────────────────────────────────────────────────────
    await admin.from("subscriptions").insert(subRow);

    if (payment.status === "CONFIRMED" || payment.status === "RECEIVED") {
      await admin.from("restaurants")
        .update({ plan: planId, status: planId === "business" ? "trial" : "active" })
        .eq("id", restaurant.id);
    }

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      status: payment.status,
    });

  } catch (err: any) {
    console.error("[billing/subscribe]", err);

    if (err instanceof AsaasError) {
      return NextResponse.json({
        error: err.message || "Erro no gateway de pagamento",
        // [DEBUG] remover após resolver
        debug: {
          rawText: err.rawText,
          httpStatus: err.httpStatus,
          asaasUrl: err.asaasUrl,
          responseHeaders: err.responseHeaders,
          envBase: _asaasBase,
          envKeyPrefix: _keyPrefix,
          envSandbox: process.env.ASAAS_SANDBOX,
        },
      }, { status: 502 });
    }

    return NextResponse.json({ error: err.message || "Erro ao processar pagamento" }, { status: 500 });
  }
}
