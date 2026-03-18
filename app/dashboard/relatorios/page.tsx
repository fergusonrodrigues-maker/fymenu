import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import RelatoriosClient from "./RelatoriosClient";

export const metadata = { title: "Relatórios — FyMenu" };

type OrderRow = {
  id: string;
  total: number;
  items: Array<{ code_name?: string; name?: string; qty?: number; unit_price?: number }>;
  status: string;
  waiter_status: string | null;
  payment_method: string | null;
  created_at: string;
  waiter_confirmed_at: string | null;
  paid_at: string | null;
};

function getDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

function computeStats(ordersList: OrderRow[]) {
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

export default async function RelatoriosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name")
    .eq("owner_id", user.id)
    .single();
  if (!restaurant) redirect("/login");

  const { data: unit } = await supabase
    .from("units")
    .select("id, name")
    .eq("restaurant_id", restaurant.id)
    .single();
  if (!unit) redirect("/dashboard");

  const now = new Date();
  const todayStr = getDateStr(now);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch 60 days to compare current vs previous 30d
  const { data: raw } = await supabase
    .from("order_intents")
    .select(
      "id, total, items, status, waiter_status, payment_method, created_at, waiter_confirmed_at, paid_at"
    )
    .eq("unit_id", unit.id)
    .eq("status", "confirmed")
    .gte("created_at", sixtyDaysAgo)
    .order("created_at", { ascending: true });

  const all = (raw ?? []) as OrderRow[];
  const thirtyDaysAgoDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgoDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const todayOrders = all.filter((o) => o.created_at.startsWith(todayStr));
  const weeklyOrders = all.filter((o) => new Date(o.created_at) >= sevenDaysAgoDate);
  const monthlyOrders = all.filter((o) => new Date(o.created_at) >= thirtyDaysAgoDate);
  const prevMonthOrders = all.filter((o) => new Date(o.created_at) < thirtyDaysAgoDate);

  const todayStats = computeStats(todayOrders);
  const weeklyStats = computeStats(weeklyOrders);
  const monthlyStats = computeStats(monthlyOrders);
  const prevStats = computeStats(prevMonthOrders);

  const growthOrders =
    prevStats.orders > 0
      ? Math.round(((monthlyStats.orders - prevStats.orders) / prevStats.orders) * 100)
      : null;
  const growthRevenue =
    prevStats.revenue > 0
      ? Math.round(((monthlyStats.revenue - prevStats.revenue) / prevStats.revenue) * 100)
      : null;

  return (
    <RelatoriosClient
      unitName={unit.name}
      restaurantName={restaurant.name}
      today={todayStats}
      weekly={{ ...weeklyStats, byDay: getDayStats(weeklyOrders, 7, now) }}
      monthly={{
        ...monthlyStats,
        byDay: getDayStats(monthlyOrders, 30, now),
        growthOrders,
        growthRevenue,
      }}
    />
  );
}
