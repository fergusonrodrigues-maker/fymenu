// app/menu/[slug]/page.tsx
// Cardápio presencial — sem botão PEDIR, sem upsell
// Accessed via: empresa.fymenu.com/menu (middleware rewrites to /menu/slug)

import { createClient } from "@/lib/supabase/server";
import MenuClient from "@/app/delivery/[slug]/MenuClient";
import type { Category, Product, ProductVariation, Unit } from "@/app/delivery/[slug]/menuTypes";
import { normalizePublicSlug, slugify, toNumberOrNull } from "@/app/delivery/[slug]/menuTypes";

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
    .select("id, restaurant_id, name, slug, city, neighborhood, whatsapp, instagram, maps_url, logo_url, cover_url, banner_url, description")
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
    cover_url: unitData.cover_url ?? null,
    banner_url: unitData.banner_url ?? null,
    description: unitData.description ?? null,
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

  if (!categories.length) {
    return <MenuClient unit={unit} categories={[]} products={[]} variations={{}} upsells={{}} mode="presencial" />;
  }

  const validCategoryIds = new Set(categories.map((c) => c.id));

  const { data: productsData, error: prodErr } = await supabase
    .from("products")
    .select("id, category_id, name, description, price_type, base_price, thumbnail_url, video_url, is_active, order_index, is_age_restricted")
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
    thumbnail_url: p.thumbnail_url ?? null,
    video_url: p.video_url ?? null,
    is_active: p.is_active !== false,
    order_index: typeof p.order_index === "number" ? p.order_index : null,
    is_age_restricted: p.is_age_restricted ?? false,
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
    <div style={{ minHeight: "100vh", background: "#000", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div>
        <p style={{ fontSize: 18, fontWeight: 600 }}>Erro ao carregar cardápio</p>
        <p style={{ marginTop: 8, fontSize: 14, opacity: 0.6 }}>{message}</p>
      </div>
    </div>
  );
}

function NotFoundScreen({ slug }: { slug: string }) {
  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div>
        <p style={{ fontSize: 18, fontWeight: 600 }}>Cardápio não encontrado</p>
        <p style={{ marginTop: 8, fontSize: 14, opacity: 0.6 }}>Slug: {slug}</p>
      </div>
    </div>
  );
}
