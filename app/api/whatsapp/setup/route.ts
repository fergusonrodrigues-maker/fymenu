// POST /api/whatsapp/setup
// Saves manually-entered Z-API credentials for a unit.
// Caller: admin (ADMIN_EMAIL) OR owner of the restaurant.
// Returns { success, qrCode? } — qrCode is base64 if instance responds immediately.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getQrCode } from "@/lib/zapi";

const DEFAULT_TEMPLATES = [
  {
    name: "Pedido recebido",
    category: "order_status",
    body: "Olá {{nome}}! Recebemos seu pedido. Estamos preparando!",
    variables: ["nome"],
    is_default: true,
  },
  {
    name: "Pedido em preparo",
    category: "order_status",
    body: "{{nome}}, seu pedido está sendo preparado pela nossa cozinha!",
    variables: ["nome"],
    is_default: true,
  },
  {
    name: "Pedido pronto",
    category: "order_status",
    body: "{{nome}}, seu pedido está pronto para retirada!",
    variables: ["nome"],
    is_default: true,
  },
  {
    name: "Saiu para entrega",
    category: "order_status",
    body: "{{nome}}, seu pedido saiu para entrega! Em breve chega até você.",
    variables: ["nome"],
    is_default: true,
  },
  {
    name: "Promoção",
    category: "marketing",
    body: "Olá {{nome}}! Temos novidades especiais pra você. Confira nosso cardápio!",
    variables: ["nome"],
    is_default: true,
  },
  {
    name: "Fidelidade",
    category: "marketing",
    body: "{{nome}}, obrigado pela preferência! Você já fez {{total_pedidos}} pedidos conosco.",
    variables: ["nome", "total_pedidos"],
    is_default: true,
  },
];

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { unitId, instanceId, instanceToken, clientToken } = await req.json();
    if (!unitId || !instanceId || !instanceToken) {
      return NextResponse.json({ error: "unitId, instanceId e instanceToken são obrigatórios" }, { status: 400 });
    }

    const admin = createAdminClient();
    const isAdmin = !!(process.env.ADMIN_EMAIL && user.email === process.env.ADMIN_EMAIL);

    if (!isAdmin) {
      // Verify owner
      const { data: unit } = await admin
        .from("units")
        .select("id, restaurants(owner_id)")
        .eq("id", unitId)
        .single();

      if (!unit || (unit as any).restaurants?.owner_id !== user.id) {
        return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
      }
    }

    // Upsert instance (on conflict unit_id → update credentials)
    const { data: upserted, error: upsertErr } = await admin
      .from("whatsapp_instances")
      .upsert(
        {
          unit_id: unitId,
          zapi_instance_id: instanceId,
          zapi_instance_token: instanceToken,
          zapi_client_token: clientToken ?? null,
          status: "disconnected",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "unit_id" }
      )
      .select("id")
      .single();

    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }

    // Create default templates only if none exist yet
    const { count } = await admin
      .from("whatsapp_templates")
      .select("id", { count: "exact", head: true })
      .eq("unit_id", unitId);

    if (!count || count === 0) {
      await admin.from("whatsapp_templates").insert(
        DEFAULT_TEMPLATES.map((t) => ({ ...t, unit_id: unitId }))
      );
    }

    // Try to fetch QR code immediately (may not be ready yet — that's fine)
    let qrCode: string | null = null;
    try {
      const qrResult = await getQrCode(instanceId, instanceToken, clientToken ?? undefined);
      if (qrResult.success && qrResult.data?.value) {
        qrCode = qrResult.data.value;
      }
    } catch {
      // QR not ready yet — client will poll separately
    }

    return NextResponse.json({ success: true, instanceDbId: upserted?.id, qrCode });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro interno" }, { status: 500 });
  }
}
