"use client";

import {
  hasPlanFeature,
  minPlanForFeature,
  PLANS,
  type PlanCode,
  type FeatureKey,
} from "@/lib/plans";

/**
 * Hook que retorna se o restaurante atual tem acesso a uma feature.
 * Aceita plan + unitFeatures opcionais (vem do contexto de restaurante).
 */
export function usePlanFeature(
  plan: PlanCode | string | null | undefined,
  feature: FeatureKey,
  unitFeatures?: Record<string, boolean>
) {
  const allowed = hasPlanFeature(plan, feature, unitFeatures);
  const minPlan = minPlanForFeature(feature);
  return {
    allowed,
    minPlan,
    minPlanLabel: minPlan ? PLANS[minPlan].name : null,
  };
}
