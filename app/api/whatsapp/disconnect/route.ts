import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { disconnect } from "@/lib/zapi";
import { isUnitMember } from "@/lib/tenant/isRestaurantMember";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { unitId } = await req.json();
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

    if (!instance) return NextResponse.json({ error: "Instância não encontrada" }, { status: 404 });

    await disconnect(
      instance.zapi_instance_id,
      instance.zapi_instance_token,
      instance.zapi_client_token ?? undefined
    );

    await admin
      .from("whatsapp_instances")
      .update({ status: "disconnected", phone_number: null, connected_at: null, updated_at: new Date().toISOString() })
      .eq("id", instance.id);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro interno" }, { status: 500 });
  }
}
