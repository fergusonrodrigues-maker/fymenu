import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type CreateNotificationInput = {
  restaurantId: string;
  unitId?: string | null;
  category: "task_completed" | "task_overdue" | "order" | "system" | "member" | "review" | "custom";
  title: string;
  body?: string;
  linkUrl?: string;
  sourceType?: string;
  sourceId?: string;
  // WhatsApp params — wired in commit 2 (zapi integration)
  sendWhatsapp?: boolean;
  whatsappPhone?: string;
  whatsappMessage?: string;
};

/**
 * Inserts a notification row and (optionally) dispatches a WhatsApp message
 * via Z-API. Fail-safe: never throws; errors are logged and swallowed so the
 * caller's mutation isn't blocked by notification side-effects.
 */
export async function createNotification(input: CreateNotificationInput): Promise<void> {
  try {
    const supabase = createAdminClient();
    const shouldSendWhatsapp = input.sendWhatsapp !== false;

    const { error } = await supabase.from("notifications").insert({
      restaurant_id: input.restaurantId,
      unit_id: input.unitId ?? null,
      category: input.category,
      title: input.title,
      body: input.body ?? null,
      link_url: input.linkUrl ?? null,
      source_type: input.sourceType ?? null,
      source_id: input.sourceId ?? null,
      whatsapp_status: shouldSendWhatsapp ? "pending" : "skipped",
    });

    if (error) {
      console.error("createNotification insert failed:", error);
      return;
    }

    // WhatsApp dispatch wired in commit 2.
  } catch (err) {
    console.error("createNotification failed:", err);
  }
}
