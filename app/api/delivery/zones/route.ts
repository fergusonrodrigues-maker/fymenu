import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateSuporteToken, hasPermission } from "@/lib/suporte-auth";
import { isUnitMember } from "@/lib/tenant/isRestaurantMember";

async function resolveAuth(req: NextRequest, unitId: string): Promise<boolean> {
  // Try suporte token first
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

// GET /api/delivery/zones?unit_id=X
export async function GET(req: NextRequest) {
  const unitId = req.nextUrl.searchParams.get("unit_id");
  if (!unitId) return NextResponse.json({ error: "unit_id obrigatório" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("delivery_zones")
    .select("id, min_km, max_km, fee, is_active, created_at")
    .eq("unit_id", unitId)
    .order("min_km", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/delivery/zones
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { unit_id, min_km, max_km, fee } = body;
    if (!unit_id) return NextResponse.json({ error: "unit_id obrigatório" }, { status: 400 });

    const ok = await resolveAuth(req, unit_id);
    if (!ok) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

    if (min_km === undefined || max_km === undefined || fee === undefined) {
      return NextResponse.json({ error: "min_km, max_km e fee são obrigatórios" }, { status: 400 });
    }
    if (Number(min_km) >= Number(max_km)) {
      return NextResponse.json({ error: "min_km deve ser menor que max_km" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("delivery_zones")
      .insert({ unit_id, min_km: Number(min_km), max_km: Number(max_km), fee: Number(fee) })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro interno" }, { status: 500 });
  }
}
