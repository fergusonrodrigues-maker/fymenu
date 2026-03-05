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
    redirect("/login");
  }

  // 2️⃣ Restaurant do owner
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!restaurant) {
    redirect("/login");
  }

  // 3️⃣ Units desse restaurant
  const { data: units, error: unitsError } = await supabase
    .from("units")
    .select("*")
    .eq("restaurant_id", restaurant.id)
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