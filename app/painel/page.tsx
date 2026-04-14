import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

type OrderRow = {
  id: string;
  total: number;
  items: Array<{ code_name?: string; name?: string; qty?: number; unit_price?: number }>;
  status: string;
  waiter_status: string | null;
  payment_method: string | null;
  created_at: string;
};

function getDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

function computeReportStats(ordersList: OrderRow[]) {
  const revenue = ordersList.reduce((s, o) => s + Number(o.total ?? 0), 0);
  const payments = { cash: 0, card: 0, pix: 0 };
  const productMap: Record<string, { qty: number; revenue: number }> = {};

  for (const o of ordersList) {
    if (o.payment_method === "cash") payments.cash += Number(o.total);
    else if (o.payment_method === "card") payments.card += Number(o.total);
    else if (o.payment_method === "pix") payments.pix += Number(o.total);

    const items = Array.isArray(o.items) ? o.items : [];
    for (const item of items) {
      const name: string = item.code_name ?? item.name ?? "Sem nome";
      if (!productMap[name]) productMap[name] = { qty: 0, revenue: 0 };
      productMap[name].qty += item.qty ?? 1;
      productMap[name].revenue += (item.qty ?? 1) * (item.unit_price ?? 0);
    }
  }

  const products = Object.entries(productMap)
    .map(([name, s]) => ({ name, qty: s.qty, revenue: s.revenue }))
    .sort((a, b) => b.qty - a.qty);

  return {
    orders: ordersList.length,
    completed: ordersList.filter((o) => o.waiter_status === "delivered").length,
    revenue,
    avgTicket: ordersList.length > 0 ? Math.round(revenue / ordersList.length) : 0,
    payments,
    products,
  };
}

function getDayStats(ordersList: OrderRow[], days: number, now: Date) {
  const dayMap: Record<string, { orders: number; revenue: number }> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    dayMap[getDateStr(d)] = { orders: 0, revenue: 0 };
  }
  for (const o of ordersList) {
    const key = o.created_at.split("T")[0];
    if (dayMap[key]) {
      dayMap[key].orders++;
      dayMap[key].revenue += Number(o.total ?? 0);
    }
  }
  return Object.entries(dayMap).map(([date, s]) => ({ date, ...s }));
}

