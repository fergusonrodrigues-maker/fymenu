import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import PDVClient from "./PDVClient";

export const metadata = { title: "PDV — FyMenu" };

export default async function PDVPage({
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

  // Pedidos confirmados ainda não pagos
  const { data: orders } = await supabase
    .from("order_intents")
    .select(
      "id, table_number, items, total, status, kitchen_status, waiter_status, notes, created_at, payment_method, paid_at"
    )
    .eq("unit_id", unit.id)
    .eq("status", "confirmed")
    .is("paid_at", null)
    .order("created_at", { ascending: true });

  return (
    <PDVClient
      unitId={unit.id}
      unitName={unit.name}
      restaurantName={restaurant?.name ?? ""}
      slug={slug}
      initialOrders={orders ?? []}
    />
  );
}
