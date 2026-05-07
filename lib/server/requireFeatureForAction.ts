import { getRestaurantPlan } from "./getRestaurantPlan";
import {
  hasPlanFeature,
  minPlanForFeature,
  type FeatureKey,
  type PlanCode,
} from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

export type FeatureCheckOk = {
  ok: true;
  userId: string;
  restaurantId: string;
  unitId: string | null;
  plan: PlanCode;
  unitFeatures: Record<string, boolean>;
};

export type FeatureCheckError = {
  ok: false;
  error: "UNAUTHORIZED" | "NO_RESTAURANT" | "FEATURE_NOT_AVAILABLE";
  message?: string;
  minPlan?: PlanCode | null;
};

/**
 * Server action / API-route guard. Returns a tuple instead of redirecting,
 * so the caller can shape the response (NextResponse.json / { ok, error }).
 *
 * Accepts optional `restaurantId` (skip lookup) or `unitId` (resolve restaurant
 * via the units table — useful for whatsapp/* routes that receive unitId).
 */
export async function requireFeatureForAction(
  feature: FeatureKey,
  opts?: { restaurantId?: string; unitId?: string | null }
): Promise<FeatureCheckOk | FeatureCheckError> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "UNAUTHORIZED" };

  let restaurantId = opts?.restaurantId ?? null;
  const unitId = opts?.unitId ?? null;

  // Resolve restaurantId from unitId if provided
  if (!restaurantId && unitId) {
    const { data: unit } = await supabase
      .from("units")
      .select("restaurant_id")
      .eq("id", unitId)
      .maybeSingle();
    if (unit?.restaurant_id) restaurantId = unit.restaurant_id;
  }

  // Fallback: lookup by membership / owner_id
  if (!restaurantId) {
    const { data: membership } = await supabase
      .from("restaurant_members")
      .select("restaurant_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (membership?.restaurant_id) restaurantId = membership.restaurant_id;

    if (!restaurantId) {
      const { data: owned } = await supabase
        .from("restaurants")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (owned?.id) restaurantId = owned.id;
    }
  }

  if (!restaurantId) return { ok: false, error: "NO_RESTAURANT" };

  const { plan, unitFeatures } = await getRestaurantPlan(
    restaurantId,
    unitId ?? undefined
  );

  if (!hasPlanFeature(plan, feature, unitFeatures)) {
    const minPlan = minPlanForFeature(feature);
    console.warn(
      `[gating] user=${user.id} blocked feature=${feature} plan=${plan}`
    );
    return {
      ok: false,
      error: "FEATURE_NOT_AVAILABLE",
      message: `Feature "${feature}" não disponível no plano "${plan}"`,
      minPlan,
    };
  }

  return {
    ok: true,
    userId: user.id,
    restaurantId,
    unitId,
    plan,
    unitFeatures,
  };
}
