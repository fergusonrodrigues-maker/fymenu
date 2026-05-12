import { createClient } from "@/lib/supabase/server";
import type { PlanCode } from "@/lib/plans";

export type RestaurantPlanContext = {
  plan: PlanCode;
  status: string | null;
  isComplimentary: boolean;
  unitFeatures: Record<string, boolean>;
};

/**
 * Pega plano do restaurante + overrides de unit_features (se houver).
 * Use em server components, server actions e API routes.
 *
 * Cortesia (is_complimentary=true) bypassa bloqueio por status/trial: o restaurante
 * sempre recebe acesso ao plano configurado, independente de pagamento.
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
    .select("plan, status, is_complimentary")
    .eq("id", restaurantId)
    .maybeSingle();

  const plan = (restaurant?.plan as PlanCode) ?? "menu";
  const status = restaurant?.status ?? null;
  const isComplimentary = !!restaurant?.is_complimentary;

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

  return { plan, status, isComplimentary, unitFeatures };
}
