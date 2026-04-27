// lib/tenant/getTenantContext.ts

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type AllMembership = {
  restaurantId: string;
  restaurantName: string;
  role: string;
};

export async function getTenantContext() {
  const supabase = await createClient();

  // 1️⃣ Usuário autenticado
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  // 2️⃣ Buscar memberships ativas com dados do restaurant
  const { data: memberships } = await supabase
    .from("restaurant_members")
    .select("id, role, restaurant_id, restaurants(*)")
    .eq("user_id", user.id)
    .eq("status", "active");

  let restaurant: any = null;
  let memberId: string = "";
  let memberRole: "owner" | "partner" = "owner";

  if (memberships && memberships.length > 0) {
    // Selecionar restaurant ativo via cookie ou usar o primeiro
    const cookieStore = await cookies();
    const activeRestaurantId = cookieStore.get("fy_active_restaurant")?.value;

    const selected =
      memberships.find((m: any) => m.restaurant_id === activeRestaurantId) ??
      memberships[0];

    restaurant = (selected as any).restaurants;
    memberId = selected.id;
    memberRole = selected.role as "owner" | "partner";
  } else {
    // Fallback: usuário tem restaurant via owner_id mas sem membership (conta pré-migração)
    const { data: ownedRestaurant } = await supabase
      .from("restaurants")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (ownedRestaurant) {
      const { data: newMember } = await supabase
        .from("restaurant_members")
        .insert({
          restaurant_id: ownedRestaurant.id,
          user_id: user.id,
          role: "owner",
          invited_email: user.email ?? "",
          status: "active",
          activated_at: new Date().toISOString(),
        })
        .select("id, role")
        .single();

      restaurant = ownedRestaurant;
      memberId = newMember?.id ?? "";
      memberRole = "owner";
    } else {
      // Conta nova: auto-criar restaurant + membership
      const restaurantName = user.email?.split("@")[0] ?? "Meu Restaurante";
      const slug =
        restaurantName
          .toLowerCase()
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
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

      const { data: newMember } = await supabase
        .from("restaurant_members")
        .insert({
          restaurant_id: newRestaurant!.id,
          user_id: user.id,
          role: "owner",
          invited_email: user.email ?? "",
          status: "active",
          activated_at: new Date().toISOString(),
        })
        .select("id, role")
        .single();

      restaurant = newRestaurant;
      memberId = newMember?.id ?? "";
      memberRole = "owner";
    }
  }

  // 3️⃣ Units do restaurant selecionado
  const { data: units, error: unitsError } = await supabase
    .from("units")
    .select("*")
    .eq("restaurant_id", restaurant!.id)
    .order("created_at", { ascending: true });

  if (unitsError) {
    throw new Error("Erro ao buscar unidades do restaurante.");
  }

  // 4️⃣ allMemberships para dropdown de troca futura
  const allMemberships: AllMembership[] = (memberships ?? []).map(
    (m: any) => ({
      restaurantId: m.restaurant_id,
      restaurantName: m.restaurants?.name ?? "",
      role: m.role,
    })
  );

  if (allMemberships.length === 0 && restaurant) {
    allMemberships.push({
      restaurantId: restaurant.id,
      restaurantName: restaurant.name ?? "",
      role: memberRole,
    });
  }

  return {
    user,
    restaurant,
    units: units ?? [],
    memberRole,
    memberId,
    allMemberships,
  };
}
