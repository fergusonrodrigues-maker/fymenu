import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import OnboardingClient from "./OnboardingClient";

export default async function OnboardingPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Se já completou onboarding, vai pro dashboard
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, onboarding_completed, name")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (restaurant?.onboarding_completed) redirect("/dashboard");

  // Auto-provisiona restaurante se não existir
  let restaurantId = restaurant?.id;
  if (!restaurantId) {
    const { data: newRestaurant } = await supabase
      .from("restaurants")
      .insert({ owner_id: user.id, name: user.email?.split("@")[0] ?? "Meu Restaurante" })
      .select("id")
      .single();
    restaurantId = newRestaurant?.id;
  }

  if (!restaurantId) redirect("/login");

  return (
    <OnboardingClient
      userId={user.id}
      restaurantId={restaurantId}
      userEmail={user.email ?? ""}
    />
  );
}
