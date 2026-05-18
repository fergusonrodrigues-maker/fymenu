"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRestaurantMember } from "@/lib/tenant/isRestaurantMember";
import { generateOrderIntentKitchenHTML } from "@/lib/print/generateReceipt";

export type KitchenPrintJob = {
  printerId: string;
  printerName: string;
  html: string;
};

type BuildResult =
  | { ok: true; jobs: KitchenPrintJob[] }
  | { ok: false; error: "not_authenticated" | "order_not_found" | "not_authorized" | "no_printer_configured"; jobs: [] };

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
