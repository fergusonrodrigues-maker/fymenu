// app/comanda/[slug]/[hash]/page.tsx
// Digital table order / comanda
// Accessed via: empresa.fymenu.com/comanda/abc123 (middleware rewrites to /comanda/slug/hash)

import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import MenuClient from "@/app/delivery/[slug]/MenuClient";
import type { Category, Product, ProductVariation, Unit } from "@/app/delivery/[slug]/menuTypes";
import { normalizePublicSlug, slugify, toNumberOrNull } from "@/app/delivery/[slug]/menuTypes";

export const revalidate = 0;

export default async function ComandaPage({
  params,
}: {
  params: Promise<{ slug: string; hash: string }>;
}) {
  const { slug, hash } = await params;
  const publicSlug = normalizePublicSlug(slug);
  const supabase = await createClient();

  const { data: unitData } = await supabase
    .from("units")
    .select("id, restaurant_id, name, slug, city, neighborhood, whatsapp, instagram, maps_url, logo_url")
    .eq("slug", publicSlug)
    .maybeSingle();

  if (!unitData) notFound();

  const unit: Unit = {
    id: unitData.id,
    restaurant_id: unitData.restaurant_id ?? null,
    name: unitData.name ?? "",
    slug: unitData.slug ?? publicSlug,
    city: unitData.city ?? null,
    neighborhood: unitData.neighborhood ?? null,
    whatsapp: unitData.whatsapp ?? null,
    instagram: unitData.instagram ?? null,
    maps_url: unitData.maps_url ?? null,
    logo_url: unitData.logo_url ?? null,
  };

  const { data: categoriesData } = await supabase
    .from("categories")
    .select("id, unit_id, name, order_index, type")
    .eq("unit_id", unit.id)
    .order("order_index", { ascending: true, nullsFirst: false });

  const categories: Category[] = (categoriesData ?? []).map((c: any, idx: number) => {
    const name = (c?.name ?? "").toString();
    return {
      id: c.id,
      unit_id: c.unit_id,
      name,
      order_index: typeof c.order_index === "number" ? c.order_index : idx,
      is_featured: false,
      slug: slugify(name || `categoria-${idx + 1}`),
      type: c.type ?? null,
    };
  });

  const validCategoryIds = new Set(categories.map((c) => c.id));

  const { data: productsData } = await supabase
    .from("products")
    .select("id, category_id, name, description, price_type, base_price, thumbnail_url, video_url, is_active, order_index")
    .in("category_id", Array.from(validCategoryIds))
    .eq("is_active", true)
    .order("order_index", { ascending: true, nullsFirst: false });

  const products: Product[] = (productsData ?? []).map((p: any) => ({
    id: p.id,
    category_id: p.category_id,
    name: (p.name ?? "").toString(),
    description: p.description ?? null,
    price_type: p.price_type === "variable" ? "variable" : "fixed",
    base_price: toNumberOrNull(p.base_price),
    thumbnail_url: p.thumbnail_url ?? null,
    video_url: p.video_url ?? null,
    is_active: p.is_active !== false,
    order_index: typeof p.order_index === "number" ? p.order_index : null,
  }));

  const productIds = products.map((p) => p.id);

  const { data: variationsData } = productIds.length
    ? await supabase
        .from("product_variations")
        .select("id, product_id, name, price, order_index")
        .in("product_id", productIds)
        .eq("is_active", true)
        .order("order_index", { ascending: true, nullsFirst: false })
    : { data: [] };

  const variations: Record<string, ProductVariation[]> = {};
  for (const v of variationsData ?? []) {
    if (!variations[v.product_id]) variations[v.product_id] = [];
    variations[v.product_id].push({
      id: v.id,
      product_id: v.product_id,
      name: (v.name ?? "").toString(),
      price: toNumberOrNull(v.price) ?? 0,
      order_index: typeof v.order_index === "number" ? v.order_index : null,
    });
  }

  return (
    <MenuClient
      unit={unit}
      categories={categories}
      products={products}
      variations={variations}
      upsells={{}}
      mode="presencial"
    />
  );
}
