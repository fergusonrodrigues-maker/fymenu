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

  const sp: { unit?: string } = searchParams ? await searchParams : {};
  const unitId = sp.unit ?? units[0].id;
  const activeUnit = units.find((u) => u.id === unitId) ?? units[0];

  const supabase = await createClient();

  // 1) Categorias
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, order_index")
    .eq("unit_id", activeUnit.id)
    .order("order_index", { ascending: true });

  const categoryIds = (categories ?? []).map((c) => c.id);

  // 2) Produtos
  const { data: products } = categoryIds.length
    ? await supabase
        .from("products")
        .select("id, category_id, name, description, price_type, base_price, thumbnail_url, video_url, order_index")
        .in("category_id", categoryIds)
        .order("order_index", { ascending: true })
    : { data: [] };

  const productIds = (products ?? []).map((p) => p.id);

  // 3) Upsell groups + items
  type UpsellItemRow = {
    id: string;
    product_id: string;
    upsell_item_id: string;
    suggested_product_id: string;
    name: string;
    base_price: number | null;
    price_type: string;
  };

  let upsellItems: UpsellItemRow[] = [];

  if (productIds.length > 0) {
    const { data: groups } = await supabase
      .from("product_upsells")
      .select("id, product_id")
      .in("product_id", productIds);

    const groupIds = (groups ?? []).map((g: any) => g.id);
    const groupMap = new Map<string, string>(
      (groups ?? []).map((g: any) => [g.id, g.product_id])
    );

    if (groupIds.length > 0) {
      const { data: items } = await supabase
        .from("product_upsell_items")
        .select("id, upsell_id, product_id, position")
        .in("upsell_id", groupIds)
        .order("position", { ascending: true });

      const suggestedIds = (items ?? []).map((i: any) => i.product_id);
      const productMap = new Map(
        (products ?? []).map((p) => [p.id, p])
      );

      upsellItems = (items ?? [])
        .map((item: any) => {
          const ownerProductId = groupMap.get(item.upsell_id);
          const suggested = productMap.get(item.product_id);
          if (!ownerProductId || !suggested) return null;
          return {
            id: ownerProductId,
            product_id: ownerProductId,
            upsell_item_id: item.id,
            suggested_product_id: item.product_id,
            name: suggested.name,
            base_price: suggested.base_price ?? null,
            price_type: suggested.price_type ?? "fixed",
          };
        })
        .filter(Boolean) as UpsellItemRow[];

      // Busca produtos sugeridos que não estão na mesma unidade
      const missingIds = suggestedIds.filter((id: string) => !productMap.has(id));
      if (missingIds.length > 0) {
        const { data: extraProducts } = await supabase
          .from("products")
          .select("id, name, base_price, price_type")
          .in("id", missingIds);

        const extraMap = new Map((extraProducts ?? []).map((p: any) => [p.id, p]));
        upsellItems = upsellItems.map((u) => {
          if (!u.name && extraMap.has(u.suggested_product_id)) {
            const p = extraMap.get(u.suggested_product_id)!;
            return { ...u, name: p.name, base_price: p.base_price, price_type: p.price_type };
          }
          return u;
        });
      }
    }
  }

  return (
    <CardapioClient
      units={units}
      activeUnit={activeUnit}
      categories={categories ?? []}
      products={products ?? []}
      upsellItems={upsellItems}
    />
  );
}
