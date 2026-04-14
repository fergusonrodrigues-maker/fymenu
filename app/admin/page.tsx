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
  if (!user) redirect("/admin/login");

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || user.email !== adminEmail) redirect("/admin/login");

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
    { data: units },
    { data: unitFeatures },
    { data: allRestaurantsDetailed },
    { data: allUnitsDetailed },
    { data: allOrdersCount },
    { data: allMenuEvents },
    { data: ownersData },
    { data: ordersByUnit },
    { data: unitMapping },
    { data: allOrders },
    { data: allEvents },
    { data: financeOrders },
    { data: financePlans },
    { data: supportStaffData },
    { data: photoCitiesData },
    { data: photoPackagesData },
    { data: photoSessionsData },
    { data: partnersData },
    { data: partnerCoupons },
    { data: partnerReferrals },
    { data: partnerPayouts },
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
      .select("id, name, plan, status, free_access, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    admin
      .from("payments")
      .select("id, amount, method, status, processed_at")
      .order("processed_at", { ascending: false })
      .limit(50),
    admin.from("units").select("id, restaurant_id, city"),
    admin.from("unit_features").select("unit_id, feature, enabled"),
    admin
      .from("restaurants")
      .select("id, name, plan, status, created_at, trial_ends_at, free_access")
      .order("created_at", { ascending: false }),
    admin
      .from("units")
      .select("id, restaurant_id, slug, city, is_published, created_at"),
    admin
      .from("order_intents")
      .select("id, unit_id, created_at, status, total")
      .eq("status", "confirmed"),
    admin
      .from("menu_events")
      .select("id, unit_id, event, created_at")
      .gte("created_at", thirtyDaysAgo),
    admin
      .from("restaurants")
      .select("id, name, plan, status, created_at, trial_ends_at, free_access, owner_id, owner_first_name, owner_last_name, owner_phone, owner_document, owner_address, whatsapp, instagram")
      .order("created_at", { ascending: false }),
    admin
      .from("order_intents")
      .select("unit_id, total, status")
      .eq("status", "confirmed"),
    admin
      .from("units")
      .select("id, restaurant_id, city, slug"),
    admin
      .from("order_intents")
      .select("id, unit_id, items, table_number, total, payment_method, status, notes, created_at")
      .eq("status", "confirmed")
      .order("created_at", { ascending: false })
      .limit(500),
    admin
      .from("menu_events")
      .select("id, unit_id, event, product_id, created_at")
      .order("created_at", { ascending: false })
      .limit(1000),
    admin
      .from("order_intents")
      .select("total, created_at, unit_id, status")
      .eq("status", "confirmed"),
    admin
      .from("restaurants")
      .select("plan, status, free_access"),
    admin
      .from("support_staff")
      .select("id, email, name, role, is_active, permissions, created_at, last_login_at")
      .order("created_at", { ascending: false }),
    admin.from("photo_session_cities").select("*").order("city"),
    admin.from("photo_session_packages").select("*").order("price"),
    admin
      .from("photo_sessions")
      .select("*, photo_session_packages(name), photo_session_cities(city, state), partners(name)")
      .order("created_at", { ascending: false }),
    admin.from("partners").select("*").order("created_at", { ascending: false }),
    admin.from("partner_coupons").select("*, partners(name)").order("created_at", { ascending: false }),
    admin.from("partner_referrals").select("*, partners(name), restaurants(name, plan, status)").order("created_at", { ascending: false }),
    admin.from("partner_payouts").select("*, partners(name)").order("created_at", { ascending: false }),
  ]);

  const revenue30d = payments30d?.reduce((s, p) => s + (p.amount ?? 0), 0) ?? 0;
  const totalOrders = confirmedOrders?.length ?? 0;

  // Top products from JSONB items
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

  // Plan counts
  const planCounts: Record<string, number> = {};
  for (const r of restaurants ?? []) {
    const p = r.plan ?? "basic";
    planCounts[p] = (planCounts[p] ?? 0) + 1;
  }

  // Status counts
  const statusCounts: Record<string, number> = {};
  for (const r of restaurants ?? []) {
    statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1;
  }

  // City counts
  const cityCounts: Record<string, number> = {};
  for (const u of units ?? []) {
    if (u.city) cityCounts[u.city] = (cityCounts[u.city] ?? 0) + 1;
  }
  const cities = Object.entries(cityCounts)
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count);

  // Unit map: restaurant_id -> unit id (first unit)
  const unitsByRestaurant: Record<string, string> = {};
  for (const u of units ?? []) {
    if (!unitsByRestaurant[u.restaurant_id]) {
      unitsByRestaurant[u.restaurant_id] = u.id;
    }
  }

  // Determine role of currently logged-in user
  const staffMember = supportStaffData?.find((s) => s.email === user.email);
  const userRole = staffMember ? staffMember.role : "super_admin";

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
      planCounts={planCounts}
      statusCounts={statusCounts}
      cities={cities}
      unitsByRestaurant={unitsByRestaurant}
      unitFeatures={unitFeatures ?? []}
      user={{ email: user.email ?? "", id: user.id }}
      analyticsData={{
        restaurants: allRestaurantsDetailed ?? [],
        units: allUnitsDetailed ?? [],
        orders: allOrdersCount ?? [],
        events: allMenuEvents ?? [],
      }}
      crmData={{
        owners: ownersData ?? [],
        ordersByUnit: ordersByUnit ?? [],
        unitMapping: unitMapping ?? [],
      }}
      consumerData={{
        orders: allOrders ?? [],
        events: allEvents ?? [],
      }}
      financeData={{
        orders: financeOrders ?? [],
        plans: financePlans ?? [],
      }}
      userRole={userRole}
      supportStaff={supportStaffData ?? []}
      photoData={{
        cities: photoCitiesData ?? [],
        packages: photoPackagesData ?? [],
        sessions: photoSessionsData ?? [],
      }}
      partnerData={{
        partners: partnersData ?? [],
        coupons: partnerCoupons ?? [],
        referrals: partnerReferrals ?? [],
        payouts: partnerPayouts ?? [],
      }}
    />
  );
}
