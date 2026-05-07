import { createClient } from "@/lib/supabase/server";
import type { PlanCode } from "@/lib/plans";

export type RestaurantPlanContext = {
  plan: PlanCode;
  unitFeatures: Record<string, boolean>;
};

/**
 * Pega plano do restaurante + overrides de unit_features (se houver).
 * Use em server components, server actions e API routes.
 *
 * Cacheable por request (Next.js cache). NÃO cachear entre requests.
 */
export async function getRestaurantPlan(
  restaurantId: string,
  unitId?: string
): Promise<RestaurantPlanContext> {
  const supabase = await createClient();

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("plan")
    .eq("id", restaurantId)
    .maybeSingle();

  const plan = (restaurant?.plan as PlanCode) ?? "menu";

  const unitFeatures: Record<string, boolean> = {};
  if (unitId) {
    const { data: features } = await supabase
      .from("unit_features")
      .select("feature, enabled")
      .eq("unit_id", unitId);

    if (features) {
      for (const f of features as Array<{ feature: string; enabled: boolean | null }>) {
        if (f.enabled !== null && f.enabled !== undefined) {
          unitFeatures[f.feature] = f.enabled;
        }
      }
    }
  }

  return { plan, unitFeatures };
}
