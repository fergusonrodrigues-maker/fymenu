import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { redirect } from "next/navigation";
import ImportClient from "./ImportClient";

export default async function IAPage() {
  const { units } = await getTenantContext();

  const unit = units[0];
  if (!unit) redirect("/dashboard");

  return <ImportClient unitId={unit.id} unitName={unit.name} />;
}
