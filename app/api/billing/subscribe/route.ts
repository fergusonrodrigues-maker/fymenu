import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { asaasRequest } from "@/lib/asaas";

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

  const { data: restaurant } = await admin
    .from("restaurants")
    .select("id, name, whatsapp, owner_document, owner_phone, asaas_customer_id")
    .eq("owner_id", user.id)
    .single();

  if (!restaurant) return NextResponse.json({ error: "Restaurante não encontrado" }, { status: 404 });

  try {
    // ── Get or create Asaas customer ────────────────────────────────────────
    let customerId: string = restaurant.asaas_customer_id || "";

    if (!customerId) {
      const customer = await asaasRequest("POST", "/customers", {
        name: restaurant.name,
        cpfCnpj: restaurant.owner_document || undefined,
        phone: (restaurant.whatsapp || restaurant.owner_phone || "").replace(/\D/g, "") || undefined,
        externalReference: restaurant.id,
      });
      customerId = customer.id;
      await admin.from("restaurants")
        .update({ asaas_customer_id: customerId })
        .eq("id", restaurant.id);
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

    const dbRow: Record<string, unknown> = {
      restaurant_id: restaurant.id,
      asaas_payment_id: payment.id,
      asaas_customer_id: customerId,
      plan: planId,
      cycle,
      amount,
      payment_method: paymentMethod,
      status: payment.status || "PENDING",
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
        dbRow.pix_qr_code = pixQrCode;
        dbRow.pix_payload = pixPayload;
        dbRow.pix_expiration = expirationDate ? new Date(expirationDate).toISOString() : null;
      } catch (e) {
        console.warn("[billing/subscribe] PIX QR fetch failed:", e);
      }

      await admin.from("payments").insert(dbRow);

      return NextResponse.json({
        success: true,
        paymentId: payment.id,
        pixQrCode,
        pixPayload,
        expirationDate,
      });
    }

    // ── Credit Card ──────────────────────────────────────────────────────────
    await admin.from("payments").insert(dbRow);

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
    return NextResponse.json({ error: err.message || "Erro ao processar pagamento" }, { status: 500 });
  }
}
