import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasPlanFeature } from "@/lib/plans";
import { getRestaurantPlan } from "@/lib/server/getRestaurantPlan";
import ComandasClient from "./ComandasClient";
import FeatureUnavailable from "../_components/FeatureUnavailable";

export default async function ColaboradorComandasPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = await createClient();
  const { data: unit } = await supabase
    .from("units")
    .select("id, restaurant_id")
    .eq("slug", slug)
    .maybeSingle();
  if (!unit) notFound();

  // Feature gate: digital comanda (MenuPro+).
  const { plan, unitFeatures } = await getRestaurantPlan(unit.restaurant_id, unit.id);
  if (!hasPlanFeature(plan, "comanda", unitFeatures)) {
    console.warn(`[gating] colaborador comandas blocked unit=${unit.id} plan=${plan}`);
    return (
      <FeatureUnavailable
        title="Comandas indisponíveis"
        description="A comanda digital não está incluída no plano atual deste restaurante."
      />
    );
  }

  return <ComandasClient slug={slug} />;
}
