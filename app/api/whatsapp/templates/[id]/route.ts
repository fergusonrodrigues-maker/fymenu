import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const body = await req.json();
    const admin = createAdminClient();

    // Verify ownership via template→unit→restaurant
    const { data: tpl } = await admin
      .from("whatsapp_templates")
      .select("id, unit_id, units(restaurants(owner_id))")
      .eq("id", id)
      .single();

    if (!tpl) return NextResponse.json({ error: "Template não encontrado" }, { status: 404 });
    const ownerCheck = (tpl as any).units?.restaurants?.owner_id;
    if (ownerCheck !== user.id) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

    const allowed = ["name", "category", "body", "variables", "is_active"];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    const { data, error } = await admin
      .from("whatsapp_templates")
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const admin = createAdminClient();

    const { data: tpl } = await admin
      .from("whatsapp_templates")
      .select("id, is_default, units(restaurants(owner_id))")
      .eq("id", id)
      .single();

    if (!tpl) return NextResponse.json({ error: "Template não encontrado" }, { status: 404 });
    const ownerCheck = (tpl as any).units?.restaurants?.owner_id;
    if (ownerCheck !== user.id) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

    // Soft delete — preserve defaults
    await admin.from("whatsapp_templates").update({ is_active: false }).eq("id", id);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro interno" }, { status: 500 });
  }
}
