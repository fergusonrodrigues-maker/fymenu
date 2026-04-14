import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Public endpoint — no auth cookie needed.
// Z-API sends delivery status callbacks here.
// URL to configure on Z-API: https://fymenu.com/api/whatsapp/webhook
// Validate with ZAPI_ADMIN_TOKEN in Client-Token header.
export async function POST(req: NextRequest) {
  try {
    const clientToken = req.headers.get("client-token");
    if (process.env.ZAPI_ADMIN_TOKEN && clientToken !== process.env.ZAPI_ADMIN_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Z-API MessageStatusCallback shape:
    // { type: "MessageStatusCallback", messageId: string, status: "sent"|"delivered"|"read", phone: string }
    const { type, messageId, status } = body ?? {};

    if (type !== "MessageStatusCallback" || !messageId || !status) {
      return NextResponse.json({ ok: true }); // ignore unknown event types
    }

    const zapiStatus: Record<string, string> = {
      sent:      "sent",
      delivered: "delivered",
      read:      "read",
    };
    const mapped = zapiStatus[status];
    if (!mapped) return NextResponse.json({ ok: true });

    const admin = createAdminClient();
    await admin
      .from("whatsapp_messages")
      .update({ status: mapped })
      .eq("zapi_message_id", messageId);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // never crash webhook
  }
}
