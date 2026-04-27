import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUnitMember } from "@/lib/tenant/isRestaurantMember";

async function verifyOwner(userId: string, unitId: string) {
  const admin = createAdminClient();
  const ok = await isUnitMember(admin, userId, unitId);
  return ok ? admin : null;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const unitId = req.nextUrl.searchParams.get("unit_id");
    if (!unitId) return NextResponse.json({ error: "unit_id obrigatório" }, { status: 400 });

    const admin = await verifyOwner(user.id, unitId);
    if (!admin) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

    const { data, error } = await admin
      .from("whatsapp_templates")
      .select("*")
      .eq("unit_id", unitId)
      .eq("is_active", true)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { unitId, name, category, body, variables } = await req.json();
    if (!unitId || !name || !body) return NextResponse.json({ error: "unitId, name e body obrigatórios" }, { status: 400 });

    const admin = await verifyOwner(user.id, unitId);
    if (!admin) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

    const { data, error } = await admin
      .from("whatsapp_templates")
      .insert({ unit_id: unitId, name, category: category ?? "marketing", body, variables: variables ?? [] })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro interno" }, { status: 500 });
  }
}
