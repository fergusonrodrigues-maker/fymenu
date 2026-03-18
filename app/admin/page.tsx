import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import AdminClient from "./AdminClient";

export const metadata = { title: "Admin — FyMenu" };

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || user.email !== adminEmail) redirect("/painel");

  const admin = createAdminClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalRestaurants },
    { count: activeRestaurants },
    { data: confirmedOrders },
    { data: payments30d },
    { data: restaurants },
    { data: recentPayments },
  ] = await Promise.all([
    admin.from("restaurants").select("*", { count: "exact", head: true }),
    admin
      .from("restaurants")
      .select("*", { count: "exact", head: true })
      .in("status", ["active", "trial"])
      .gte("created_at", sevenDaysAgo),
    admin
      .from("order_intents")
      .select("id, items, total")
      .eq("status", "confirmed"),
    admin.from("payments").select("amount").gte("processed_at", thirtyDaysAgo),
    admin
      .from("restaurants")
      .select("id, name, plan, status, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    admin
      .from("payments")
      .select("id, amount, method, status, processed_at")
      .order("processed_at", { ascending: false })
      .limit(50),
  ]);

  const revenue30d = payments30d?.reduce((s, p) => s + (p.amount ?? 0), 0) ?? 0;
  const totalOrders = confirmedOrders?.length ?? 0;

  // Compute top products from JSONB items
  const productMap: Record<string, number> = {};
  for (const order of confirmedOrders ?? []) {
    const items = Array.isArray(order.items) ? order.items : [];
    for (const item of items) {
      const name: string = item.code_name ?? item.name ?? "Sem nome";
      productMap[name] = (productMap[name] ?? 0) + (item.qty ?? 1);
    }
  }
  const topProducts = Object.entries(productMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return (
    <AdminClient
      stats={{
        totalRestaurants: totalRestaurants ?? 0,
        activeRestaurants: activeRestaurants ?? 0,
        totalOrders,
        revenue30d,
      }}
      restaurants={restaurants ?? []}
      payments={recentPayments ?? []}
      topProducts={topProducts}
    />
  );
}
