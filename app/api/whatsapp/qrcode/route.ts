import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getQrCode } from "@/lib/zapi";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const unitId = req.nextUrl.searchParams.get("unit_id");
    if (!unitId) return NextResponse.json({ error: "unit_id obrigatório" }, { status: 400 });

    const admin = createAdminClient();

    // Verify ownership
    const { data: unit } = await admin
      .from("units")
      .select("id, restaurant_id, restaurants(owner_id)")
      .eq("id", unitId)
      .single();

    if (!unit || (unit as any).restaurants?.owner_id !== user.id) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const { data: instance } = await admin
      .from("whatsapp_instances")
      .select("zapi_instance_id, zapi_instance_token")
      .eq("unit_id", unitId)
      .single();

    if (!instance) return NextResponse.json({ error: "Instância não configurada" }, { status: 404 });

    const result = await getQrCode(instance.zapi_instance_id, instance.zapi_instance_token);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    return NextResponse.json({ qrcode: result.data?.value });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro interno" }, { status: 500 });
  }
}
