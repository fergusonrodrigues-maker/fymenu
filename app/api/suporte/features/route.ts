import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateSuporteToken, hasPermission } from "@/lib/suporte-auth";

export async function GET(req: NextRequest) {
  const staff = await validateSuporteToken(req);
  if (!staff) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!hasPermission(staff, "manage_features")) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("q") ?? "";
  const unit_id = searchParams.get("unit_id") ?? "";

  const admin = createAdminClient();

  let query = admin
    .from("unit_features")
    .select(`id, feature, enabled, created_at,
      units!inner(id, name, slug, restaurants!inner(name))`)
    .order("feature");

  if (search) query = query.ilike("feature", `%${search}%`);
  if (unit_id) query = query.eq("unit_id", unit_id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest) {
  const staff = await validateSuporteToken(req);
  if (!staff) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!hasPermission(staff, "manage_features")) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id, enabled } = await req.json();
  if (!id || typeof enabled !== "boolean") {
    return NextResponse.json({ error: "id e enabled obrigatórios" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("unit_features").update({ enabled }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
