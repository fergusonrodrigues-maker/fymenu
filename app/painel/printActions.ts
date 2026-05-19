"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRestaurantMember } from "@/lib/tenant/isRestaurantMember";
import {
  generateOrderIntentKitchenHTML,
  generateOrderIntentReceiptHTML,
  generatePartialCheckHTML,
  generateFinalReceiptHTML,
} from "@/lib/print/generateReceipt";

export type KitchenPrintJob = {
  printerId: string;
  printerName: string;
  html: string;
};

// Cozinha não tem gate por plano específico (todo plano ativo imprime). O
// override do dono via units.comanda_config.auto_print_pdv prevalece. Reflete
// o helper shouldAutoPrintReceipt (PR-IMP-2) — diferente só no fallback.
type KitchenPlanRow = {
  plan: string | null;
  status: string | null;
  is_complimentary: boolean | null;
};

function shouldAutoPrintKitchen(
  restaurant: KitchenPlanRow | null,
  comandaConfig: any,
): { allowed: boolean; reason?: string } {
  if (!restaurant) return { allowed: false, reason: "no_restaurant" };

  if (!restaurant.is_complimentary && (!restaurant.plan || restaurant.status !== "active")) {
    return { allowed: false, reason: "no_active_plan" };
  }

  const cfg = comandaConfig?.auto_print_kitchen;
  if (cfg === true) return { allowed: true };
  if (cfg === false) return { allowed: false, reason: "disabled_by_owner" };

  // Default: cozinha é core, qualquer plano ativo imprime.
  return { allowed: true };
}

type KitchenBuildError =
  | "not_authenticated"
  | "order_not_found"
  | "not_authorized"
  | "no_printer_configured"
  | "no_active_plan"
  | "disabled_by_owner"
  | "no_restaurant";

type BuildResult =
  | { ok: true; jobs: KitchenPrintJob[] }
  | { ok: false; error: KitchenBuildError; jobs: [] };

export async function buildOrderIntentKitchenJobs(orderId: string): Promise<BuildResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated", jobs: [] };

  const admin = createAdminClient();

  const { data: order } = await admin
    .from("order_intents")
    .select("id, unit_id, restaurant_id, table_number, customer_name, items, notes, total, created_at, waiter_confirmed_at, source")
    .eq("id", orderId)
    .single();
  if (!order) return { ok: false, error: "order_not_found", jobs: [] };

  const isMember = await isRestaurantMember(admin, user.id, order.restaurant_id as string);
  if (!isMember) return { ok: false, error: "not_authorized", jobs: [] };

  // Gate: plan + owner override. Same shape as the PDV gate, with kitchen's
  // looser fallback (any active plan = ON, no per-plan check).
  const { data: unit } = await admin
    .from("units")
    .select("comanda_config, restaurants(plan, status, is_complimentary)")
    .eq("id", order.unit_id as string)
    .single();
  const restaurantsRaw = unit?.restaurants;
  const restaurant: KitchenPlanRow | null = Array.isArray(restaurantsRaw)
    ? ((restaurantsRaw[0] ?? null) as KitchenPlanRow | null)
    : ((restaurantsRaw as KitchenPlanRow | null | undefined) ?? null);
  const gate = shouldAutoPrintKitchen(restaurant, unit?.comanda_config);
  if (!gate.allowed) {
    const reason = (gate.reason ?? "no_active_plan") as KitchenBuildError;
    return { ok: false, error: reason, jobs: [] };
  }

  const { data: printers } = await admin
    .from("printer_configs")
    .select("id, name, purpose, paper_width, print_logo, footer_message, is_active")
    .eq("unit_id", order.unit_id as string)
    .in("purpose", ["kitchen", "generic"])
    .eq("is_active", true);

  if (!printers || printers.length === 0) {
    return { ok: false, error: "no_printer_configured", jobs: [] };
  }

  const jobs: KitchenPrintJob[] = await Promise.all(
    printers.map(async (printer) => ({
      printerId: printer.id as string,
      printerName: printer.name as string,
      html: await generateOrderIntentKitchenHTML({
        orderIntent: order as any,
        printer: printer as any,
        unitId: order.unit_id as string,
      }),
    })),
  );

  return { ok: true, jobs };
}

type MarkResult =
  | { ok: true; already?: boolean }
  | { ok: false; error: "not_authenticated" | "order_not_found" | "not_authorized" | "update_failed" };

