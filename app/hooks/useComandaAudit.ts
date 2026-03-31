"use client";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export async function logComandaAction({
  comanda_id,
  order_id,
  unit_id,
  action,
  item_name,
  item_id,
  old_value,
  new_value,
  performed_by,
  performed_by_role,
  performed_by_name,
  reason,
}: {
  comanda_id: string;
  order_id?: string;
  unit_id: string;
  action:
    | "item_added"
    | "item_removed"
    | "item_qty_changed"
    | "price_changed"
    | "comanda_opened"
    | "comanda_closed"
    | "payment_received"
    | "sent_to_cashier";
  item_name?: string;
  item_id?: string;
  old_value?: unknown;
  new_value?: unknown;
  performed_by?: string;
  performed_by_role: string;
  performed_by_name: string;
  reason?: string;
}) {
  await supabase.from("comanda_audit_log").insert({
    comanda_id,
    order_id: order_id ?? null,
    unit_id,
    action,
    item_name: item_name ?? null,
    item_id: item_id ?? null,
    old_value: old_value != null ? JSON.stringify(old_value) : null,
    new_value: new_value != null ? JSON.stringify(new_value) : null,
    performed_by: performed_by ?? null,
    performed_by_role,
    performed_by_name,
    reason: reason ?? null,
  });
}
