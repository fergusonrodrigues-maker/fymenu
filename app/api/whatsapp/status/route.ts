import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStatus } from "@/lib/zapi";
import { isUnitMember } from "@/lib/tenant/isRestaurantMember";

export async function GET(req: NextRequest) {
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
      .select("id, zapi_instance_id, zapi_instance_token, zapi_client_token")
      .eq("unit_id", unitId)
      .single();

    if (!instance) return NextResponse.json({ error: "Instância não configurada" }, { status: 404 });

    const result = await getStatus(
      instance.zapi_instance_id,
      instance.zapi_instance_token,
      instance.zapi_client_token ?? undefined
    );
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    const connected = result.data?.connected ?? false;
    const phone = result.data?.phone ?? null;
    const newStatus = connected ? "connected" : "disconnected";

    await admin
      .from("whatsapp_instances")
      .update({
        status: newStatus,
        phone_number: phone,
        connected_at: connected ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", instance.id);

    return NextResponse.json({ status: newStatus, phone });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro interno" }, { status: 500 });
  }
}
