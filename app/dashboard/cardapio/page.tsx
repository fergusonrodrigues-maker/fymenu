import { redirect } from "next/navigation";
import { getTenantContext } from "../../../lib/tenant/getTenantContext";
import { createClient } from "@/lib/supabase/server";
import CardapioClient from "./CardapioClient";

export default async function CardapioPage({
  searchParams,
}: {
  searchParams?: Promise<{ unit?: string }>;
}) {
  const { units } = await getTenantContext();
  if (!units || units.length === 0) redirect("/dashboard/unit");

  const sp = await Promise.resolve(searchParams ?? {});
  const unitId = (await sp).unit ?? units[0].id;
  const activeUnit = units.find((u) => u.id === unitId) ?? units[0];

  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, order_index")
    .eq("unit_id", activeUnit.id)
    .order("order_index", { ascending: true });

  const categoryIds = (categories ?? []).map((c) => c.id);

  const { data: products } = categoryIds.length
    ? await supabase
        .from("products")
        .select("id, category_id, name, description, price_type, base_price, thumbnail_url, video_url, order_index")
        .in("category_id", categoryIds)
        .order("order_index", { ascending: true })
    : { data: [] };

  return (
    <CardapioClient
      units={units}
      activeUnit={activeUnit}
      categories={categories ?? []}
      products={products ?? []}
    />
  );
}
