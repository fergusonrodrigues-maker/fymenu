import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createInstance } from "@/lib/zapi";
import { normalizePlanName } from "@/lib/plan";

const DEFAULT_TEMPLATES = [
  {
    name: "order_received",
    category: "order_status",
    body: "Olá {{nome}}! Recebemos seu pedido #{{pedido_id}}. Estamos preparando! 🍽️",
    variables: ["nome", "pedido_id"],
    is_default: true,
  },
  {
    name: "order_preparing",
    category: "order_status",
    body: "{{nome}}, seu pedido está sendo preparado pela nossa cozinha! ⏳",
    variables: ["nome"],
    is_default: true,
  },
  {
    name: "order_ready",
    category: "order_status",
    body: "{{nome}}, seu pedido está pronto! {{tipo_retirada}}",
    variables: ["nome", "tipo_retirada"],
    is_default: true,
  },
  {
    name: "order_delivering",
    category: "order_status",
    body: "{{nome}}, seu pedido saiu para entrega! Em breve chega até você. 🛵",
    variables: ["nome"],
    is_default: true,
  },
];

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    // Get the unit for this user
    const { unitId } = await req.json();
    const admin = createAdminClient();

    const { data: unit } = await admin
      .from("units")
      .select("id, name, restaurant_id, restaurants(owner_id, plan)")
      .eq("id", unitId)
      .single();

    if (!unit) return NextResponse.json({ error: "Unidade não encontrada" }, { status: 404 });

    const restaurant = (unit as any).restaurants;
    if (restaurant?.owner_id !== user.id) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }
    if (normalizePlanName(restaurant?.plan) !== "business") {
      return NextResponse.json({ error: "Recurso exclusivo do plano Business" }, { status: 403 });
    }

    // Check if instance already exists
    const { data: existing } = await admin
      .from("whatsapp_instances")
      .select("id, zapi_instance_id")
      .eq("unit_id", unitId)
      .single();

    if (existing) {
      return NextResponse.json({ instanceId: existing.zapi_instance_id, alreadyExists: true });
    }

    // Create instance on Z-API
    const zapiResult = await createInstance(`fymenu-${unitId.slice(0, 8)}`);
    if (!zapiResult.success || !zapiResult.data) {
      return NextResponse.json({ error: zapiResult.error ?? "Falha ao criar instância Z-API" }, { status: 502 });
    }

    const { id: zapiInstanceId, token: zapiToken } = zapiResult.data;

    // Save instance to DB
    const { error: insertErr } = await admin.from("whatsapp_instances").insert({
      unit_id: unitId,
      zapi_instance_id: zapiInstanceId,
      zapi_instance_token: zapiToken,
      status: "disconnected",
    });

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    // Create default templates
    await admin.from("whatsapp_templates").insert(
      DEFAULT_TEMPLATES.map((t) => ({ ...t, unit_id: unitId }))
    );

    return NextResponse.json({ instanceId: zapiInstanceId });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro interno" }, { status: 500 });
  }
}
