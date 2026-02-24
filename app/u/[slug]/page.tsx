// FILE: /app/u/[slug]/page.tsx
// ACTION: REPLACE ENTIRE FILE

import type { Category, MenuPayload, Product, ProductVariation, Unit } from "./menuTypes";
import { normalizePublicSlug, slugify } from "./menuTypes";
import MenuClient from "./MenuClient";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 0;

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const publicSlug = normalizePublicSlug(slug);

  const supabase = await createClient();

  // 1) UNIT
  const { data: unitData, error: unitErr } = await supabase
    .from("units")
    .select(
      "id, restaurant_id, name, slug, city, neighborhood, whatsapp, instagram, maps_url, logo_url"
    )
    .eq("slug", publicSlug)
    .maybeSingle();

  if (unitErr) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="text-lg font-semibold">Erro ao carregar unidade</div>
          <div className="mt-2 text-sm text-white/70">{unitErr.message}</div>
        </div>
      </div>
    );
  }

  if (!unitData) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="text-lg font-semibold">Unidade não encontrada</div>
          <div className="mt-2 text-sm text-white/70">
            Slug: <span className="text-white">{publicSlug}</span>
          </div>
        </div>
      </div>
    );
  }

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

  // 2) CATEGORIES (sem slug/type no banco)
  const { data: categoriesData, error: catErr } = await supabase
    .from("categories")
    .select("id, unit_id, name, order_index")
    .eq("unit_id", unit.id)
    .order("order_index", { ascending: true, nullsFirst: false });

  if (catErr) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="text-lg font-semibold">Erro ao carregar categorias</div>
          <div className="mt-2 text-sm text-white/70">{catErr.message}</div>
        </div>
      </div>
    );
  }

  const categories: Category[] = (categoriesData ?? []).map((c: any, idx: number) => {
    const name = (c?.name ?? "").toString();
    return {
      id: c.id,
      unit_id: c.unit_id,
      name,
      slug: slugify(name || `categoria-${idx + 1}`),
      type: null, // não existe no banco
      sort_order: typeof c.order_index === "number" ? c.order_index : idx,
    };
  });

  const validCategoryIds = new Set(categories.map((c) => c.id));

  // 3) PRODUCTS (⚠️ removido is_active do select)
  const { data: productsData, error: prodErr } = await supabase
    .from("products")
    .select("id, name, category_id, description, base_price, thumbnail_url, video_url, order_index")
    .in("category_id", Array.from(validCategoryIds))
    .order("order_index", { ascending: true, nullsFirst: false });

  if (prodErr) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="text-lg font-semibold">Erro ao carregar produtos</div>
          <div className="mt-2 text-sm text-white/70">{prodErr.message}</div>
        </div>
      </div>
    );
  }

  const productIds = (productsData ?? []).map((p: any) => p.id);

  // 4) VARIATIONS
  const { data: variationsData, error: varErr } = await supabase
    .from("product_variations")
    .select("id, product_id, name, price, order_index")
    .in("product_id", productIds)
    .order("order_index", { ascending: true, nullsFirst: false });

  if (varErr) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="text-lg font-semibold">Erro ao carregar variações</div>
          <div className="mt-2 text-sm text-white/70">{varErr.message}</div>
        </div>
      </div>
    );
  }

  const variationsByProduct = new Map<string, ProductVariation[]>();
  for (const v of variationsData ?? []) {
    const list = variationsByProduct.get(v.product_id) ?? [];
    list.push({
      id: v.id,
      product_id: v.product_id,
      name: (v.name ?? "").toString(),
      price: toNumberOrNull(v.price),
      sort_order: typeof v.order_index === "number" ? v.order_index : 0,
    });
    variationsByProduct.set(v.product_id, list);
  }

  // 5) MAPPER FINAL
  const products: Product[] = (productsData ?? [])
    .filter((p: any) => validCategoryIds.has(p.category_id))
    .map((p: any, idx: number) => ({
      id: p.id,
      category_id: p.category_id,
      unit_id: unit.id,
      name: (p.name ?? "").toString(),
      description: p.description ?? null,
      price: toNumberOrNull(p.base_price),
      image_url: p.thumbnail_url ?? null,
      video_url: p.video_url ?? null,
      is_active: true, // ✅ sem coluna no banco, ativo por padrão
      sort_order: typeof p.order_index === "number" ? p.order_index : idx,
      variations: variationsByProduct.get(p.id) ?? [],
    }));

  const payload: MenuPayload = { unit, categories, products };

  return <MenuClient unit={payload.unit} categories={payload.categories} products={payload.products} />;
}