import { redirect } from "next/navigation";
import { getRestaurantPlan } from "./getRestaurantPlan";
import { hasPlanFeature, type FeatureKey, type PlanCode } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

export type FeatureContext = {
  userId: string;
  restaurantId: string;
  unitId: string | null;
  plan: PlanCode;
  unitFeatures: Record<string, boolean>;
};

/**
 * Server component / page guard. Looks up the user's restaurant, checks the
 * feature gate, and either redirects or returns the gating context.
 *
 * Accepts optional `restaurantId` / `unitId` to skip lookup when the caller
 * already loaded the tenant — useful for pages that already pull
 * getTenantContext() or do their own owner_id query.
 *
 * Redirects on:
 *   - no auth      → /entrar
 *   - no tenant    → /painel
 *   - feature miss → /painel?upgrade={feature}
 */
export async function requireFeatureOrRedirect(
  feature: FeatureKey,
  opts?: { restaurantId?: string; unitId?: string | null }
): Promise<FeatureContext> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  let restaurantId = opts?.restaurantId ?? null;

  if (!restaurantId) {
    // Prefer active membership (multi-tenant model)
    const { data: membership } = await supabase
      .from("restaurant_members")
      .select("restaurant_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (membership?.restaurant_id) restaurantId = membership.restaurant_id;

    // Fallback to legacy owner_id
    if (!restaurantId) {
      const { data: owned } = await supabase
        .from("restaurants")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (owned?.id) restaurantId = owned.id;
    }
  }

  if (!restaurantId) redirect("/painel");

  const unitId = opts?.unitId ?? null;
  const { plan, unitFeatures } = await getRestaurantPlan(
    restaurantId,
    unitId ?? undefined
  );

  if (!hasPlanFeature(plan, feature, unitFeatures)) {
    console.warn(
      `[gating] user=${user.id} blocked from feature=${feature} plan=${plan}`
    );
    redirect(`/painel?upgrade=${feature}`);
  }

  return {
    userId: user.id,
    restaurantId,
    unitId,
    plan,
    unitFeatures,
  };
}
