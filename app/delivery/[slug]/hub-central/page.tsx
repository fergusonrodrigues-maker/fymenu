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

  const HUB_SELECT =
    "id, table_number, items, total, status, waiter_status, kitchen_status, notes, created_at, waiter_confirmed_at, kitchen_printed_at, confirmation_deadline_at, rejected_at, customer_name, source";

  const [{ data: orders }, { data: pending }] = await Promise.all([
    supabase
      .from("order_intents")
      .select(HUB_SELECT)
      .eq("unit_id", unit.id)
      .eq("status", "confirmed")
      .neq("kitchen_status", "delivered")
      .order("created_at", { ascending: true }),
    supabase
      .from("order_intents")
      .select(HUB_SELECT)
      .eq("unit_id", unit.id)
      .eq("status", "pending")
      .eq("waiter_status", "pending")
      .is("rejected_at", null)
      .order("created_at", { ascending: true }),
  ]);

  return (
    <HubClient
      unitId={unit.id}
      unitName={unit.name}
      restaurantName={restaurant?.name ?? ""}
      slug={slug}
      initialOrders={orders ?? []}
      initialPendingOrders={pending ?? []}
    />
  );
}
