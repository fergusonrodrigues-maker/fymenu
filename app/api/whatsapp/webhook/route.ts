import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ZApiInboundPayload } from "@/lib/whatsapp-chatbot";

// Public endpoint — no auth cookie needed.
// Z-API sends delivery status callbacks AND inbound messages here.
// URL to configure on Z-API: https://fymenu.com/api/whatsapp/webhook
// Validate with ZAPI_ADMIN_TOKEN in Client-Token header.
export async function POST(req: NextRequest) {
  try {
    const clientToken = req.headers.get("client-token");
    if (process.env.ZAPI_ADMIN_TOKEN && clientToken !== process.env.ZAPI_ADMIN_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { type, messageId, status } = body ?? {};

    // ── Delivery status update ────────────────────────────────────────────────
    if (type === "MessageStatusCallback" && messageId && status) {
      const zapiStatus: Record<string, string> = {
        sent:      "sent",
        delivered: "delivered",
        read:      "read",
      };
      const mapped = zapiStatus[status];
      if (mapped) {
        const admin = createAdminClient();
        await admin
          .from("whatsapp_messages")
          .update({ status: mapped })
          .eq("zapi_message_id", messageId);
      }
      return NextResponse.json({ ok: true });
    }

    // ── Inbound message ───────────────────────────────────────────────────────
    const payload = body as ZApiInboundPayload;

    if (payload.fromMe)    return NextResponse.json({ ok: true });
    if (payload.isGroup)   return NextResponse.json({ ok: true });
    if (payload.broadcast) return NextResponse.json({ ok: true });

    const phone      = payload.phone;
    const instanceId = payload.instanceId;
    const incomingMessageId = payload.messageId ?? "";

    // Determine message type
    const messageText     = payload.text?.message?.trim();
    const locationData    = payload.location;

    const hasText     = !!messageText;
    const hasLocation = !!(locationData?.latitude != null && locationData?.longitude != null);

    // Must have phone + instance + at least one message type
    if (!phone || !instanceId || (!hasText && !hasLocation)) {
      return NextResponse.json({ ok: true });
    }

    const admin = createAdminClient();

    const { data: instance } = await admin
      .from("whatsapp_instances")
      .select(
        "id, unit_id, zapi_instance_id, zapi_instance_token, zapi_client_token, " +
        "chatbot_enabled, status, " +
        "chatbot_read_delay, chatbot_typing_delay, chatbot_show_read, chatbot_show_typing"
      )
      .eq("zapi_instance_id", instanceId)
      .maybeSingle() as { data: Record<string, any> | null };

    if (!instance) return NextResponse.json({ ok: true });
    if (instance.status !== "connected") return NextResponse.json({ ok: true });
    if (!instance.chatbot_enabled) return NextResponse.json({ ok: true });

    const { data: unit } = await admin
      .from("units")
      .select("slug")
      .eq("id", instance.unit_id)
      .single();

    // Fire-and-forget
    import("@/lib/whatsapp-chatbot").then(({ processIncomingMessage }) => {
      processIncomingMessage({
        unitId:       instance.unit_id,
        phone,
        messageType:  hasLocation ? "location" : "text",
        messageText:  hasText ? messageText : undefined,
        locationData: hasLocation ? { latitude: locationData!.latitude, longitude: locationData!.longitude } : undefined,
        messageId:    incomingMessageId,
        instanceId:   instance.zapi_instance_id,
        instanceToken: instance.zapi_instance_token,
        clientToken:  instance.zapi_client_token ?? undefined,
        slug:         unit?.slug ?? "",
        readDelay:    instance.chatbot_read_delay   ?? 3,
        typingDelay:  instance.chatbot_typing_delay ?? 5,
        showRead:     instance.chatbot_show_read    ?? true,
        showTyping:   instance.chatbot_show_typing  ?? true,
      }).catch(() => {});
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
