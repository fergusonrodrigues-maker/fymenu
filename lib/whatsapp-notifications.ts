// Automatic WhatsApp notifications triggered by order status changes.
// Failure NEVER blocks the calling operation — always wrap calls in try/catch.

import { createAdminClient } from "@/lib/supabase/admin";
import { sendText } from "@/lib/zapi";

export type OrderEventType =
  | "auto_order_received"
  | "auto_order_preparing"
  | "auto_order_ready"
  | "auto_order_delivering";

// Maps trigger type → notify_* column name on whatsapp_instances
const NOTIFY_COLUMN: Record<OrderEventType, string> = {
  auto_order_received:   "notify_order_received",
  auto_order_preparing:  "notify_order_preparing",
  auto_order_ready:      "notify_order_ready",
  auto_order_delivering: "notify_order_delivering",
};

// Template names match whatsapp_templates.name created during setup
const TEMPLATE_NAME: Record<OrderEventType, string> = {
  auto_order_received:   "Pedido recebido",
  auto_order_preparing:  "Pedido em preparo",
  auto_order_ready:      "Pedido pronto",
  auto_order_delivering: "Saiu para entrega",
};

function fillTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

export async function sendOrderNotification(
  unitId: string,
  orderId: string,
  eventType: OrderEventType
): Promise<void> {
  try {
    const admin = createAdminClient();

    // 1. Fetch instance — must be connected and have this notification type enabled
    const { data: instance } = await admin
      .from("whatsapp_instances")
      .select("id, zapi_instance_id, zapi_instance_token, zapi_client_token, status, auto_notifications, notify_order_received, notify_order_preparing, notify_order_ready, notify_order_delivering")
      .eq("unit_id", unitId)
      .single();

    if (!instance) return;
    if (instance.status !== "connected") return;
    if (!instance.auto_notifications) return;

    const col = NOTIFY_COLUMN[eventType] as keyof typeof instance;
    if (!instance[col]) return;

    // 2. Fetch order + customer phone
    const { data: order } = await admin
      .from("order_intents")
      .select("id, customer_name, customer_phone, total, delivery_type")
      .eq("id", orderId)
      .single();

    if (!order) return;
    const phone: string | null = order.customer_phone ?? null;
    if (!phone) return;

    // 3. Fetch unit name for template variables
    const { data: unit } = await admin
      .from("units")
      .select("name")
      .eq("id", unitId)
      .single();

    // 4. Find matching template
    const tplName = TEMPLATE_NAME[eventType];
    const { data: template } = await admin
      .from("whatsapp_templates")
      .select("body")
      .eq("unit_id", unitId)
      .eq("is_active", true)
      .ilike("name", tplName)
      .order("is_default", { ascending: false })
      .limit(1)
      .single();

    if (!template) return;

    // 5. Build variables
    const shortId = orderId.slice(0, 8).toUpperCase();
    const totalFmt =
      typeof order.total === "number"
        ? `R$ ${order.total.toFixed(2).replace(".", ",")}`
        : String(order.total ?? "");

    const vars: Record<string, string> = {
      nome:        order.customer_name ?? "Cliente",
      pedido_id:   shortId,
      total:       totalFmt,
      restaurante: unit?.name ?? "",
    };

    const message = fillTemplate(template.body, vars);

    // 6. Send — pass clientToken when present
    const clientToken = instance.zapi_client_token ?? undefined;
    const result = await sendText(
      instance.zapi_instance_id,
      instance.zapi_instance_token,
      phone,
      message,
      clientToken
    );

    // 7. Log (fire-and-forget)
    await admin.from("whatsapp_messages").insert({
      unit_id:         unitId,
      phone,
      message,
      template_name:   tplName,
      trigger_type:    eventType,
      order_intent_id: orderId,
      status:          result.success ? "sent" : "failed",
      zapi_message_id: result.success
        ? (result.data as Record<string, string> | undefined)?.messageId ?? null
        : null,
      error_message:   result.success ? null : result.error ?? null,
      sent_at:         result.success ? new Date().toISOString() : null,
    });
  } catch {
    // Intentionally swallowed — WhatsApp must never block order operations
  }
}