export async function markKitchenPrinted(orderId: string): Promise<MarkResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const admin = createAdminClient();

  const { data: order } = await admin
    .from("order_intents")
    .select("id, restaurant_id, kitchen_printed_at")
    .eq("id", orderId)
    .single();
  if (!order) return { ok: false, error: "order_not_found" };

  const isMember = await isRestaurantMember(admin, user.id, order.restaurant_id as string);
  if (!isMember) return { ok: false, error: "not_authorized" };

  if (order.kitchen_printed_at) return { ok: true, already: true };

  const { error } = await admin
    .from("order_intents")
    .update({ kitchen_printed_at: new Date().toISOString() })
    .eq("id", orderId);

  if (error) return { ok: false, error: "update_failed" };
  return { ok: true };
}

// ─── Sale receipt pipeline ─────────────────────────────────────────────────

type RestaurantPlanRow = {
  plan: string | null;
  status: string | null;
  is_complimentary: boolean | null;
};

// Auto-print gate: plan decides default; owner's explicit toggle (when set)
// overrides. Reasons are returned to the client so the UI can distinguish
// "configure printer" from "your plan doesn't include this" without copying
// the rule.
function shouldAutoPrintReceipt(
  restaurant: RestaurantPlanRow | null,
  comandaConfig: any,
): { allowed: boolean; reason?: string } {
  if (!restaurant) return { allowed: false, reason: "no_restaurant" };

  if (!restaurant.is_complimentary && (!restaurant.plan || restaurant.status !== "active")) {
    return { allowed: false, reason: "no_active_plan" };
  }

  const cfg = comandaConfig?.auto_print_pdv;
  if (cfg === true) return { allowed: true };
  if (cfg === false) return { allowed: false, reason: "disabled_by_owner" };

  if (restaurant.is_complimentary) return { allowed: true };
  if (restaurant.plan === "menu") return { allowed: false, reason: "plan_menu_no_auto_print" };
  if (restaurant.plan === "menupro" || restaurant.plan === "business") return { allowed: true };
  return { allowed: false, reason: "unknown_plan" };
}

type SaleErrorReason =
  | "not_authenticated"
  | "payment_not_found"
  | "unit_not_found"
  | "not_authorized"
  | "no_active_plan"
  | "disabled_by_owner"
  | "plan_menu_no_auto_print"
  | "unknown_plan"
  | "no_restaurant"
  | "no_printer_configured"
  | "order_not_found"
  | "split_not_found"
  | "payment_has_no_target";

type SaleBuildResult =
  | { ok: true; jobs: KitchenPrintJob[] }
  | { ok: false; error: SaleErrorReason; jobs: [] };

export async function buildSaleReceiptJobs(
  paymentId: string,
  opts?: { cashPaid?: number; change?: number },
): Promise<SaleBuildResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated", jobs: [] };

  const admin = createAdminClient();

  const { data: payment } = await admin
    .from("payments")
    .select("id, order_id, comanda_id, comanda_split_id, amount, method, unit_id, printed_at")
    .eq("id", paymentId)
    .single();
  if (!payment) return { ok: false, error: "payment_not_found", jobs: [] };
  if (!payment.unit_id) return { ok: false, error: "unit_not_found", jobs: [] };

  const { data: unit } = await admin
    .from("units")
    .select("id, name, restaurant_id, comanda_config, restaurants(plan, status, is_complimentary)")
    .eq("id", payment.unit_id)
    .single();
  if (!unit || !unit.restaurant_id) return { ok: false, error: "unit_not_found", jobs: [] };

  const isMember = await isRestaurantMember(admin, user.id, unit.restaurant_id as string);
  if (!isMember) return { ok: false, error: "not_authorized", jobs: [] };

  // Supabase types the embedded relation as an array even on a one-to-one
  // FK. Normalize to a single row (or null) before passing to the gate.
  const restaurant = (Array.isArray(unit.restaurants)
    ? ((unit.restaurants[0] ?? null) as RestaurantPlanRow | null)
    : ((unit.restaurants as RestaurantPlanRow | null) ?? null));
  const gate = shouldAutoPrintReceipt(restaurant, unit.comanda_config);
  if (!gate.allowed) {
    const reason = (gate.reason ?? "no_active_plan") as SaleErrorReason;
    return { ok: false, error: reason, jobs: [] };
  }

  // Cashier preferred over generic. Order by purpose DESC puts 'kitchen' first
  // alphabetically — not what we want; do the sort in JS to be explicit.
  const { data: printersRaw } = await admin
    .from("printer_configs")
    .select("id, name, purpose, paper_width, print_logo, footer_message, is_active")
    .eq("unit_id", payment.unit_id as string)
    .in("purpose", ["cashier", "generic"])
    .eq("is_active", true);

  const printers = (printersRaw ?? []).sort((a, b) => {
    const rank = (p: string | null) => (p === "cashier" ? 0 : p === "generic" ? 1 : 2);
    return rank(a.purpose) - rank(b.purpose);
  });
  if (printers.length === 0) {
    return { ok: false, error: "no_printer_configured", jobs: [] };
  }

  const printer = printers[0];

  let html = "";
  if (payment.order_id) {
    const { data: order } = await admin
      .from("order_intents")
      .select("id, items, total, table_number, customer_name, notes, created_at, payment_method, paid_at")
      .eq("id", payment.order_id)
      .single();
    if (!order) return { ok: false, error: "order_not_found", jobs: [] };
    html = await generateOrderIntentReceiptHTML({
      orderIntent: order as any,
      printer: printer as any,
      unitId: payment.unit_id as string,
      cashPaid: opts?.cashPaid,
      change: opts?.change,
    });
  } else if (payment.comanda_split_id) {
    const { data: split } = await admin
      .from("comanda_splits")
      .select("comanda_id")
      .eq("id", payment.comanda_split_id)
      .single();
    if (!split?.comanda_id) return { ok: false, error: "split_not_found", jobs: [] };
    html = await generatePartialCheckHTML({
      comandaId: split.comanda_id as string,
      printer: printer as any,
    });
  } else if (payment.comanda_id) {
    html = await generateFinalReceiptHTML({
      comandaId: payment.comanda_id as string,
      printer: printer as any,
    });
  } else {
    return { ok: false, error: "payment_has_no_target", jobs: [] };
  }

  return {
    ok: true,
    jobs: [{ printerId: printer.id as string, printerName: printer.name as string, html }],
  };
}

