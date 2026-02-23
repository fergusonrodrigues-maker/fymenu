import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";
import { getTenantContext } from "../../lib/tenant/getTenantContext";

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
  const selectedUnitId = sp.unit;

  const activeUnit = units.find((u) => u.id === selectedUnitId) ?? units[0] ?? null;

  if (!activeUnit) redirect("/dashboard/unit");

  return (
    <DashboardClient
      restaurant={restaurant}
      units={units}
      activeUnit={activeUnit}
    />
  );
}