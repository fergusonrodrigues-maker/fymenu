import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { subscriptionConfirmedEmail } from "@/lib/email-templates";
import { PLAN_LABELS, getAsaasSubscription } from "@/lib/asaas";
import { PLAN_PRICES_ASAAS, type PlanCode } from "@/lib/plans";

type AsaasCycle = "MONTHLY" | "QUARTERLY" | "SEMIANNUALLY";
type BillingType = "PIX" | "CREDIT_CARD" | "BOLETO";

// Reverse lookup: bate o value (em centavos) contra a tabela de
// preços conhecidos. Retorna null quando o valor não corresponde
// a nenhuma combinação plano/ciclo (geralmente significa que houve
// desconto aplicado e self-heal não pode inferir o plano com
// segurança — preferimos abortar a "chutar" e perder receita).
function planFromValueCents(cents: number): { plan: PlanCode; cycle: AsaasCycle } | null {
  const plans: PlanCode[] = ["menu", "menupro", "business"];
  const cycles: AsaasCycle[] = ["MONTHLY", "QUARTERLY", "SEMIANNUALLY"];
  for (const plan of plans) {
    for (const cycle of cycles) {
      if (PLAN_PRICES_ASAAS[plan][cycle] === cents) return { plan, cycle };
    }
  }
  return null;
}

