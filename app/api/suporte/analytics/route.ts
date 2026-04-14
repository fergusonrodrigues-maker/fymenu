import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateSuporteToken, hasPermission } from "@/lib/suporte-auth";

export async function GET(req: NextRequest) {
  const staff = await validateSuporteToken(req);
  if (!staff) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!hasPermission(staff, "ver_analytics"))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const unit_id = searchParams.get("unit_id");
  const range = searchParams.get("range") ?? "7d";

  if (!unit_id) return NextResponse.json({ error: "unit_id obrigatório" }, { status: 400 });

  const days = range === "30d" ? 30 : 7;
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const admin = createAdminClient();

  // Unit info
  const { data: unit } = await admin
    .from("units")
    .select("id, name, slug, restaurants(name)")
    .eq("id", unit_id)
    .single();

  // Raw events
  const { data: events, error } = await admin
    .from("menu_events")
    .select("id, event, product_id, created_at")
    .eq("unit_id", unit_id)
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Aggregate
  const totals: Record<string, number> = {};
  const byDay: Record<string, Record<string, number>> = {};

  for (const ev of events ?? []) {
    totals[ev.event] = (totals[ev.event] ?? 0) + 1;
    const day = ev.created_at.slice(0, 10);
    if (!byDay[day]) byDay[day] = {};
    byDay[day][ev.event] = (byDay[day][ev.event] ?? 0) + 1;
  }

  return NextResponse.json({ unit, totals, byDay, range, total_events: events?.length ?? 0 });
}
