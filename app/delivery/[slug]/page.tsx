// FILE: /app/u/[slug]/page.tsx

import { createClient } from "@/lib/supabase/server";
import { getOrBuildMenuCache } from "@/lib/cache/buildMenuCache";
import MenuClient from "./MenuClient";
import type { Category, Product, ProductVariation, Unit } from "./menuTypes";
import { normalizePublicSlug, slugify, toNumberOrNull } from "./menuTypes";
import type { UpsellSuggestion } from "./UpsellModal";
import type { Metadata } from "next";

export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const publicSlug = normalizePublicSlug(slug);
  const supabase = await createClient();

  try {
    const { data: unit } = await supabase
      .from("units")
      .select("name, logo_url, restaurant_id")
      .eq("slug", publicSlug)
      .single();

    if (!unit) return { title: "Cardápio não encontrado" };

    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("name")
      .eq("id", unit.restaurant_id)
      .single();

    const title = `${unit.name} - Cardápio Digital`;
    const description = `Veja o cardápio de ${restaurant?.name ?? unit.name} online. Peça no WhatsApp!`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: unit.logo_url ? [unit.logo_url] : [],
      },
    };
  } catch {
    return { title: "Cardápio Digital" };
  }
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ mesa?: string; mode?: string }>;
}) {
  const { slug } = await params;
  const sp = searchParams ? await searchParams : {};
  const tableNumber = sp.mesa ? parseInt(sp.mesa) || null : null;
  const mode = sp.mode === "presencial" || sp.mesa ? "presencial" : "delivery";
  const publicSlug = normalizePublicSlug(slug);
  const supabase = await createClient();

  // ─── 1) UNIT ──────────────────────────────────────────────────────────────
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

  // ─── 2–4) CATEGORIES + PRODUCTS + VARIATIONS (via cache) ──────────────────
  const cachedMenu = await getOrBuildMenuCache(unit.id);

  const categories: Category[] = cachedMenu.categories.map((c, idx) => ({
    id: c.id,
    unit_id: unit.id,
    name: c.name,
    order_index: c.position,
    is_featured: c.is_featured ?? false,
    slug: slugify(c.name || `categoria-${idx + 1}`),
    type: null,
  }));

  if (!categories.length) {
    return <MenuClient unit={unit} categories={[]} products={[]} variations={{}} upsells={{}} />;
  }

  const products: Product[] = cachedMenu.categories.flatMap((c) =>
    c.products.map((p) => ({
      id: p.id,
      category_id: c.id,
      name: p.name,
      description: p.description ?? null,
      price_type: (p.variations.length > 0 ? "variable" : "fixed") as "fixed" | "variable",
      base_price: toNumberOrNull(p.base_price),
      thumbnail_url: p.thumbnail_url ?? null,
      video_url: p.video_url ?? null,
      is_active: p.is_active,
      order_index: null,
    }))
  );

  const productIds = products.map((p) => p.id);

  if (!productIds.length) {
    return <MenuClient unit={unit} categories={categories} products={[]} variations={{}} upsells={{}} />;
  }

  const variations: Record<string, ProductVariation[]> = {};
  for (const cat of cachedMenu.categories) {
    for (const product of cat.products) {
      if (product.variations.length > 0) {
        variations[product.id] = product.variations.map((v, idx) => ({
          id: v.id,
          product_id: product.id,
          name: v.name,
          price: v.price,
          order_index: idx,
        }));
      }
    }
  }

  // ─── 5) UPSELLS ───────────────────────────────────────────────────────────
  // product_upsells: { id, product_id } — o grupo de upsell de um produto
  // product_upsell_items: { upsell_id, product_id (do item sugerido), position }
  // Só buscamos upsells se o destino for WhatsApp (único fluxo que usa upsell completo)
  const upsells: Record<string, UpsellSuggestion[]> = {};

  if (unit.whatsapp) {
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
          image_path: suggestedProduct.thumbnail_url ?? undefined,
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
      mode={mode}
      initialTable={tableNumber}
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
