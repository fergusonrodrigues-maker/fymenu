// FILE: /app/dashboard/page.tsx
// ACTION: REPLACE ENTIRE FILE

import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";
import { getTenantContext } from "../../lib/tenant/getTenantContext";
import { createClient } from "@/lib/supabase/server";

type SearchParamsShape = { unit?: string };

async function resolveSearchParams(
  sp: SearchParamsShape | Promise<SearchParamsShape> | undefined
): Promise<SearchParamsShape> {
  if (!sp) return {};
  return await Promise.resolve(sp);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: SearchParamsShape | Promise<SearchParamsShape>;
}) {
  const { restaurant, units } = await getTenantContext();

  if (!restaurant) redirect("/login");
  if (!units || units.length === 0) redirect("/dashboard/unit");

  const sp = await resolveSearchParams(searchParams);
  const activeUnit = units.find((u) => u.id === sp.unit) ?? units[0];
  if (!activeUnit) redirect("/dashboard/unit");

  const supabase = await createClient();

  // Busca categorias da unidade ativa
  const { data: categories } = await supabase
    .from("categories")
    .select("id")
    .eq("unit_id", activeUnit.id);

  const categoryIds = (categories ?? []).map((c) => c.id);

  // Busca total de produtos
  let totalProducts = 0;
  if (categoryIds.length > 0) {
    const { count } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .in("category_id", categoryIds);
    totalProducts = count ?? 0;
  }

  // Trial days left
  let trialDaysLeft: number | null = null;
  if (restaurant.status === "trial" && restaurant.trial_ends_at) {
    const diff = new Date(restaurant.trial_ends_at).getTime() - Date.now();
    trialDaysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  const planLabel = String(restaurant.plan ?? "basic").toUpperCase() === "PRO" ? "PRO" : "BASIC";

  return (
    <DashboardClient
      restaurant={restaurant}
      units={units}
      activeUnit={activeUnit}
      stats={{
        totalProducts,
        totalCategories: categoryIds.length,
        planLabel,
        trialDaysLeft,
      }}
    />
  );
}
