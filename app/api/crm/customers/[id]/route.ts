import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRestaurantMember } from "@/lib/tenant/isRestaurantMember";

async function resolveOwnership(
  admin: ReturnType<typeof createAdminClient>,
  customerId: string,
  userId: string
) {
  const { data } = await admin
    .from("crm_customers")
    .select("id, unit_id, units(restaurant_id)")
    .eq("id", customerId)
    .single();
  if (!data) return null;
  const restaurantId = (data as any).units?.restaurant_id;
  if (!restaurantId || !await isRestaurantMember(admin, userId, restaurantId)) return null;
  return data;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const admin = createAdminClient();
    const existing = await resolveOwnership(admin, id, user.id);
    if (!existing) return NextResponse.json({ error: "Não encontrado ou sem permissão" }, { status: 404 });

    const body = await req.json();
    const allowed = ["name", "phone", "address", "neighborhood", "city", "tags", "notes"];
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    for (const field of allowed) {
      if (field in body) {
        if (field === "phone") {
          const clean = (body.phone as string).replace(/\D/g, "");
          if (clean.length < 10 || clean.length > 11) {
            return NextResponse.json({ error: "Telefone inválido" }, { status: 400 });
          }
          updates.phone = clean;
        } else if (field === "tags") {
          updates.tags = Array.isArray(body.tags) ? body.tags : null;
        } else {
          updates[field] = typeof body[field] === "string" ? body[field].trim() || null : body[field];
        }
      }
    }

    const { data, error } = await admin
      .from("crm_customers")
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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const admin = createAdminClient();
    const existing = await resolveOwnership(admin, id, user.id);
    if (!existing) return NextResponse.json({ error: "Não encontrado ou sem permissão" }, { status: 404 });

    const { error } = await admin
      .from("crm_customers")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro interno" }, { status: 500 });
  }
}
