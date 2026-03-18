import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import EstoqueClient from "./EstoqueClient";

export default async function EstoquePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, onboarding_completed")
    .eq("owner_id", user.id)
    .single();

  if (!restaurant) redirect("/login");
  if (!restaurant.onboarding_completed) redirect("/onboarding");

  const { data: unit } = await supabase
    .from("units")
    .select("id, name")
    .eq("restaurant_id", restaurant.id)
    .single();

  if (!unit) redirect("/dashboard");

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("unit_id", unit.id)
    .order("order_index");

  const { data: products } = await supabase
    .from("products")
    .select("id, name, thumbnail_url, stock, stock_minimum, unlimited, sku, category_id")
    .eq("unit_id", unit.id)
    .order("name");

  const categoryMap = Object.fromEntries((categories ?? []).map((c) => [c.id, c.name]));

  const stockProducts = (products ?? []).map((p) => ({
    ...p,
    category_name: categoryMap[p.category_id] ?? "—",
  }));

  return (
    <EstoqueClient
      unitId={unit.id}
      unitName={unit.name}
      products={stockProducts}
    />
  );
}
