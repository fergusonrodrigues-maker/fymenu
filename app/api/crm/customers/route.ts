import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function cleanPhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

async function resolveUnit(admin: ReturnType<typeof createAdminClient>, unitId: string, userId: string) {
  const { data } = await admin
    .from("units")
    .select("id, restaurants(owner_id)")
    .eq("id", unitId)
    .single();
  if (!data || (data as any).restaurants?.owner_id !== userId) return null;
  return data;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { unitId, name, phone, address, neighborhood, city, tags, notes } = await req.json();
    if (!unitId || !name?.trim() || !phone?.trim()) {
      return NextResponse.json({ error: "unitId, name e phone são obrigatórios" }, { status: 400 });
    }

    const admin = createAdminClient();
    const unit = await resolveUnit(admin, unitId, user.id);
    if (!unit) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

    const phoneClean = cleanPhone(phone);
    if (phoneClean.length < 10 || phoneClean.length > 11) {
      return NextResponse.json({ error: "Telefone inválido (deve ter 10 ou 11 dígitos)" }, { status: 400 });
    }

    // Check duplicate
    const { data: existing } = await admin
      .from("crm_customers")
      .select("id, name, phone")
      .eq("unit_id", unitId)
      .eq("phone", phoneClean)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "duplicate", customer: existing }, { status: 409 });
    }

    const { data, error } = await admin
      .from("crm_customers")
      .insert({
        unit_id: unitId,
        name: name.trim(),
        phone: phoneClean,
        address: address?.trim() || null,
        neighborhood: neighborhood?.trim() || null,
        city: city?.trim() || null,
        tags: Array.isArray(tags) ? tags : null,
        notes: notes?.trim() || null,
        source: "manual",
        total_orders: 0,
        total_spent: 0,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro interno" }, { status: 500 });
  }
}
