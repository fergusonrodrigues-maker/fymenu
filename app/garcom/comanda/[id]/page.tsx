import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ComandaGarcomClient from "./ComandaGarcomClient";

export const metadata = { title: "Comanda — FyMenu" };

export default async function ComandaGarcomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name")
    .eq("owner_id", user.id)
    .single();
  if (!restaurant) redirect("/entrar");

  const { data: unit } = await supabase
    .from("units")
    .select("id, name, slug, comanda_close_permission")
    .eq("restaurant_id", restaurant.id)
    .single();
  if (!unit) redirect("/painel");

  const { data: comanda } = await supabase
    .from("comandas")
    .select("id, unit_id, table_number, hash, status, opened_by_name, created_at, notes")
    .eq("id", id)
    .eq("unit_id", unit.id)
    .single();
  if (!comanda) redirect("/garcom");

  const { data: items } = await supabase
    .from("comanda_items")
    .select("id, comanda_id, product_id, product_name, quantity, unit_price, addons, notes, status, added_by, added_by_name, added_by_role, created_at")
    .eq("comanda_id", id)
    .order("created_at", { ascending: true });

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, order_index")
    .eq("unit_id", unit.id)
    .order("order_index", { ascending: true, nullsFirst: false });

  const catIds = (categories ?? []).map((c: any) => c.id);

  const { data: products } = catIds.length
    ? await supabase
        .from("products")
        .select("id, category_id, name, base_price, price_type")
        .in("category_id", catIds)
        .eq("is_active", true)
        .order("order_index", { ascending: true, nullsFirst: false })
    : { data: [] };

  return (
    <ComandaGarcomClient
      comanda={comanda as any}
      initialItems={(items ?? []) as any}
      categories={(categories ?? []) as any}
      products={(products ?? []) as any}
      unitId={unit.id}
      unitSlug={unit.slug}
      unitName={unit.name}
      restaurantId={restaurant.id}
      userId={user.id}
      waiterName={user.email ?? unit.name}
      canClose={(unit.comanda_close_permission ?? "somente_caixa") === "garcom_e_caixa"}
    />
  );
}
