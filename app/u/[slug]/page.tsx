// FILE: /app/u/[slug]/page.tsx

import { createClient } from "@/lib/supabase/server";
import MenuClient from "./MenuClient";
import type { Category, Product, ProductVariation, Unit } from "./menuTypes";
import { normalizePublicSlug, slugify, toNumberOrNull } from "./menuTypes";
import type { UpsellSuggestion } from "./UpsellModal";

export const revalidate = 0;

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const publicSlug = normalizePublicSlug(slug);
  const supabase = await createClient();

  // ─── 1) UNIT ──────────────────────────────────────────────────────────────
  const { data: unitData, error: unitErr } = await supabase
    .from("units")
    .select(
      "id, restaurant_id, name, slug, city, neighborhood, whatsapp, instagram, maps_url, logo_url, order_type, order_link"
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
    order_type: unitData.order_type ?? "whatsapp",
    order_link: unitData.order_link ?? null,
  };

  // ─── 2) CATEGORIES ────────────────────────────────────────────────────────
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
      is_featured: c.is_featured === true,
      slug: slugify(name || `categoria-${idx + 1}`),
      type: c.type ?? null,
    };
  });

  if (!categories.length) {
    return <MenuClient unit={unit} categories={[]} products={[]} variations={{}} upsells={{}} />;
  }

  const validCategoryIds = new Set(categories.map((c) => c.id));

  // ─── 3) PRODUCTS ──────────────────────────────────────────────────────────
  const { data: productsData, error: prodErr } = await supabase
    .from("products")
    .select(
      "id, category_id, name, description, price_type, base_price, image_path, thumb_path, video_path, is_active, order_index"
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
    image_path: p.image_path ?? null,
    thumb_path: p.thumb_path ?? null,
    video_path: p.video_path ?? null,
    is_active: p.is_active !== false,
    order_index: typeof p.order_index === "number" ? p.order_index : null,
  }));

  const productIds = products.map((p) => p.id);

  if (!productIds.length) {
    return <MenuClient unit={unit} categories={categories} products={[]} variations={{}} upsells={{}} />;
  }

  // ─── 4) VARIATIONS ────────────────────────────────────────────────────────
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

  // ─── 5) UPSELLS ───────────────────────────────────────────────────────────
  // product_upsells: { id, product_id } — o grupo de upsell de um produto
  // product_upsell_items: { upsell_id, product_id (do item sugerido), position }
  // Só buscamos upsells se o destino for WhatsApp (único fluxo que usa upsell completo)
  const upsells: Record<string, UpsellSuggestion[]> = {};

  if (unit.order_type === "whatsapp" || !unit.order_type) {
    const { data: upsellGroups } = await supabase
      .from("product_upsells")
      .select("id, product_id")
      .in("product_id", productIds);

    const upsellGroupIds = (upsellGroups ?? []).map((u: any) => u.id);

    if (upsellGroupIds.length > 0) {
      const { data: upsellItems } = await supabase
        .from("product_upsell_items")
        .select("upsell_id, product_id, position")
        .in("upsell_id", upsellGroupIds)
        .order("position", { ascending: true });

      // Mapa upsell_id → product_id do grupo
      const upsellGroupMap = new Map<string, string>(
        (upsellGroups ?? []).map((u: any) => [u.id, u.product_id])
      );

      // Mapa product_id → produto (para pegar nome e preço do item sugerido)
      const productMap = new Map<string, Product>(products.map((p) => [p.id, p]));

      for (const item of upsellItems ?? []) {
        const ownerProductId = upsellGroupMap.get(item.upsell_id);
        if (!ownerProductId) continue;

        const suggestedProduct = productMap.get(item.product_id);
        if (!suggestedProduct) continue;

        if (!upsells[ownerProductId]) upsells[ownerProductId] = [];

        // Evita duplicata
        if (upsells[ownerProductId].some((u) => u.id === suggestedProduct.id)) continue;

        // Preço do item sugerido: base_price ou menor variação
        const itemVariations = variations[suggestedProduct.id] ?? [];
        const suggestedPrice =
          suggestedProduct.price_type === "variable" && itemVariations.length > 0
            ? Math.min(...itemVariations.map((v) => v.price))
            : (suggestedProduct.base_price ?? 0);

        upsells[ownerProductId].push({
          id: suggestedProduct.id,
          name: suggestedProduct.name,
          price: suggestedPrice,
          image_path: suggestedProduct.thumb_path ?? suggestedProduct.image_path ?? undefined,
        });
      }
    }
  }

  // ─── 6) RENDER ────────────────────────────────────────────────────────────
  return (
    <MenuClient
      unit={unit}
      categories={categories}
      products={products}
      variations={variations}
      upsells={upsells}
    />
  );
}

// ─── Telas de erro/404 ────────────────────────────────────────────────────────

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
