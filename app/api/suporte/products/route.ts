import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateSuporteToken, hasPermission } from "@/lib/suporte-auth";

export async function GET(req: NextRequest) {
  const staff = await validateSuporteToken(req);
  if (!staff) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!hasPermission(staff, "view_products") && !hasPermission(staff, "edit_products")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("q") ?? "";
  const activeFilter = searchParams.get("active") ?? "all";
  const unit_id = searchParams.get("unit_id") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 20;
  const from = (page - 1) * limit;

  const admin = createAdminClient();

  let query = admin
    .from("products")
    .select(`id, name, description, base_price, is_active, product_type, created_at,
      units!inner(id, slug, restaurants!inner(name)),
      categories(id, name)`, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1);

  if (search) query = query.ilike("name", `%${search}%`);
  if (unit_id) query = query.eq("unit_id", unit_id);
  if (activeFilter === "active") query = query.eq("is_active", true);
  if (activeFilter === "inactive") query = query.eq("is_active", false);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, count, page, limit });
}

export async function PATCH(req: NextRequest) {
  const staff = await validateSuporteToken(req);
  if (!staff) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!hasPermission(staff, "edit_products")) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id, name, description, base_price, is_active } = await req.json();
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin
    .from("products")
    .update({ name, description, base_price, is_active })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
