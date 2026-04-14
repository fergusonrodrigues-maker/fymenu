import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateSuporteToken, hasPermission } from "@/lib/suporte-auth";

export async function GET(req: NextRequest) {
  const staff = await validateSuporteToken(req);
  if (!staff) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!hasPermission(staff, "ver_restaurantes"))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("q") ?? "";
  const plan = searchParams.get("plan") ?? "all";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 25;
  const from = (page - 1) * limit;

  const admin = createAdminClient();

  let query = admin
    .from("restaurants")
    .select("id, name, plan, status, free_access, trial_ends_at, created_at, asaas_customer_id", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1);

  if (search) query = query.ilike("name", `%${search}%`);
  if (plan !== "all") query = query.eq("plan", plan);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, count, page, limit });
}
