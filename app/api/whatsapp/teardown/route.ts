// DELETE /api/whatsapp/teardown?unit_id=X
// Removes credentials from DB when restaurant cancels Business plan.
// Does NOT call Z-API (credentials are manually managed).
// Caller: admin (ADMIN_EMAIL) OR owner of the restaurant.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUnitMember } from "@/lib/tenant/isRestaurantMember";

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const unitId = req.nextUrl.searchParams.get("unit_id");
    if (!unitId) return NextResponse.json({ error: "unit_id obrigatório" }, { status: 400 });

    const admin = createAdminClient();
    const isAdmin = !!(process.env.ADMIN_EMAIL && user.email === process.env.ADMIN_EMAIL);

    if (!isAdmin && !await isUnitMember(admin, user.id, unitId)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const { data: instance } = await admin
      .from("whatsapp_instances")
      .select("id")
      .eq("unit_id", unitId)
      .single();

    if (!instance) return NextResponse.json({ success: true });

    // Mark disconnected and clear credentials — keep row for message history audit
    await admin
      .from("whatsapp_instances")
      .update({
        status: "disconnected",
        zapi_instance_id: "",
        zapi_instance_token: "",
        zapi_client_token: null,
        phone_number: null,
        connected_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", instance.id);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro interno" }, { status: 500 });
  }
}
