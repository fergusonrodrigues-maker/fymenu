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

    const setStatus = async (
      status: "sent" | "failed" | "skipped",
      errorMessage: string | null = null,
    ) => {
      const update: Record<string, unknown> = {
        whatsapp_status: status,
        whatsapp_error: errorMessage ? errorMessage.slice(0, 500) : null,
      };
      if (status === "sent") update.whatsapp_sent_at = new Date().toISOString();
      const { error: updErr } = await supabase
        .from("notifications")
        .update(update)
        .eq("id", notif.id);
      if (updErr) console.error("createNotification: status update failed:", updErr);
    };

    if (!input.unitId) {
      await setStatus("skipped", "Notificação sem unit_id");
      return;
    }

    const { data: instance } = await supabase
      .from("whatsapp_instances")
      .select("zapi_instance_id, zapi_instance_token, zapi_client_token, status")
      .eq("unit_id", input.unitId)
      .maybeSingle();

    if (!instance) {
      await setStatus("skipped", "Nenhuma instância WhatsApp configurada para a unidade");
      return;
    }
    if (instance.status !== "connected") {
      await setStatus("skipped", `WhatsApp não conectado (status='${instance.status}')`);
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
      await setStatus("skipped", "Telefone do destinatário não configurado (restaurants.owner_phone vazio)");
      return;
    }

    const message =
      input.whatsappMessage ??
      [input.title, input.body].filter(Boolean).join("\n");

    console.log("[notif] zapi send:", {
      notificationId: notif.id,
      phoneMasked: phone.replace(/(\d{4})\d+(\d{4})/, "$1***$2"),
      messageLength: message.length,
    });

    const result = await sendText(
      instance.zapi_instance_id,
      instance.zapi_instance_token,
      phone,
      message,
      instance.zapi_client_token ?? undefined,
    );

    if (result.success) {
      await setStatus("sent");
    } else {
      const errMsg = result.error ?? "Falha desconhecida no envio Z-API";
      console.error("createNotification: zapi send failed:", errMsg);
      await setStatus("failed", errMsg);
    }
  } catch (err) {
    console.error("createNotification failed:", err);
  }
}
