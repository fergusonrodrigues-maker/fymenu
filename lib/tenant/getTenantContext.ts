// lib/tenant/getTenantContext.ts

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function getTenantContext() {
  const supabase = await createClient();

  // 1️⃣ Usuário autenticado
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  // 2️⃣ Restaurant do owner
  let { data: restaurant } = await supabase
    .from("restaurants")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  // Auto-criar restaurante se não existir (evita redirect para onboarding)
  if (!restaurant) {
    const restaurantName = user.email?.split("@")[0] ?? "Meu Restaurante";
    const slug =
      restaurantName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "meu-restaurante";

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

    const { data: newRestaurant, error: createError } = await supabase
      .from("restaurants")
      .insert({
        owner_id: user.id,
        name: restaurantName,
        status: "trial",
        trial_ends_at: trialEndsAt.toISOString(),
        onboarding_completed: true,
      })
      .select("*")
      .single();

    if (createError || !newRestaurant) {
      redirect("/entrar");
    }

    await supabase.from("units").insert({
      restaurant_id: newRestaurant!.id,
      name: restaurantName,
      slug,
      is_published: false,
    });

    restaurant = newRestaurant;
  }

  // 3️⃣ Units desse restaurant
  const { data: units, error: unitsError } = await supabase
    .from("units")
    .select("*")
    .eq("restaurant_id", restaurant!.id)
    .order("created_at", { ascending: true });

  if (unitsError) {
    throw new Error("Erro ao buscar unidades do restaurante.");
  }

  return {
    user,
    restaurant,
    units: units ?? [],
  };
}
