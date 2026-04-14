// Automatic WhatsApp notifications triggered by order status changes.
// Failure NEVER blocks the calling operation — always call inside try/catch.

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

// Replaces {{variable}} placeholders in template body
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

    // 1. Fetch instance and verify it's connected + this notification type is enabled
    const { data: instance } = await admin
      .from("whatsapp_instances")
      .select("id, zapi_instance_id, zapi_instance_token, status, auto_notifications, notify_order_received, notify_order_preparing, notify_order_ready, notify_order_delivering")
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
      .select("id, customer_name, customer_phone, total, delivery_type, items")
      .eq("id", orderId)
      .single();

    if (!order) return;
    const phone: string | null = order.customer_phone ?? null;
    if (!phone) return;

    // 3. Fetch unit info (for restaurant name and delivery_type context)
    const { data: unit } = await admin
      .from("units")
      .select("name")
      .eq("id", unitId)
      .single();

    // 4. Find the default template for this trigger category
    // Template name convention: trigger type without "auto_" prefix
    const templateName = eventType.replace("auto_", "");
    const { data: template } = await admin
      .from("whatsapp_templates")
      .select("body")
      .eq("unit_id", unitId)
      .eq("is_active", true)
      .ilike("name", templateName)
      .order("is_default", { ascending: false })
      .limit(1)
      .single();

    if (!template) return;

    // 5. Build variable map
    const shortId = orderId.slice(0, 8).toUpperCase();
    const tipoRetirada =
      order.delivery_type === "delivery"
        ? "Aguarde o entregador."
        : "Retire no balcão.";
    const totalFmt =
      typeof order.total === "number"
        ? `R$ ${order.total.toFixed(2).replace(".", ",")}`
        : String(order.total ?? "");

    const vars: Record<string, string> = {
      nome:          order.customer_name ?? "Cliente",
      pedido_id:     shortId,
      total:         totalFmt,
      restaurante:   unit?.name ?? "",
      tipo_retirada: tipoRetirada,
    };

    const message = fillTemplate(template.body, vars);

    // 6. Send
    const result = await sendText(
      instance.zapi_instance_id,
      instance.zapi_instance_token,
      phone,
      message
    );

    // 7. Log message (fire-and-forget; ignore errors)
    await admin.from("whatsapp_messages").insert({
      unit_id:       unitId,
      phone,
      message,
      template_name: templateName,
      trigger_type:  eventType,
      order_intent_id: orderId,
      status:        result.success ? "sent" : "failed",
      zapi_message_id: result.success
        ? (result.data as Record<string, string> | undefined)?.messageId ?? null
        : null,
      error_message: result.success ? null : result.error ?? null,
      sent_at:       result.success ? new Date().toISOString() : null,
    });
  } catch {
    // Intentionally swallowed — WhatsApp failure must never block order operations
  }
}