type MarkReceiptResult =
  | { ok: true; already?: boolean }
  | { ok: false; error: "not_authenticated" | "payment_not_found" | "not_authorized" | "update_failed" };

export async function markReceiptPrinted(paymentId: string): Promise<MarkReceiptResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const admin = createAdminClient();

  const { data: payment } = await admin
    .from("payments")
    .select("id, unit_id, printed_at, units!inner(restaurant_id)")
    .eq("id", paymentId)
    .single();
  if (!payment) return { ok: false, error: "payment_not_found" };

  const restaurantId = (payment.units as any)?.restaurant_id as string | undefined;
  if (!restaurantId) return { ok: false, error: "not_authorized" };

  const isMember = await isRestaurantMember(admin, user.id, restaurantId);
  if (!isMember) return { ok: false, error: "not_authorized" };

  if (payment.printed_at) return { ok: true, already: true };

  const { error } = await admin
    .from("payments")
    .update({ printed_at: new Date().toISOString() })
    .eq("id", paymentId);

  if (error) return { ok: false, error: "update_failed" };
  return { ok: true };
}

type PayOrderResult =
  | { ok: true; paymentId: string; change?: number }
  | {
      ok: false;
      error: "not_authenticated" | "order_not_found" | "not_authorized" | "already_paid" | "update_failed" | "payment_insert_failed";
    };

export async function payOrderIntent(opts: {
  orderId: string;
  method: string;
  cashPaid?: number;
}): Promise<PayOrderResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const admin = createAdminClient();

  const { data: order } = await admin
    .from("order_intents")
    .select("id, unit_id, restaurant_id, total, paid_at")
    .eq("id", opts.orderId)
    .single();
  if (!order) return { ok: false, error: "order_not_found" };

  const isMember = await isRestaurantMember(admin, user.id, order.restaurant_id as string);
  if (!isMember) return { ok: false, error: "not_authorized" };

  if (order.paid_at) return { ok: false, error: "already_paid" };

  const now = new Date().toISOString();

  const { error: updErr } = await admin
    .from("order_intents")
    .update({
      payment_method: opts.method,
      paid_at: now,
      waiter_status: "delivered",
    })
    .eq("id", opts.orderId);
  if (updErr) return { ok: false, error: "update_failed" };

  const { data: payment, error: payErr } = await admin
    .from("payments")
    .insert({
      order_id: opts.orderId,
      unit_id: order.unit_id,
      amount: order.total,
      method: opts.method,
      status: "confirmed",
    })
    .select("id")
    .single();

  if (payErr || !payment) return { ok: false, error: "payment_insert_failed" };

  const change = opts.cashPaid != null && opts.method === "cash"
    ? opts.cashPaid - (order.total as number)
    : undefined;

  return { ok: true, paymentId: payment.id as string, change };
}

