import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import WaiterClient from "./WaiterClient";

export const metadata = { title: "Garçom — FyMenu" };

export default async function WaiterPage() {
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

  const { data: orders } = await supabase
    .from("order_intents")
    .select("id, table_number, items, total, status, waiter_status, kitchen_status, notes, created_at, waiter_confirmed_at")
    .eq("unit_id", unit.id)
    .neq("waiter_status", "delivered")
    .order("created_at", { ascending: false });

  return (
    <WaiterClient
      unitId={unit.id}
      unitName={unit.name}
      unitSlug={unit.slug}
      restaurantName={restaurant.name}
      canCloseComanda={(unit.comanda_close_permission ?? "somente_caixa") === "garcom_e_caixa"}
      initialOrders={orders ?? []}
    />
  );
}
