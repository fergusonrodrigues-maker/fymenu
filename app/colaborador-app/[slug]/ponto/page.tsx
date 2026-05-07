import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasPlanFeature } from "@/lib/plans";
import { getRestaurantPlan } from "@/lib/server/getRestaurantPlan";
import PontoClient from "./PontoClient";
import FeatureUnavailable from "../_components/FeatureUnavailable";

export default async function ColaboradorPontoPage({
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

  // Feature gate: full employees module with timecard (Business).
  const { plan, unitFeatures } = await getRestaurantPlan(unit.restaurant_id, unit.id);
  if (!hasPlanFeature(plan, "employees", unitFeatures)) {
    console.warn(`[gating] colaborador ponto blocked unit=${unit.id} plan=${plan}`);
    return (
      <FeatureUnavailable
        title="Ponto indisponível"
        description="O controle de ponto está disponível no plano Business."
      />
    );
  }

  return <PontoClient slug={slug} />;
}