// Closing a comanda from the garçom side previously only mutated `comandas`
// and never wrote a `payments` row. The auto-print pipeline keys off
// payments, so this action now does both: updates the comanda and inserts a
// single `payments` row tied to the comanda, returning the id for the client
// to feed into `buildSaleReceiptJobs`.
type PayComandaResult =
  | { ok: true; paymentId: string }
  | { ok: false; error: "not_authenticated" | "comanda_not_found" | "not_authorized" | "comanda_update_failed" | "payment_insert_failed" };

export async function closeComandaAsGarcom(opts: {
  comandaId: string;
  method: string;
  closedByName: string;
}): Promise<PayComandaResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const admin = createAdminClient();

  const { data: comanda } = await admin
    .from("comandas")
    .select("id, unit_id, restaurant_id, total, status")
    .eq("id", opts.comandaId)
    .single();
  if (!comanda) return { ok: false, error: "comanda_not_found" };

  const isMember = await isRestaurantMember(admin, user.id, comanda.restaurant_id as string);
  if (!isMember) return { ok: false, error: "not_authorized" };

  const now = new Date().toISOString();

  const { error: updErr } = await admin
    .from("comandas")
    .update({
      status: "closed",
      payment_method: opts.method,
      closed_at: now,
      closed_by: user.id,
      closed_by_name: opts.closedByName,
    })
    .eq("id", opts.comandaId);
  if (updErr) return { ok: false, error: "comanda_update_failed" };

  const { data: payment, error: payErr } = await admin
    .from("payments")
    .insert({
      comanda_id: opts.comandaId,
      unit_id: comanda.unit_id,
      amount: comanda.total ?? 0,
      method: opts.method,
      status: "confirmed",
    })
    .select("id")
    .single();
  if (payErr || !payment) return { ok: false, error: "payment_insert_failed" };

  return { ok: true, paymentId: payment.id as string };
}

// ─── Manager approval / rejection of pending delivery orders ────────────────
// The pg_cron job auto-confirms after the 30s window expires, but the manager
// can short-circuit it from the Hub: confirm early (skip the buffer) or reject
// outright (stamps rejected_at so the cron skips it and Cozinha never sees it).

type RejectResult =
  | { ok: true; already?: boolean }
  | { ok: false; error: "not_authenticated" | "order_not_found" | "not_authorized" | "order_already_confirmed" | "update_failed" };

export async function rejectOrderIntent(opts: {
  orderId: string;
  reason?: string;
}): Promise<RejectResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const admin = createAdminClient();

  const { data: order } = await admin
    .from("order_intents")
    .select("id, restaurant_id, rejected_at, status, waiter_status")
    .eq("id", opts.orderId)
    .single();
  if (!order) return { ok: false, error: "order_not_found" };

  const isMember = await isRestaurantMember(admin, user.id, order.restaurant_id as string);
  if (!isMember) return { ok: false, error: "not_authorized" };

  if (order.rejected_at) return { ok: true, already: true };
  if (order.status !== "pending") return { ok: false, error: "order_already_confirmed" };

  const { error } = await admin
    .from("order_intents")
    .update({
      status: "cancelled",
      rejected_at: new Date().toISOString(),
      rejected_by: user.id,
      rejected_reason: opts.reason ?? "Rejeitado pelo gerente",
    })
    .eq("id", opts.orderId);
  if (error) return { ok: false, error: "update_failed" };
  return { ok: true };
}

type ConfirmEarlyResult =
  | { ok: true; already?: boolean }
  | { ok: false; error: "not_authenticated" | "order_not_found" | "not_authorized" | "order_already_rejected" | "update_failed" };

export async function confirmOrderIntentEarly(orderId: string): Promise<ConfirmEarlyResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const admin = createAdminClient();

  const { data: order } = await admin
    .from("order_intents")
    .select("id, restaurant_id, status, waiter_status")
    .eq("id", orderId)
    .single();
  if (!order) return { ok: false, error: "order_not_found" };

  const isMember = await isRestaurantMember(admin, user.id, order.restaurant_id as string);
  if (!isMember) return { ok: false, error: "not_authorized" };

  if (order.status === "confirmed") return { ok: true, already: true };
  if (order.status === "cancelled") return { ok: false, error: "order_already_rejected" };

  const { error } = await admin
    .from("order_intents")
    .update({
      status: "confirmed",
      waiter_status: "confirmed",
      waiter_confirmed_at: new Date().toISOString(),
      kitchen_status: "waiting",
    })
    .eq("id", orderId);
  if (error) return { ok: false, error: "update_failed" };
  return { ok: true };
}
