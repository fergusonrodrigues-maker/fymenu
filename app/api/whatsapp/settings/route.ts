import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { unitId, auto_notifications, notify_order_received, notify_order_preparing, notify_order_ready, notify_order_delivering, chatbot_enabled } = await req.json();
    const admin = createAdminClient();

    const { data: unit } = await admin
      .from("units")
      .select("id, restaurants(owner_id)")
      .eq("id", unitId)
      .single();

    if (!unit || (unit as any).restaurants?.owner_id !== user.id) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (auto_notifications !== undefined) updates.auto_notifications = auto_notifications;
    if (notify_order_received !== undefined) updates.notify_order_received = notify_order_received;
    if (notify_order_preparing !== undefined) updates.notify_order_preparing = notify_order_preparing;
    if (notify_order_ready !== undefined) updates.notify_order_ready = notify_order_ready;
    if (notify_order_delivering !== undefined) updates.notify_order_delivering = notify_order_delivering;
    if (chatbot_enabled !== undefined) updates.chatbot_enabled = chatbot_enabled;

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
