import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUnitMember } from "@/lib/tenant/isRestaurantMember";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const sp = req.nextUrl.searchParams;
    const unitId = sp.get("unit_id");
    if (!unitId) return NextResponse.json({ error: "unit_id obrigatório" }, { status: 400 });

    const page = Math.max(1, parseInt(sp.get("page") ?? "1"));
    const pageSize = 30;
    const status = sp.get("status");
    const triggerType = sp.get("trigger_type");
    const period = sp.get("period"); // e.g. "7d", "30d"

    const admin = createAdminClient();

    if (!await isUnitMember(admin, user.id, unitId)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    let query = admin
      .from("whatsapp_messages")
      .select("*, crm_customers(name)", { count: "exact" })
      .eq("unit_id", unitId)
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (status) query = query.eq("status", status);
    if (triggerType) query = query.eq("trigger_type", triggerType);
    if (period) {
      const days = parseInt(period);
      if (!isNaN(days)) {
        const since = new Date(Date.now() - days * 86400000).toISOString();
        query = query.gte("created_at", since);
      }
    }

    const { data, error, count } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ messages: data ?? [], total: count ?? 0, page, pageSize });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro interno" }, { status: 500 });
  }
}
