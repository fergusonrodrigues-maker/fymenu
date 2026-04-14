import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendText } from "@/lib/zapi";

function fillTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { unitId, phone, message: rawMessage, customerId, templateId, templateVars } = await req.json();
    if (!unitId || !phone) return NextResponse.json({ error: "unitId e phone obrigatórios" }, { status: 400 });

    const admin = createAdminClient();

    const { data: unit } = await admin
      .from("units")
      .select("id, restaurants(owner_id)")
      .eq("id", unitId)
      .single();

    if (!unit || (unit as any).restaurants?.owner_id !== user.id) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const { data: instance } = await admin
      .from("whatsapp_instances")
      .select("zapi_instance_id, zapi_instance_token, status")
      .eq("unit_id", unitId)
      .single();

    if (!instance) return NextResponse.json({ error: "Instância não configurada" }, { status: 404 });
    if (instance.status !== "connected") return NextResponse.json({ error: "WhatsApp não conectado" }, { status: 400 });

    let message = rawMessage ?? "";
    let templateName: string | null = null;

    // Apply template if provided
    if (templateId) {
      const { data: tpl } = await admin
        .from("whatsapp_templates")
        .select("name, body")
        .eq("id", templateId)
        .eq("unit_id", unitId)
        .single();

      if (tpl) {
        templateName = tpl.name;
        message = fillTemplate(tpl.body, templateVars ?? {});
      }
    }

    if (!message.trim()) return NextResponse.json({ error: "Mensagem vazia" }, { status: 400 });

    const result = await sendText(instance.zapi_instance_id, instance.zapi_instance_token, phone, message);

    await admin.from("whatsapp_messages").insert({
      unit_id: unitId,
      customer_id: customerId ?? null,
      phone,
      message,
      template_name: templateName,
      trigger_type: "manual",
      status: result.success ? "sent" : "failed",
      zapi_message_id: result.success ? (result.data as any)?.messageId ?? null : null,
      error_message: result.success ? null : result.error ?? null,
      sent_at: result.success ? new Date().toISOString() : null,
    });

    if (!result.success) return NextResponse.json({ error: result.error }, { status: 502 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro interno" }, { status: 500 });
  }
}
