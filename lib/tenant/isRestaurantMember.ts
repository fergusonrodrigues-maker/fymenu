import { SupabaseClient } from "@supabase/supabase-js";

export async function isRestaurantMember(
  admin: SupabaseClient,
  userId: string,
  restaurantId: string
): Promise<boolean> {
  const { data } = await admin
    .from("restaurant_members")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  return !!data;
}

export async function isUnitMember(
  admin: SupabaseClient,
  userId: string,
  unitId: string
): Promise<boolean> {
  const { data: unit } = await admin
    .from("units")
    .select("restaurant_id")
    .eq("id", unitId)
    .single();
  if (!unit) return false;
  return isRestaurantMember(admin, userId, (unit as any).restaurant_id);
}
