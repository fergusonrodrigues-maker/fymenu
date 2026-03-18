import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import AdminRelatoriosClient from "./AdminRelatoriosClient";

export const metadata = { title: "Admin Relatórios — FyMenu" };

export default async function AdminRelatoriosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || user.email !== adminEmail) redirect("/painel");

  const admin = createAdminClient();
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: restaurants },
    { data: ordersAll },
    { data: ordersToday },
    { data: ordersWeek },
    { data: ordersMonth },
    { data: payments30d },
  ] = await Promise.all([
    admin.from("restaurants").select("id, name, plan, status, created_at").order("created_at", { ascending: false }),
    admin.from("order_intents").select("id, restaurant_id, total, status").eq("status", "confirmed"),
    admin.from("order_intents").select("id, restaurant_id, total").eq("status", "confirmed").gte("created_at", todayStr),
    admin.from("order_intents").select("id, restaurant_id, total").eq("status", "confirmed").gte("created_at", sevenDaysAgo),
    admin.from("order_intents").select("id, restaurant_id, total").eq("status", "confirmed").gte("created_at", thirtyDaysAgo),
    admin.from("payments").select("amount").gte("processed_at", thirtyDaysAgo),
  ]);

  const totalOrders = ordersAll?.length ?? 0;
  const todayOrders = ordersToday?.length ?? 0;
  const weekOrders = ordersWeek?.length ?? 0;
  const monthOrders = ordersMonth?.length ?? 0;

  const revenue30d = payments30d?.reduce((s, p) => s + Number(p.amount ?? 0), 0) ?? 0;
  const revenueToday = ordersToday?.reduce((s, o) => s + Number(o.total ?? 0), 0) ?? 0;
  const revenueWeek = ordersWeek?.reduce((s, o) => s + Number(o.total ?? 0), 0) ?? 0;

  // Revenue per restaurant (30d)
  const revenueByRestaurant: Record<string, number> = {};
  const ordersByRestaurant: Record<string, number> = {};
  for (const o of ordersMonth ?? []) {
    const rid = o.restaurant_id;
    revenueByRestaurant[rid] = (revenueByRestaurant[rid] ?? 0) + Number(o.total ?? 0);
    ordersByRestaurant[rid] = (ordersByRestaurant[rid] ?? 0) + 1;
  }

  // Top 10 restaurants by revenue
  const topRestaurants = (restaurants ?? [])
    .map((r) => ({
      ...r,
      revenue30d: revenueByRestaurant[r.id] ?? 0,
      orders30d: ordersByRestaurant[r.id] ?? 0,
    }))
    .sort((a, b) => b.revenue30d - a.revenue30d)
    .slice(0, 10);

  // Low activity: no orders in 10 days
  const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentActive } = await admin
    .from("order_intents")
    .select("restaurant_id")
    .gte("created_at", tenDaysAgo)
    .eq("status", "confirmed");
  const activeSet = new Set((recentActive ?? []).map((o) => o.restaurant_id));
  const lowActivity = (restaurants ?? []).filter((r) => !activeSet.has(r.id));

  return (
    <AdminRelatoriosClient
      global={{
        totalRestaurants: restaurants?.length ?? 0,
        activeRestaurants: activeSet.size,
        totalOrders,
        todayOrders,
        weekOrders,
        monthOrders,
        revenue30d,
        revenueToday,
        revenueWeek,
        avgTicket: totalOrders > 0 ? Math.round(revenue30d / Math.max(monthOrders, 1)) : 0,
      }}
      topRestaurants={topRestaurants}
      lowActivity={lowActivity}
    />
  );
}