export default async function DashboardPage({ searchParams }: { searchParams?: Promise<{ unit_id?: string }> }) {
  const supabase = await createClient();

  // Phase 1: auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  // Phase 2: restaurant (depends on user.id)
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name, plan, status, trial_ends_at, whatsapp, instagram, onboarding_completed, free_access")
    .eq("owner_id", user.id)
    .single();

  if (!restaurant) redirect("/configurar");
  if (!restaurant.onboarding_completed) redirect("/configurar");

  const sp = searchParams ? await searchParams : {};
  const requestedUnitId = sp.unit_id;

  // Phase 3: units — load all, pick in memory (avoids conditional fallback query)
  const { data: unitsData } = await supabase
    .from("units")
    .select("id, name, slug, custom_domain, address, city, neighborhood, whatsapp, instagram, logo_url, cover_url, description, maps_url, delivery_link, is_published, comanda_close_permission")
    .eq("restaurant_id", restaurant.id);

  const unit = (requestedUnitId
    ? (unitsData ?? []).find((u) => u.id === requestedUnitId) ?? unitsData?.[0]
    : unitsData?.[0]) ?? null;

  // Phase 4: parallel — all independent queries that only need unit.id or user.id
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();

  const [
    categoriesRes,
    eventsRes,
    tvCountRes,
    stockRes,
    profileRes,
    ordersRes,
  ] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, order_index, is_active, section, schedule_enabled, available_days, start_time, end_time")
      .eq("unit_id", unit?.id)
      .order("order_index"),
    supabase
      .from("menu_events")
      .select("event")
      .eq("unit_id", unit?.id)
      .gte("created_at", sevenDaysAgo),
    supabase
      .from("tv_media")
      .select("id", { count: "exact", head: true })
      .eq("unit_id", unit?.id)
      .eq("is_active", true),
    supabase
      .from("products")
      .select("stock, stock_minimum, unlimited")
      .eq("unit_id", unit?.id)
      .eq("unlimited", false),
    supabase
      .from("profiles")
      .select("first_name, last_name, phone, address, city")
      .eq("id", user.id)
      .single(),
    supabase
      .from("order_intents")
      .select("id, total, items, status, waiter_status, payment_method, created_at")
      .eq("unit_id", unit?.id)
      .eq("status", "confirmed")
      .gte("created_at", sixtyDaysAgo)
      .order("created_at", { ascending: true }),
  ]);

  const categories = categoriesRes.data ?? [];
  const events = eventsRes.data ?? [];
  const tvCount = tvCountRes.count ?? 0;
  const stockProducts = stockRes.data ?? [];
  const profile = profileRes.data;
  const rawOrders = ordersRes.data ?? [];

  // Phase 5: products (depends on category ids from phase 4)
  const { data: products } = await supabase
    .from("products")
    .select("id, category_id, name, description, price_type, base_price, thumbnail_url, video_url, order_index, is_active, stock, stock_minimum, unlimited, sku, allergens, nutrition, preparation_time, is_age_restricted, is_alcoholic")
    .in("category_id", categories.map((c) => c.id));

  // Phase 6: upsell groups (depends on product ids)
  const upsellGroupIds = (products ?? []).length > 0
    ? (await supabase
        .from("product_upsells")
        .select("id")
        .in("product_id", (products ?? []).map((p) => p.id))
      ).data?.map((u) => u.id) ?? []
    : [];

  // Phase 7: upsell items (depends on upsell group ids)
  const { data: upsellItems } = upsellGroupIds.length > 0
    ? await supabase
        .from("product_upsell_items")
        .select(`id, upsell_id, position, product_upsells!inner(product_id), products!product_upsell_items_product_id_fkey(id, name, base_price, price_type)`)
        .in("upsell_id", upsellGroupIds)
    : { data: [] };

  // Derive analytics from events
  const views = events.filter((e) => e.event === "menu_view").length;
  const clicks = events.filter((e) => e.event === "product_click").length;
  const orders = events.filter((e) => e.event === "whatsapp_click").length;

  const stockStats = {
    out: stockProducts.filter((p) => (p.stock ?? 0) === 0).length,
    low: stockProducts.filter((p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= (p.stock_minimum ?? 10)).length,
  };

  // Report computation (unchanged logic)
  const todayStr = getDateStr(now);
  const allOrders = rawOrders as OrderRow[];
  const thirtyDaysAgoDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgoDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const todayOrders = allOrders.filter((o) => o.created_at.startsWith(todayStr));
  const weeklyOrders = allOrders.filter((o) => new Date(o.created_at) >= sevenDaysAgoDate);
  const monthlyOrders = allOrders.filter((o) => new Date(o.created_at) >= thirtyDaysAgoDate);
  const prevMonthOrders = allOrders.filter((o) => new Date(o.created_at) < thirtyDaysAgoDate);

  const todayReportStats = computeReportStats(todayOrders);
  const weeklyReportStats = computeReportStats(weeklyOrders);
  const monthlyReportStats = computeReportStats(monthlyOrders);
  const prevReportStats = computeReportStats(prevMonthOrders);

  const growthOrders = prevReportStats.orders > 0
    ? Math.round(((monthlyReportStats.orders - prevReportStats.orders) / prevReportStats.orders) * 100)
    : null;
  const growthRevenue = prevReportStats.revenue > 0
    ? Math.round(((monthlyReportStats.revenue - prevReportStats.revenue) / prevReportStats.revenue) * 100)
    : null;

  const reportData = {
    today: todayReportStats,
    weekly: { ...weeklyReportStats, byDay: getDayStats(weeklyOrders, 7, now) },
    monthly: {
      ...monthlyReportStats,
      byDay: getDayStats(monthlyOrders, 30, now),
      growthOrders,
      growthRevenue,
    },
  };

  return (
    <DashboardClient
      restaurant={restaurant}
      unit={unit ?? null}
      profile={{ first_name: null, last_name: null, phone: null, address: null, city: null, ...profile, email: user.email }}
      categories={categories}
      products={products ?? []}
      upsellItems={upsellItems ?? []}
      analytics={{ views, clicks, orders }}
      tvCount={tvCount}
      stockStats={stockStats}
      reportData={reportData}
    />
  );
}
