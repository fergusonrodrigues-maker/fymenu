import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { asaasRequest, AsaasError, getOrCreateAsaasCustomer } from "@/lib/asaas";
import {
  PLANS,
  ASAAS_CYCLE,
  getTotalCents,
  type BillingCycle,
  type PlanCode,
} from "@/lib/plans";

function toCanonicalCycle(c: unknown): BillingCycle | null {
  if (c === "monthly") return "monthly";
  if (c === "quarterly") return "quarterly";
  if (c === "semestral" || c === "semiannual") return "semestral";
  return null;
}

function isPlanCode(p: unknown): p is PlanCode {
  return p === "menu" || p === "menupro" || p === "business";
}

type ValidatedCoupon = {
  id: string;
  code: string;
  trial_extra_days: number;
  discount_percent: number;
  discount_value: number;
  valid_for_plan: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const plan = body?.plan;
    const cycle = toCanonicalCycle(body?.cycle);
    const couponCodeRaw = typeof body?.coupon_code === "string" ? body.coupon_code.trim().toUpperCase() : "";

    if (!isPlanCode(plan)) {
      return NextResponse.json({ error: "Plano inválido" }, { status: 400 });
    }
    if (!cycle) {
      return NextResponse.json({ error: "Ciclo inválido" }, { status: 400 });
    }

    const planDef = PLANS[plan];
    const baseValueCents = getTotalCents(plan, cycle);
    if (!baseValueCents) {
      return NextResponse.json(
        { error: "Combinação plano/ciclo inválida" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data: restaurant } = await admin
      .from("restaurants")
      .select("id, name, whatsapp, owner_document, owner_phone, asaas_customer_id, is_complimentary")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurante não encontrado" },
        { status: 404 }
      );
    }

    // ── Path B: Permanent courtesy — skip Asaas entirely ────────────────────
    if (restaurant.is_complimentary) {
      await admin
        .from("restaurants")
        .update({
          plan,
          status: "active",
          trial_ends_at: null,
          onboarding_completed: true,
        })
        .eq("id", restaurant.id);

      return NextResponse.json({
        ok: true,
        complimentary: true,
        message: "Plano ativado como cortesia",
      });
    }

    // ── Path A: optional admin coupon redemption ────────────────────────────
    let coupon: ValidatedCoupon | null = null;
    if (couponCodeRaw) {
      const { data: c } = await admin
        .from("partner_coupons")
        .select("id, code, is_active, expires_at, max_uses, current_uses, trial_extra_days, discount_percent, discount_value, valid_for_plan")
        .ilike("code", couponCodeRaw)
        .maybeSingle();

      if (!c) return NextResponse.json({ error: "Cupom inválido" }, { status: 400 });
      if (!c.is_active) return NextResponse.json({ error: "Cupom desativado" }, { status: 400 });
      if (c.expires_at && new Date(c.expires_at) < new Date()) {
        return NextResponse.json({ error: "Cupom expirado" }, { status: 400 });
      }
      if (c.max_uses != null && c.current_uses >= c.max_uses) {
        return NextResponse.json({ error: "Cupom esgotado" }, { status: 400 });
      }
      if (c.valid_for_plan && c.valid_for_plan !== plan) {
        return NextResponse.json(
          { error: `Este cupom é válido apenas para o plano ${c.valid_for_plan}` },
          { status: 400 }
        );
      }

      // Block coupon use if restaurant already has an active subscription.
      const { data: activeSub } = await admin
        .from("subscriptions")
        .select("id")
        .eq("restaurant_id", restaurant.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      if (activeSub) {
        return NextResponse.json(
          { error: "Cupom não pode ser aplicado: já existe assinatura ativa" },
          { status: 400 }
        );
      }

      const { data: prior } = await admin
        .from("coupon_redemptions")
        .select("id")
        .eq("coupon_id", c.id)
        .eq("restaurant_id", restaurant.id)
        .maybeSingle();
      if (prior) {
        return NextResponse.json({ error: "Você já usou este cupom" }, { status: 400 });
      }

      coupon = {
        id: c.id,
        code: c.code,
        trial_extra_days: c.trial_extra_days ?? 0,
        discount_percent: Number(c.discount_percent ?? 0),
        discount_value: Number(c.discount_value ?? 0),
        valid_for_plan: c.valid_for_plan,
      };
    }

    // ── Trial logic ─────────────────────────────────────────────────────────
    const { count: priorSubs } = await admin
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurant.id);

    const couponTrialDays = coupon?.trial_extra_days ?? 0;
    const baseTrialDays = planDef.hasTrial && (priorSubs ?? 0) === 0 ? planDef.trialDays : 0;
    const totalTrialDays = baseTrialDays + couponTrialDays;
    const eligibleForTrial = totalTrialDays > 0;

    const now = new Date();
    const nextDue = new Date(now);
    if (eligibleForTrial) {
      nextDue.setDate(nextDue.getDate() + totalTrialDays);
    }
    const nextDueDateStr = nextDue.toISOString().slice(0, 10);
    const trialEndsAtIso = eligibleForTrial ? nextDue.toISOString() : null;

    // ── Discount calculation ────────────────────────────────────────────────
    let valueCents = baseValueCents;
    let discountApplied = 0;
    if (coupon) {
      if (coupon.discount_percent > 0) {
        discountApplied = Math.round((baseValueCents * coupon.discount_percent) / 100);
      } else if (coupon.discount_value > 0) {
        discountApplied = Math.min(Math.round(coupon.discount_value * 100), baseValueCents);
      }
      valueCents = Math.max(0, baseValueCents - discountApplied);
    }

    const customerId = await getOrCreateAsaasCustomer(restaurant);

    const asaasSub = await asaasRequest("POST", "/subscriptions", {
      customer: customerId,
      billingType: "UNDEFINED",
      value: valueCents / 100,
      nextDueDate: nextDueDateStr,
      cycle: ASAAS_CYCLE[cycle],
      description: `Assinatura FyMenu ${planDef.name} (${cycle})`,
      externalReference: restaurant.id,
    });

    const paymentsRes = await asaasRequest(
      "GET",
      `/payments?subscription=${asaasSub.id}`
    );
    const firstPayment = paymentsRes?.data?.[0];
    const checkoutUrl: string | undefined = firstPayment?.invoiceUrl;

    if (!checkoutUrl) {
      console.error(
        "[plan/checkout] Asaas subscription criada mas sem invoiceUrl",
        { subscriptionId: asaasSub.id }
      );
      return NextResponse.json(
        { ok: false, error: "Falha ao obter URL de checkout do Asaas" },
        { status: 502 }
      );
    }

    await admin.from("subscriptions").insert({
      restaurant_id: restaurant.id,
      asaas_subscription_id: asaasSub.id,
      asaas_customer_id: customerId,
      plan,
      cycle,
      billing_type: "UNDEFINED",
      value: valueCents,
      status: "pending",
      next_due_date: nextDueDateStr,
      started_at: now.toISOString(),
      coupon_id: coupon?.id ?? null,
      discount_applied: discountApplied,
    });

    if (coupon) {
      await admin.from("coupon_redemptions").insert({
        coupon_id: coupon.id,
        restaurant_id: restaurant.id,
        redeemed_by: user.id,
      });
      const { data: latest } = await admin
        .from("partner_coupons")
        .select("current_uses")
        .eq("id", coupon.id)
        .single();
      await admin
        .from("partner_coupons")
        .update({ current_uses: (latest?.current_uses ?? 0) + 1 })
        .eq("id", coupon.id);
    }

    await admin
      .from("restaurants")
      .update({
        plan,
        status: eligibleForTrial ? "trial" : "pending",
        trial_ends_at: trialEndsAtIso,
        onboarding_completed: true,
      })
      .eq("id", restaurant.id);

    return NextResponse.json({
      ok: true,
      checkoutUrl,
      applied_coupon: coupon
        ? {
            code: coupon.code,
            trial_extra_days: coupon.trial_extra_days,
            discount_applied: discountApplied,
            message: coupon.trial_extra_days > 0
              ? `Trial de ${totalTrialDays} dias ativado`
              : `Desconto de R$ ${(discountApplied / 100).toFixed(2)} aplicado`,
          }
        : null,
    });
  } catch (err: unknown) {
    console.error("[plan/checkout] error:", err);
    if (err instanceof AsaasError) {
      return NextResponse.json(
        {
          ok: false,
          error: err.message || "Erro no gateway de pagamento",
          details: {
            httpStatus: err.httpStatus,
            rawText: err.rawText?.slice(0, 500),
          },
        },
        { status: 502 }
      );
    }
    const message = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
