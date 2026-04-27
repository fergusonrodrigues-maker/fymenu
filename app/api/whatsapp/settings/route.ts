import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUnitMember } from "@/lib/tenant/isRestaurantMember";

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const {
      unitId,
      auto_notifications, notify_order_received, notify_order_preparing, notify_order_ready, notify_order_delivering,
      chatbot_enabled, chatbot_read_delay, chatbot_typing_delay, chatbot_show_read, chatbot_show_typing,
    } = await req.json();
    const admin = createAdminClient();

    if (!await isUnitMember(admin, user.id, unitId)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (auto_notifications !== undefined) updates.auto_notifications = auto_notifications;
    if (notify_order_received !== undefined) updates.notify_order_received = notify_order_received;
    if (notify_order_preparing !== undefined) updates.notify_order_preparing = notify_order_preparing;
    if (notify_order_ready !== undefined) updates.notify_order_ready = notify_order_ready;
    if (notify_order_delivering !== undefined) updates.notify_order_delivering = notify_order_delivering;
    if (chatbot_enabled     !== undefined) updates.chatbot_enabled     = chatbot_enabled;
    if (chatbot_read_delay  !== undefined) updates.chatbot_read_delay  = chatbot_read_delay;
    if (chatbot_typing_delay !== undefined) updates.chatbot_typing_delay = chatbot_typing_delay;
    if (chatbot_show_read   !== undefined) updates.chatbot_show_read   = chatbot_show_read;
    if (chatbot_show_typing !== undefined) updates.chatbot_show_typing = chatbot_show_typing;

    const { error } = await admin
      .from("whatsapp_instances")
      .update(updates)
      .eq("unit_id", unitId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro interno" }, { status: 500 });
  }
}
