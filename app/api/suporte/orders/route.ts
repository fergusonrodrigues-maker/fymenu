import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateSuporteToken, hasPermission } from "@/lib/suporte-auth";

export async function GET(req: NextRequest) {
  const staff = await validateSuporteToken(req);
  if (!staff) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!hasPermission(staff, "view_orders")) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "all";
  const range = searchParams.get("range") ?? "7d";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 20;
  const from = (page - 1) * limit;

  const admin = createAdminClient();

  const now = new Date();
  const dateFrom =
    range === "today"
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      : range === "30d"
      ? new Date(Date.now() - 30 * 86400000).toISOString()
      : new Date(Date.now() - 7 * 86400000).toISOString();

  let query = admin
    .from("order_intents")
    .select(`id, table_number, total, payment_method, status, notes, created_at,
      units!inner(id, slug, city, restaurants!inner(name))`, { count: "exact" })
    .gte("created_at", dateFrom)
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1);

  if (status !== "all") query = query.eq("status", status);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, count, page, limit });
}
