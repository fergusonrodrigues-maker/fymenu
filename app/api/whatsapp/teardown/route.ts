import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteInstance } from "@/lib/zapi";

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const unitId = req.nextUrl.searchParams.get("unit_id");
    if (!unitId) return NextResponse.json({ error: "unit_id obrigatório" }, { status: 400 });

    const admin = createAdminClient();

    const { data: unit } = await admin
      .from("units")
      .select("id, restaurants(owner_id)")
      .eq("id", unitId)
      .single();

    if (!unit || (unit as any).restaurants?.owner_id !== user.id) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const { data: instance } = await admin
      .from("whatsapp_instances")
      .select("id, zapi_instance_id")
      .eq("unit_id", unitId)
      .single();

    if (!instance) return NextResponse.json({ success: true }); // already gone

    // Delete from Z-API (stop billing)
    await deleteInstance(instance.zapi_instance_id);

    // Mark as disconnected — keep row for message history audit
    await admin
      .from("whatsapp_instances")
      .update({ status: "disconnected", phone_number: null, connected_at: null, updated_at: new Date().toISOString() })
      .eq("id", instance.id);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro interno" }, { status: 500 });
  }
}
