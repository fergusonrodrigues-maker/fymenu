import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name, plan, status, trial_ends_at, whatsapp, instagram, onboarding_completed")
    .eq("owner_id", user.id)
    .single();

  if (!restaurant) redirect("/entrar");
  if (!restaurant.onboarding_completed) redirect("/configurar");

  const { data: unit } = await supabase
    .from("units")
    .select("id, name, slug, address, city, neighborhood, whatsapp, instagram, logo_url, maps_url, is_published")
    .eq("restaurant_id", restaurant.id)
    .single();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, order_index")
    .eq("unit_id", unit?.id)
    .order("order_index");

  const { data: products } = await supabase
    .from("products")
    .select("id, category_id, name, description, price_type, base_price, thumbnail_url, video_url, order_index, is_active, stock, stock_minimum, unlimited, sku, allergens, nutrition, preparation_time")
    .in("category_id", (categories ?? []).map((c) => c.id));

  const upsellGroupIds = (categories ?? []).length > 0
    ? (await supabase
        .from("product_upsells")
        .select("id")
        .in("product_id", (products ?? []).map((p) => p.id))
      ).data?.map((u) => u.id) ?? []
    : [];

  const { data: upsellItems } = upsellGroupIds.length > 0
    ? await supabase
        .from("product_upsell_items")
        .select(`id, upsell_id, position, product_upsells!inner(product_id), products!product_upsell_items_product_id_fkey(id, name, base_price, price_type)`)
        .in("upsell_id", upsellGroupIds)
    : { data: [] };

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: events } = await supabase
    .from("menu_events")
    .select("event")
    .eq("unit_id", unit?.id)
    .gte("created_at", sevenDaysAgo);

  const views = events?.filter((e) => e.event === "menu_view").length ?? 0;
  const clicks = events?.filter((e) => e.event === "product_click").length ?? 0;
  const orders = events?.filter((e) => e.event === "whatsapp_click").length ?? 0;

  const { count: tvCount } = await supabase
    .from("tv_media")
    .select("id", { count: "exact", head: true })
    .eq("unit_id", unit?.id)
    .eq("is_active", true);

  const { data: stockProducts } = await supabase
    .from("products")
    .select("stock, stock_minimum, unlimited")
    .eq("unit_id", unit?.id)
    .eq("unlimited", false);

  const stockStats = {
    out: (stockProducts ?? []).filter((p) => (p.stock ?? 0) === 0).length,
    low: (stockProducts ?? []).filter((p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= (p.stock_minimum ?? 10)).length,
  };

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, phone")
    .eq("id", user.id)
    .single();

  return (
    <DashboardClient
      restaurant={restaurant}
      unit={unit ?? null}
      profile={{ first_name: null, last_name: null, phone: null, ...profile, email: user.email }}
      categories={categories ?? []}
      products={products ?? []}
      upsellItems={upsellItems ?? []}
      analytics={{ views, clicks, orders }}
      tvCount={tvCount ?? 0}
      stockStats={stockStats}
    />
  );
}
