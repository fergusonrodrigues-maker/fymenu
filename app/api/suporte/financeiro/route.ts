import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateSuporteToken, hasPermission } from "@/lib/suporte-auth";

export async function GET(req: NextRequest) {
  const staff = await validateSuporteToken(req);
  if (!staff) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const unit_id = searchParams.get("unit_id");
  const range = searchParams.get("range") ?? "30d";
  const days = range === "7d" ? 7 : 30;
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const admin = createAdminClient();

  // Global view — only gerente+ can see this
  if (!unit_id) {
    if (!hasPermission(staff, "ver_financeiro_global"))
      return NextResponse.json({ error: "Sem permissão para visão global" }, { status: 403 });

    // MRR via subscriptions
    const { data: subs } = await admin
      .from("subscriptions")
      .select("id, restaurant_id, status, restaurants(name, plan)");

    const active_subs = subs?.filter((s: any) => s.status === "active") ?? [];
    const churned_subs = subs?.filter((s: any) => s.status === "canceled") ?? [];

    // Revenue by restaurant (confirmed orders)
    const { data: orders } = await admin
      .from("order_intents")
      .select("unit_id, total, status, created_at, units!inner(restaurant_id, restaurants!inner(name))")
      .eq("status", "confirmed")
      .gte("created_at", since);

    const revenueByRestaurant: Record<string, { name: string; revenue: number; orders: number }> = {};
    for (const o of orders ?? []) {
      const rname = (o.units as any)?.restaurants?.name ?? "—";
      const rid = (o.units as any)?.restaurant_id ?? "?";
      if (!revenueByRestaurant[rid]) revenueByRestaurant[rid] = { name: rname, revenue: 0, orders: 0 };
      revenueByRestaurant[rid].revenue += o.total ?? 0;
      revenueByRestaurant[rid].orders += 1;
    }

    const total_revenue = orders?.reduce((s: number, o: any) => s + (o.total ?? 0), 0) ?? 0;

    return NextResponse.json({
      mode: "global",
      range,
      total_revenue,
      active_subscriptions: active_subs.length,
      churned_subscriptions: churned_subs.length,
      revenue_by_restaurant: Object.entries(revenueByRestaurant)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => b.revenue - a.revenue),
    });
  }

  // Per-unit view — moderador+
  if (!hasPermission(staff, "ver_financeiro_unidade"))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { data: unit } = await admin
    .from("units")
    .select("id, name, slug, restaurants(name)")
    .eq("id", unit_id)
    .single();

  const { data: orders } = await admin
    .from("order_intents")
    .select("id, total, status, payment_method, created_at")
    .eq("unit_id", unit_id)
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  const confirmed = orders?.filter((o: any) => o.status === "confirmed") ?? [];
  const total_revenue = confirmed.reduce((s: number, o: any) => s + (o.total ?? 0), 0);
  const total_orders = confirmed.length;

  const byDay: Record<string, { revenue: number; orders: number }> = {};
  for (const o of confirmed) {
    const day = o.created_at.slice(0, 10);
    if (!byDay[day]) byDay[day] = { revenue: 0, orders: 0 };
    byDay[day].revenue += o.total ?? 0;
    byDay[day].orders += 1;
  }

  const byMethod: Record<string, number> = {};
  for (const o of confirmed) {
    const m = o.payment_method ?? "outro";
    byMethod[m] = (byMethod[m] ?? 0) + (o.total ?? 0);
  }

  return NextResponse.json({
    mode: "unit",
    unit,
    range,
    total_revenue,
    total_orders,
    byDay,
    byMethod,
  });
}
