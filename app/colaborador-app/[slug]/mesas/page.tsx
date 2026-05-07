import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasPlanFeature } from "@/lib/plans";
import { getRestaurantPlan } from "@/lib/server/getRestaurantPlan";
import MesasClient from "./MesasClient";
import FeatureUnavailable from "../_components/FeatureUnavailable";

export default async function ColaboradorMesasPage({
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

  // Feature gate: comanda (mesas usa o mesmo módulo de comanda — MenuPro+).
  const { plan, unitFeatures } = await getRestaurantPlan(unit.restaurant_id, unit.id);
  if (!hasPlanFeature(plan, "comanda", unitFeatures)) {
    console.warn(`[gating] colaborador mesas blocked unit=${unit.id} plan=${plan}`);
    return (
      <FeatureUnavailable
        title="Mesas indisponíveis"
        description="O módulo de mesas requer comanda digital, que não está incluída no plano atual deste restaurante."
      />
    );
  }

  return <MesasClient slug={slug} />;
}
