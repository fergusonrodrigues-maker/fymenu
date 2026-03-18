import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import KitchenClient from "./KitchenClient";

export const metadata = { title: "Cozinha — FyMenu" };

export default async function KitchenPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name")
    .eq("owner_id", user.id)
    .single();
  if (!restaurant) redirect("/entrar");

  const { data: unit } = await supabase
    .from("units")
    .select("id, name")
    .eq("restaurant_id", restaurant.id)
    .single();
  if (!unit) redirect("/painel");

  const { data: orders } = await supabase
    .from("order_intents")
    .select("id, table_number, items, total, status, waiter_status, kitchen_status, notes, created_at, waiter_confirmed_at")
    .eq("unit_id", unit.id)
    .eq("status", "confirmed")
    .neq("kitchen_status", "delivered")
    .order("created_at", { ascending: true });

  return (
    <KitchenClient
      unitId={unit.id}
      unitName={unit.name}
      restaurantName={restaurant.name}
      initialOrders={orders ?? []}
    />
  );
}
