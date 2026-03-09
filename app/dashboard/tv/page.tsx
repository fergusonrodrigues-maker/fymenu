import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TVClient from "./TVClient";

export default async function TVPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // owner_id está em restaurants, não em units
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (!restaurant) redirect("/dashboard");

  const { data: unit } = await supabase
    .from("units")
    .select("id, name, slug")
    .eq("restaurant_id", restaurant.id)
    .single();

  if (!unit) redirect("/dashboard");

  const { data: media } = await supabase
    .from("tv_media")
    .select("*")
    .eq("unit_id", unit.id)
    .order("order_index", { ascending: true });

  return (
    <TVClient
      unitId={unit.id}
      unitName={unit.name}
      slug={unit.slug}
      initialMedia={media ?? []}
    />
  );
}
