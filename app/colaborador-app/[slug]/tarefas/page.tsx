import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasPlanFeature } from "@/lib/plans";
import { getRestaurantPlan } from "@/lib/server/getRestaurantPlan";
import TarefasClient from "./TarefasClient";
import FeatureUnavailable from "../_components/FeatureUnavailable";

export default async function ColaboradorTarefasPage({
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

  // Feature gate: tarefas é parte do módulo de equipe (Business).
  const { plan, unitFeatures } = await getRestaurantPlan(unit.restaurant_id, unit.id);
  if (!hasPlanFeature(plan, "employees", unitFeatures)) {
    console.warn(`[gating] colaborador tarefas blocked unit=${unit.id} plan=${plan}`);
    return (
      <FeatureUnavailable
        title="Tarefas indisponíveis"
        description="O módulo de tarefas faz parte da gestão de equipe, disponível no plano Business."
      />
    );
  }

  return <TarefasClient slug={slug} />;
}
