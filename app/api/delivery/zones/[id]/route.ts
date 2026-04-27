import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateSuporteToken, hasPermission } from "@/lib/suporte-auth";
import { isUnitMember } from "@/lib/tenant/isRestaurantMember";

async function resolveZoneAuth(req: NextRequest, zoneId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data: zone } = await admin
    .from("delivery_zones")
    .select("unit_id")
    .eq("id", zoneId)
    .single();
  if (!zone) return false;

  const suporteToken = req.headers.get("x-suporte-token");
  if (suporteToken) {
    const staff = await validateSuporteToken(req);
    return !!(staff && hasPermission(staff, "gerenciar_planos"));
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  return isUnitMember(admin, user.id, zone.unit_id);
}

// PATCH /api/delivery/zones/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ok = await resolveZoneAuth(req, id);
    if (!ok) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

    const body = await req.json();
    const updates: Record<string, unknown> = {};
    if (body.min_km !== undefined) updates.min_km = Number(body.min_km);
    if (body.max_km !== undefined) updates.max_km = Number(body.max_km);
    if (body.fee    !== undefined) updates.fee    = Number(body.fee);
    if (body.is_active !== undefined) updates.is_active = body.is_active;

    if (
      updates.min_km !== undefined &&
      updates.max_km !== undefined &&
      Number(updates.min_km) >= Number(updates.max_km)
    ) {
      return NextResponse.json({ error: "min_km deve ser menor que max_km" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("delivery_zones")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro interno" }, { status: 500 });
  }
}

// DELETE /api/delivery/zones/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ok = await resolveZoneAuth(req, id);
    if (!ok) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

    const admin = createAdminClient();
    const { error } = await admin.from("delivery_zones").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro interno" }, { status: 500 });
  }
}
