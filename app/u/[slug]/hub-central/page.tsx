import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import HubClient from "./HubClient";

export const metadata = { title: "Hub Central — FyMenu" };

export default async function HubCentralPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: unit } = await supabase
    .from("units")
    .select("id, name, restaurant_id")
    .eq("slug", slug)
    .single();

  if (!unit) notFound();

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("name")
    .eq("id", unit.restaurant_id)
    .single();

  const { data: orders } = await supabase
    .from("order_intents")
    .select(
      "id, table_number, items, total, status, waiter_status, kitchen_status, notes, created_at, waiter_confirmed_at"
    )
    .eq("unit_id", unit.id)
    .eq("status", "confirmed")
    .neq("kitchen_status", "delivered")
    .order("created_at", { ascending: true });

  return (
    <HubClient
      unitId={unit.id}
      unitName={unit.name}
      restaurantName={restaurant?.name ?? ""}
      slug={slug}
      initialOrders={orders ?? []}
    />
  );
}
