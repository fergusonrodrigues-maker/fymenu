// FILE: /app/u/[slug]/page.tsx
// ACTION: REPLACE ENTIRE FILE

import MenuClient from "./MenuClient";
import type {
  Category,
  Product,
  ProductVariation,
  Unit,
} from "./menuTypes";
import { slugify, normalizePublicSlug } from "./menuTypes";

import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const publicSlug = normalizePublicSlug(slug);

  if (!publicSlug) return notFound();

  const supabase = await createClient();

  // 1) UNIT (slug público)
  const { data: unitRow, error: unitErr } = await supabase
    .from("units")
    .select(
      "id, restaurant_id, name, slug, city, neighborhood, whatsapp, instagram, maps_url, logo_url"
    )
    .eq("slug", publicSlug)
    .maybeSingle();

  if (unitErr || !unitRow) return notFound();

  const unit: Unit = {
    id: unitRow.id,
    restaurant_id: unitRow.restaurant_id ?? null,
    name: unitRow.name,
    slug: unitRow.slug,
    city: unitRow.city ?? null,
    neighborhood: unitRow.neighborhood ?? null,
    whatsapp: unitRow.whatsapp ?? null,
    instagram: unitRow.instagram ?? null,
    maps_url: unitRow.maps_url ?? null,
    logo_url: unitRow.logo_url ?? null,
  };

  // 2) CATEGORIES
  const { data: catRows, error: catErr } = await supabase
    .from("categories")
    .select("id, unit_id, name, slug, type, sort_order")
    .eq("unit_id", unit.id)
    .order("sort_order", { ascending: true });

  if (catErr) {
    // se der erro real, tratamos como notFound pra não quebrar build/render
    return notFound();
  }

  const categories: Category[] = (catRows ?? []).map((c) => ({
    id: c.id,
    unit_id: c.unit_id,
    name: c.name,
    // ✅ slug sempre obrigatório no type — se não vier do banco, geramos pelo name
    slug: (c.slug && String(c.slug).trim()) ? String(c.slug).trim() : slugify(c.name),
    // ✅ type nunca pode virar undefined
    type: c.type ?? null,
    sort_order: c.sort_order ?? 0,
  }));

  // Se não tem categoria, ainda renderiza só o topo
  if (categories.length === 0) {
    return <MenuClient unit={unit} categories={[]} products={[]} />;
  }

  // 3) PRODUCTS
  const { data: prodRows, error: prodErr } = await supabase
    .from("products")
    .select(
      "id, category_id, unit_id, name, description, price, image_url, video_url, is_active, sort_order"
    )
    .eq("unit_id", unit.id)
    .order("sort_order", { ascending: true });

  if (prodErr) {
    return <MenuClient unit={unit} categories={categories} products={[]} />;
  }

  const productIds = (prodRows ?? []).map((p) => p.id);

  // 4) VARIATIONS (opcional)
  let variationsByProduct = new Map<string, ProductVariation[]>();

  if (productIds.length > 0) {
    const { data: varRows } = await supabase
      .from("product_variations")
      .select("id, product_id, name, price, sort_order")
      .in("product_id", productIds)
      .order("sort_order", { ascending: true });

    variationsByProduct = new Map<string, ProductVariation[]>();
    for (const v of varRows ?? []) {
      const item: ProductVariation = {
        id: v.id,
        product_id: v.product_id,
        name: v.name,
        price: v.price ?? null,
        sort_order: v.sort_order ?? 0,
      };

      const list = variationsByProduct.get(v.product_id) ?? [];
      list.push(item);
      variationsByProduct.set(v.product_id, list);
    }
  }

  const products: Product[] = (prodRows ?? []).map((p) => ({
    id: p.id,
    category_id: p.category_id,
    unit_id: p.unit_id,
    name: p.name,
    description: p.description ?? null,
    price: p.price ?? null,
    image_url: p.image_url ?? null,
    video_url: p.video_url ?? null,
    is_active: p.is_active ?? true,
    sort_order: p.sort_order ?? 0,
    variations: variationsByProduct.get(p.id) ?? [],
  }));

  return <MenuClient unit={unit} categories={categories} products={products} />;
}