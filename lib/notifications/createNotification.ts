import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendText } from "@/lib/zapi";

export type CreateNotificationInput = {
  restaurantId: string;
  unitId?: string | null;
  category: "task_completed" | "task_overdue" | "order" | "system" | "member" | "review" | "custom";
  title: string;
  body?: string;
  linkUrl?: string;
  sourceType?: string;
  sourceId?: string;
  // WhatsApp dispatch — defaults to enabled if a connected instance exists.
  sendWhatsapp?: boolean;
  whatsappPhone?: string;
  whatsappMessage?: string;
};

function normalizeBrazilPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  // Already country-coded (12+ digits starting with 55)
  if (digits.length >= 12 && digits.startsWith("55")) return digits;
  // Local Brazilian number — prepend 55
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits; // best effort — pass through
}

/**
 * Inserts a notification row and (optionally) dispatches a WhatsApp message
 * via Z-API. Fail-safe: never throws; errors are logged and swallowed so the
 * caller's mutation isn't blocked by notification side-effects.
 */
export async function createNotification(input: CreateNotificationInput): Promise<void> {
  try {
    const supabase = createAdminClient();
    const shouldSendWhatsapp = input.sendWhatsapp !== false;

    const { data: notif, error } = await supabase
      .from("notifications")
      .insert({
        restaurant_id: input.restaurantId,
        unit_id: input.unitId ?? null,
        category: input.category,
        title: input.title,
        body: input.body ?? null,
        link_url: input.linkUrl ?? null,
        source_type: input.sourceType ?? null,
        source_id: input.sourceId ?? null,
        whatsapp_status: shouldSendWhatsapp ? "pending" : "skipped",
      })
      .select("id")
      .single();

    if (error || !notif) {
      console.error("createNotification insert failed:", error);
      return;
    }

    if (!shouldSendWhatsapp) return;

    // ── WhatsApp dispatch ────────────────────────────────────────────────────

    const setStatus = async (status: string, sentAt?: string | null) => {
      const update: Record<string, unknown> = { whatsapp_status: status };
      if (sentAt !== undefined) update.whatsapp_sent_at = sentAt;
      await supabase.from("notifications").update(update).eq("id", notif.id);
    };

    if (!input.unitId) {
      await setStatus("skipped");
      return;
    }

    const { data: instance } = await supabase
      .from("whatsapp_instances")
      .select("zapi_instance_id, zapi_instance_token, zapi_client_token, status")
      .eq("unit_id", input.unitId)
      .maybeSingle();

    if (!instance || instance.status !== "connected") {
      await setStatus("skipped");
      return;
    }

    let rawPhone: string | null | undefined = input.whatsappPhone;
    if (!rawPhone) {
      const { data: rest } = await supabase
        .from("restaurants")
        .select("owner_phone")
        .eq("id", input.restaurantId)
        .maybeSingle();
      rawPhone = rest?.owner_phone ?? undefined;
    }
    const phone = normalizeBrazilPhone(rawPhone);
    if (!phone) {
      await setStatus("skipped");
      return;
    }

    const message =
      input.whatsappMessage ??
      [input.title, input.body].filter(Boolean).join("\n");

    const result = await sendText(
      instance.zapi_instance_id,
      instance.zapi_instance_token,
      phone,
      message,
      instance.zapi_client_token ?? undefined,
    );

    if (result.success) {
      await setStatus("sent", new Date().toISOString());
    } else {
      console.error("createNotification: zapi send failed:", result.error);
      await setStatus("failed", null);
    }
  } catch (err) {
    console.error("createNotification failed:", err);
  }
}
