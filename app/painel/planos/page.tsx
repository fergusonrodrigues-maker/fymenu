import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PlanosClient from "./PlanosClient";

export default async function PlanosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, plan, status, free_access")
    .eq("owner_id", user.id)
    .single();

  if (!restaurant) redirect("/entrar");

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan, cycle, status, next_due_date")
    .eq("restaurant_id", restaurant.id)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <PlanosClient
      currentPlan={restaurant.plan ?? "menu"}
      currentStatus={restaurant.status ?? ""}
      freeAccess={restaurant.free_access ?? false}
      activeSubscription={subscription ?? null}
    />
  );
}