function normalizeBillingType(raw: unknown): BillingType | null {
  if (raw === "PIX" || raw === "CREDIT_CARD" || raw === "BOLETO") return raw;
  return null;
}

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

  const inferredSubId = payment?.subscription ?? body.subscription?.id ?? body.id;
  console.log("[webhook/asaas] event received", {
    event,
    asaasSubId: inferredSubId,
    asaasPaymentId: payment?.id,
    externalReference: payment?.externalReference ?? body.subscription?.externalReference,
    timestamp: new Date().toISOString(),
  });

  // Eventos informacionais: só logam. Tratados explicitamente pra
  // ficar claro que NÃO são bug — Asaas envia esses no fluxo normal
  // mas não exigem atualização no nosso DB.
  if (event === "PAYMENT_CREATED") {
    console.log("[webhook/asaas] payment created (informational)", {
      paymentId: payment?.id,
      subscription: payment?.subscription,
      value: payment?.value,
    });
    return NextResponse.json({ received: true, outcome: "informational" });
  }
  if (event === "SUBSCRIPTION_CREATED") {
    console.log("[webhook/asaas] subscription created (informational)", {
      subscriptionId: body.subscription?.id ?? body.id,
    });
    return NextResponse.json({ received: true, outcome: "informational" });
  }

  if (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") {
    const asaasSubId = payment?.subscription;
    if (!asaasSubId) {
      console.warn("[webhook/asaas] missing payment.subscription on payment event", { event });
      return NextResponse.json({ received: true, outcome: "noop_missing_sub_id" });
    }

    // Atualiza billing_type pro valor REAL do pagamento (resolve o caso
    // do checkout que insere "PIX" como default e o cliente paga com
    // outro método). Se payment.billingType ausente ou inválido, mantém
    // o valor anterior — só atualiza status.
    const realBillingType = normalizeBillingType(payment?.billingType);
    const updatePayload: Record<string, unknown> = { status: "active" };
    if (realBillingType) updatePayload.billing_type = realBillingType;

    const { data: updated, error: updErr } = await admin
      .from("subscriptions")
      .update(updatePayload)
      .eq("asaas_subscription_id", asaasSubId)
      .select("id, restaurant_id");

    if (updErr) {
      console.error("[webhook/asaas] subscriptions update error", {
        error: updErr,
        asaasSubId,
        event,
      });
    } else {
      console.log("[webhook/asaas] subscriptions update", {
        action: "update_status_active",
        asaasSubId,
        billing_type: realBillingType ?? "kept_existing",
        affected_rows: updated?.length ?? 0,
      });
    }

    let subRow: { id: string; restaurant_id: string } | null =
      updated && updated.length > 0 ? updated[0] : null;

    // ── Self-heal: subscription não existe no DB ──────────────────
    if (!subRow) {
      console.warn("[webhook/asaas] subscription not found in DB, attempting self_heal", {
        asaasSubId,
        event,
      });

      const asaasSub = await getAsaasSubscription(asaasSubId);
      if (!asaasSub) {
        console.error("[webhook/asaas] self_heal_aborted_no_asaas_sub", { asaasSubId });
        return NextResponse.json({ received: true, outcome: "self_heal_aborted_no_asaas_sub" });
      }

      const valueCents = Math.round(Number(asaasSub.value ?? 0) * 100);
      const mapped = planFromValueCents(valueCents);
      if (!mapped) {
        console.error("[webhook/asaas] self_heal_aborted_unknown_value", {
          asaasSubId,
          valueCents,
        });
        return NextResponse.json({ received: true, outcome: "self_heal_aborted_unknown_value" });
      }

      // Asaas cycle JÁ vem em uppercase (MONTHLY/QUARTERLY/SEMIANNUALLY)
      // — bate exatamente com a CHECK constraint do DB.
      const cycleFromAsaas = String(asaasSub.cycle ?? "");
      if (cycleFromAsaas !== mapped.cycle) {
        // Inconsistência entre Asaas cycle e o que value-lookup inferiu.
        // Confiamos no value (é o que o cliente pagou) mas logamos.
        console.warn("[webhook/asaas] self_heal_cycle_mismatch_using_value_lookup", {
          asaasSubId,
          asaasCycle: cycleFromAsaas,
          inferredCycle: mapped.cycle,
          valueCents,
        });
      }

      // billing_type tem CHECK constraint: só PIX|CREDIT_CARD|BOLETO.
      // Tenta primeiro do payment (já pago, sempre concreto), depois
      // da subscription Asaas (pode vir "UNDEFINED" antes do 1º pgto).
      const billingType =
        normalizeBillingType(payment?.billingType) ??
        normalizeBillingType(asaasSub.billingType);
      if (!billingType) {
        console.error("[webhook/asaas] self_heal_aborted_unknown_billing_type", {
          asaasSubId,
          paymentBillingType: payment?.billingType,
          asaasSubBillingType: asaasSub.billingType,
        });
        return NextResponse.json({
          received: true,
          outcome: "self_heal_aborted_unknown_billing_type",
        });
      }

      const restaurantId = asaasSub.externalReference;
      if (!restaurantId) {
        console.error("[webhook/asaas] self_heal_aborted_no_external_reference", { asaasSubId });
        return NextResponse.json({
          received: true,
          outcome: "self_heal_aborted_no_external_reference",
        });
      }

      const { data: inserted, error: insErr } = await admin
        .from("subscriptions")
        .insert({
          restaurant_id: restaurantId,
          asaas_subscription_id: asaasSubId,
          asaas_customer_id: asaasSub.customer ?? null,
          plan: mapped.plan,
          cycle: mapped.cycle,
          billing_type: billingType,
          value: valueCents,
          status: "active",
          next_due_date: asaasSub.nextDueDate ?? null,
          started_at: new Date().toISOString(),
        })
        .select("id, restaurant_id")
        .single();

      if (insErr) {
        // 23505 = unique_violation: outro handler (race) já criou.
        // Recupera via SELECT e segue o fluxo normal.
        if ((insErr as { code?: string }).code === "23505") {
          console.warn("[webhook/asaas] self_heal_duplicate_race_recovering", { asaasSubId });
          const { data: existing } = await admin
            .from("subscriptions")
            .select("id, restaurant_id")
            .eq("asaas_subscription_id", asaasSubId)
            .single();
          if (!existing) {
            console.error("[webhook/asaas] self_heal_race_recovery_failed", { asaasSubId });
            return NextResponse.json({
              received: true,
              outcome: "self_heal_race_recovery_failed",
            });
          }
          subRow = existing;
        } else {
          console.error("[webhook/asaas] self_heal_insert_failed", {
            asaasSubId,
            error: insErr,
          });
          return NextResponse.json({ received: true, outcome: "self_heal_insert_failed" });
        }
      } else {
        console.log("[webhook/asaas] self_heal_successful", {
          subscriptionId: inserted!.id,
          restaurantId,
          plan: mapped.plan,
          cycle: mapped.cycle,
          valueCents,
        });
        subRow = inserted!;
      }
    }

    // ── Fluxo normal de ativação ──────────────────────────────────
    const { data: restUpd, error: restErr } = await admin
      .from("restaurants")
      .update({ status: "active" })
      .eq("id", subRow.restaurant_id)
      .select("id");
    if (restErr) {
      console.error("[webhook/asaas] restaurants update error", {
        error: restErr,
        restaurantId: subRow.restaurant_id,
      });
    } else {
      console.log("[webhook/asaas] restaurants update", {
        action: "update_status_active",
        restaurantId: subRow.restaurant_id,
        affected_rows: restUpd?.length ?? 0,
      });
    }

    const { data: unitsUpd, error: unitsErr } = await admin
      .from("units")
      .update({ payment_active: true, is_published: true })
      .eq("restaurant_id", subRow.restaurant_id)
      .select("id");
    if (unitsErr) {
      console.error("[webhook/asaas] units update error", {
        error: unitsErr,
        restaurantId: subRow.restaurant_id,
      });
    } else {
      console.log("[webhook/asaas] units update", {
        action: "publish_and_payment_active",
        restaurantId: subRow.restaurant_id,
        affected_rows: unitsUpd?.length ?? 0,
      });
    }

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
        .eq("id", subRow.restaurant_id)
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

    const { error: paymentErr } = await admin.from("subscription_payments").upsert(
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
      { onConflict: "asaas_payment_id" },
    );
    if (paymentErr) {
      console.error("[webhook/asaas] subscription_payments upsert error", {
        error: paymentErr,
        asaasPaymentId: payment.id,
      });
    }

    console.log("[webhook/asaas] processed", { event, outcome: "success" });
    return NextResponse.json({ received: true, outcome: "success" });
  }

  if (event === "PAYMENT_OVERDUE") {
    const asaasSubId = payment?.subscription;
    if (asaasSubId) {
      const { data: updated, error: updErr } = await admin
        .from("subscriptions")
        .update({ status: "overdue" })
        .eq("asaas_subscription_id", asaasSubId)
        .select("id");
      if (updErr) {
        console.error("[webhook/asaas] overdue update error", { error: updErr, asaasSubId });
      } else if (!updated || updated.length === 0) {
        console.warn("[webhook/asaas] overdue subscription not found in DB", { asaasSubId });
        console.log("[webhook/asaas] processed", { event, outcome: "noop" });
        return NextResponse.json({ received: true, outcome: "noop_sub_not_found" });
      } else {
        console.log("[webhook/asaas] subscriptions update", {
          action: "update_status_overdue",
          asaasSubId,
          affected_rows: updated.length,
        });
      }
    }
    console.log("[webhook/asaas] processed", { event, outcome: "success" });
    return NextResponse.json({ received: true, outcome: "success" });
  }

  if (event === "SUBSCRIPTION_INACTIVATED" || event === "SUBSCRIPTION_DELETED") {
    const subId = body.subscription?.id ?? body.id;
    if (subId) {
      const { data: sub, error: selErr } = await admin
        .from("subscriptions")
        .select("restaurant_id")
        .eq("asaas_subscription_id", subId)
        .maybeSingle();

      if (selErr) {
        console.error("[webhook/asaas] cancel lookup error", { error: selErr, asaasSubId: subId });
      }

      if (sub) {
        const { data: subUpd, error: subErr } = await admin
          .from("subscriptions")
          .update({ status: "canceled", canceled_at: new Date().toISOString() })
          .eq("asaas_subscription_id", subId)
          .select("id");
        if (subErr) {
          console.error("[webhook/asaas] cancel subscriptions update error", {
            error: subErr,
            asaasSubId: subId,
          });
        } else {
          console.log("[webhook/asaas] subscriptions update", {
            action: "update_status_canceled",
            asaasSubId: subId,
            affected_rows: subUpd?.length ?? 0,
          });
        }

        const { data: restUpd, error: restErr } = await admin
          .from("restaurants")
          .update({ status: "canceled" })
          .eq("id", sub.restaurant_id)
          .select("id");
        if (restErr) {
          console.error("[webhook/asaas] cancel restaurants update error", {
            error: restErr,
            restaurantId: sub.restaurant_id,
          });
        } else {
          console.log("[webhook/asaas] restaurants update", {
            action: "update_status_canceled",
            restaurantId: sub.restaurant_id,
            affected_rows: restUpd?.length ?? 0,
          });
        }

        const { data: unitsUpd, error: unitsErr } = await admin
          .from("units")
          .update({ payment_active: false, is_published: false })
          .eq("restaurant_id", sub.restaurant_id)
          .select("id");
        if (unitsErr) {
          console.error("[webhook/asaas] cancel units update error", {
            error: unitsErr,
            restaurantId: sub.restaurant_id,
          });
        } else {
          console.log("[webhook/asaas] units update", {
            action: "unpublish_and_payment_inactive",
            restaurantId: sub.restaurant_id,
            affected_rows: unitsUpd?.length ?? 0,
          });
        }
      } else {
        console.warn("[webhook/asaas] cancel subscription not found in DB", { asaasSubId: subId });
        console.log("[webhook/asaas] processed", { event, outcome: "noop" });
        return NextResponse.json({ received: true, outcome: "noop_sub_not_found" });
      }
    }
    console.log("[webhook/asaas] processed", { event, outcome: "success" });
    return NextResponse.json({ received: true, outcome: "success" });
  }

  console.log("[webhook/asaas] processed", { event, outcome: "unhandled" });
  return NextResponse.json({ received: true, outcome: "unhandled" });
}
