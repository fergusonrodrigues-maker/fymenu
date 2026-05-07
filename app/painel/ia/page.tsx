import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { redirect } from "next/navigation";
import ImportClient from "./ImportClient";
import { requireFeatureOrRedirect } from "@/lib/server/requireFeatureOrRedirect";

export default async function IAPage() {
  const { restaurant, units } = await getTenantContext();

  const unit = units[0];
  if (!unit) redirect("/painel");

  // Feature gate: AI product description (MenuPro+).
  await requireFeatureOrRedirect("iaDescription", {
    restaurantId: restaurant?.id,
    unitId: unit.id,
  });

  return <ImportClient unitId={unit.id} unitName={unit.name} />;
}
