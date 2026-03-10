// FILE: /app/u/[slug]/menu/page.tsx
// Cardápio presencial — sem botão PEDIR, sem upsell, sem redirecionamento

import { createClient } from "@/lib/supabase/server";
import MenuClient from "../MenuClient";
import type { Category, Product, ProductVariation, Unit } from "../menuTypes";
import { normalizePublicSlug, slugify, toNumberOrNull } from "../menuTypes";

export const revalidate = 0;

export default async function MenuPresencialPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const publicSlug = normalizePublicSlug(slug);
  const supabase = await createClient();

  const { data: unitData, error: unitErr } = await supabase
    .from("units")
    .select(
      "id, restaurant_id, name, slug, city, neighborhood, whatsapp, instagram, maps_url, logo_url"
    )
    .eq("slug", publicSlug)
    .maybeSingle();

  if (unitErr) return <ErrorScreen message={unitErr.message} />;
  if (!unitData) return <NotFoundScreen slug={publicSlug} />;

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
    .select("id, unit_id, name, order_index, is_featured, type")
    .eq("unit_id", unit.id)
    .eq("is_active", true)
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

  if (!categories.length) {
    return <MenuClient unit={unit} categories={[]} products={[]} variations={{}} upsells={{}} mode="presencial" />;
  }

  const validCategoryIds = new Set(categories.map((c) => c.id));

  const { data: productsData, error: prodErr } = await supabase
    .from("products")
    .select(
      "id, category_id, name, description, price_type, base_price, thumbnail_url, video_url, is_active, order_index"
    )
    .in("category_id", Array.from(validCategoryIds))
    .eq("is_active", true)
    .order("order_index", { ascending: true, nullsFirst: false });

  if (prodErr) return <ErrorScreen message={prodErr.message} />;

  const products: Product[] = (productsData ?? []).map((p: any) => ({
    id: p.id,
    category_id: p.category_id,
    name: (p.name ?? "").toString(),
    description: p.description ?? null,
    price_type: p.price_type === "variable" ? "variable" : "fixed",
    base_price: toNumberOrNull(p.base_price),
    image_path: null,
    thumb_path: p.thumbnail_url ?? null,
    video_path: p.video_url ?? null,
    is_active: p.is_active !== false,
    order_index: typeof p.order_index === "number" ? p.order_index : null,
  }));

  const productIds = products.map((p) => p.id);

  if (!productIds.length) {
    return <MenuClient unit={unit} categories={categories} products={[]} variations={{}} upsells={{}} mode="presencial" />;
  }

  const { data: variationsData } = await supabase
    .from("product_variations")
    .select("id, product_id, name, price, order_index")
    .in("product_id", productIds)
    .eq("is_active", true)
    .order("order_index", { ascending: true, nullsFirst: false });

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

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <p className="text-lg font-semibold">Erro ao carregar cardápio</p>
        <p className="mt-2 text-sm text-white/60">{message}</p>
      </div>
    </div>
  );
}

function NotFoundScreen({ slug }: { slug: string }) {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <p className="text-lg font-semibold">Cardápio não encontrado</p>
        <p className="mt-2 text-sm text-white/60">
          Slug: <span className="text-white">{slug}</span>
        </p>
      </div>
    </div>
  );
}
