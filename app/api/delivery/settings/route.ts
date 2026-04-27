import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateSuporteToken, hasPermission } from "@/lib/suporte-auth";
import { isUnitMember } from "@/lib/tenant/isRestaurantMember";

async function resolveAuth(req: NextRequest, unitId: string): Promise<boolean> {
  const suporteToken = req.headers.get("x-suporte-token");
  if (suporteToken) {
    const staff = await validateSuporteToken(req);
    return !!(staff && hasPermission(staff, "gerenciar_planos"));
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const admin = createAdminClient();
  return isUnitMember(admin, user.id, unitId);
}

// GET /api/delivery/settings?unit_id=X  (public delivery config for cart)
export async function GET(req: NextRequest) {
  const unitId = req.nextUrl.searchParams.get("unit_id");
  if (!unitId) return NextResponse.json({ error: "unit_id obrigatório" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("units")
    .select("id, delivery_enabled, delivery_latitude, delivery_longitude, delivery_max_km, delivery_min_order")
    .eq("id", unitId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PATCH /api/delivery/settings
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { unit_id, delivery_enabled, delivery_latitude, delivery_longitude, delivery_max_km, delivery_min_order } = body;
    if (!unit_id) return NextResponse.json({ error: "unit_id obrigatório" }, { status: 400 });

    const ok = await resolveAuth(req, unit_id);
    if (!ok) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

    const updates: Record<string, unknown> = {};
    if (delivery_enabled     !== undefined) updates.delivery_enabled     = delivery_enabled;
    if (delivery_latitude    !== undefined) updates.delivery_latitude    = delivery_latitude !== null ? Number(delivery_latitude) : null;
    if (delivery_longitude   !== undefined) updates.delivery_longitude   = delivery_longitude !== null ? Number(delivery_longitude) : null;
    if (delivery_max_km      !== undefined) updates.delivery_max_km      = Number(delivery_max_km);
    if (delivery_min_order   !== undefined) updates.delivery_min_order   = Number(delivery_min_order);

    const admin = createAdminClient();
    const { error } = await admin.from("units").update(updates).eq("id", unit_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro interno" }, { status: 500 });
  }
}
