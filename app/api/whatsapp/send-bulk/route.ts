import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendText } from "@/lib/zapi";
import { isUnitMember } from "@/lib/tenant/isRestaurantMember";

const BULK_LIMIT = 200;
const DELAY_MS = 3000;

function fillTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { unitId, customerIds, message: rawMessage, templateId, templateVars } = await req.json();
    if (!unitId || !Array.isArray(customerIds) || customerIds.length === 0) {
      return NextResponse.json({ error: "unitId e customerIds obrigatórios" }, { status: 400 });
    }

    const admin = createAdminClient();

    if (!await isUnitMember(admin, user.id, unitId)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const { data: instance } = await admin
      .from("whatsapp_instances")
      .select("zapi_instance_id, zapi_instance_token, zapi_client_token, status")
      .eq("unit_id", unitId)
      .single();

    if (!instance) return NextResponse.json({ error: "Instância não configurada" }, { status: 404 });
    if (instance.status !== "connected") return NextResponse.json({ error: "WhatsApp não conectado" }, { status: 400 });

    const clientToken = instance.zapi_client_token ?? undefined;
    const ids = customerIds.slice(0, BULK_LIMIT);

    const { data: customers } = await admin
      .from("crm_customers")
      .select("id, name, phone")
      .in("id", ids)
      .not("phone", "is", null);

    if (!customers || customers.length === 0) {
      return NextResponse.json({ total: 0, sent: 0, failed: 0 });
    }

    let bodyTemplate = rawMessage ?? "";
    let templateName: string | null = null;

    if (templateId) {
      const { data: tpl } = await admin
        .from("whatsapp_templates")
        .select("name, body")
        .eq("id", templateId)
        .eq("unit_id", unitId)
        .single();

      if (tpl) {
        templateName = tpl.name;
        bodyTemplate = tpl.body;
      }
    }

    let sent = 0;
    let failed = 0;

    for (let i = 0; i < customers.length; i++) {
      const customer = customers[i];
      if (!customer.phone) { failed++; continue; }

      const vars: Record<string, string> = {
        nome:     customer.name ?? "Cliente",
        telefone: customer.phone ?? "",
        ...(templateVars ?? {}),
      };
      const message = fillTemplate(bodyTemplate, vars);

      if (!message.trim()) { failed++; continue; }

      const result = await sendText(
        instance.zapi_instance_id,
        instance.zapi_instance_token,
        customer.phone,
        message,
        clientToken
      );

      await admin.from("whatsapp_messages").insert({
        unit_id:         unitId,
        customer_id:     customer.id,
        phone:           customer.phone,
        message,
        template_name:   templateName,
        trigger_type:    "bulk",
        status:          result.success ? "sent" : "failed",
        zapi_message_id: result.success ? (result.data as any)?.messageId ?? null : null,
        error_message:   result.success ? null : result.error ?? null,
        sent_at:         result.success ? new Date().toISOString() : null,
      });

      if (result.success) sent++; else failed++;

      if (i < customers.length - 1) await sleep(DELAY_MS);
    }

    return NextResponse.json({ total: customers.length, sent, failed });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro interno" }, { status: 500 });
  }
}
