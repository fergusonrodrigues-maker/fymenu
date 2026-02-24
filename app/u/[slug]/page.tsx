// FILE: /app/u/[slug]/page.tsx
// ACTION: REPLACE ENTIRE FILE

import MenuClient from "./MenuClient";
import BottomGlassBar from "./BottomGlassBar";
import { createClient } from "@/lib/supabase/server";
import type { Category, Product, ProductVariation, Unit } from "./menuTypes";
import { normalizePublicSlug, slugify } from "./menuTypes";

type PageProps = {
  params: { slug: string } | Promise<{ slug: string }>;
};

type UnitRow = {
  id: string;
  restaurant_id: string | null;
  name: string | null;
  slug: string | null;
  address: string | null;
  city: string | null;
  neighborhood: string | null;
  whatsapp: string | null;
  instagram: string | null;
  logo_url: string | null;

  // se existir no futuro:
  maps_url?: string | null;
};

type CategoryRow = {
  id: string;
  unit_id?: string | null; // pode não vir no select
  name: string | null;
  order_index: number | null;

  // se existir no futuro:
  type?: string | null;
  slug?: string | null;
};

type ProductRow = {
  id: string;
  category_id: string;
  name: string | null;
  description: string | null;
  price_type: "fixed" | "variable" | null;
  base_price: number | null;
  thumbnail_url: string | null;
  video_url: string | null;
  order_index: number | null;

  // se existir no futuro:
  is_active?: boolean | null;
};

type VariationRow = {
  id: string;
  product_id: string;
  name: string | null;
  price: number | null;
  order_index: number | null;
};

export default async function Page(props: PageProps) {
  const supabase = await createClient();

  const resolvedParams = await props.params;
  const publicSlug = normalizePublicSlug(resolvedParams.slug);

  // 1) UNIT
  const { data: unitRow, error: unitErr } = await supabase
    .from("units")
    .select("id, restaurant_id, name, slug, address, city, neighborhood, whatsapp, instagram, logo_url, maps_url")
    .eq("slug", publicSlug)
    .maybeSingle<UnitRow>();

  if (unitErr || !unitRow?.id) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-lg font-semibold">Unidade não encontrada</div>
          <div className="text-sm text-white/60 mt-2">Slug: {publicSlug}</div>
        </div>
      </div>
    );
  }

  const unit: Unit = {
    id: unitRow.id,
    restaurant_id: unitRow.restaurant_id ?? null,
    name: unitRow.name ?? "Sem nome",
    slug: unitRow.slug ?? publicSlug,
    address: unitRow.address ?? null,
    city: unitRow.city ?? null,
    neighborhood: unitRow.neighborhood ?? null,
    whatsapp: unitRow.whatsapp ?? null,
    instagram: unitRow.instagram ?? null,
    maps_url: (unitRow.maps_url ?? null) as any,
    logo_url: unitRow.logo_url ?? null,
  };

  // 2) CATEGORIES
  const { data: categoryRows, error: catErr } = await supabase
    .from("categories")
    .select("id, name, order_index")
    .eq("unit_id", unit.id)
    .order("order_index", { ascending: true })
    .returns<CategoryRow[]>();

  if (catErr) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-lg font-semibold">Erro ao carregar categorias</div>
          <div className="text-sm text-white/60 mt-2">{catErr.message}</div>
        </div>
      </div>
    );
  }

  // 3) PRODUCTS
  const { data: productRows, error: prodErr } = await supabase
    .from("products")
    .select("id, category_id, name, description, price_type, base_price, thumbnail_url, video_url, order_index, is_active")
    .eq("unit_id", unit.id)
    .order("order_index", { ascending: true })
    .returns<ProductRow[]>();

  if (prodErr) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-lg font-semibold">Erro ao carregar produtos</div>
          <div className="text-sm text-white/60 mt-2">{prodErr.message}</div>
        </div>
      </div>
    );
  }

  // 4) VARIATIONS (de todos os products)
  const productIds = (productRows ?? []).map((p) => p.id);

  const { data: variationRows, error: varErr } = await supabase
    .from("product_variations")
    .select("id, product_id, name, price, order_index")
    .in("product_id", productIds.length ? productIds : ["00000000-0000-0000-0000-000000000000"])
    .order("order_index", { ascending: true })
    .returns<VariationRow[]>();

  if (varErr) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-lg font-semibold">Erro ao carregar variações</div>
          <div className="text-sm text-white/60 mt-2">{varErr.message}</div>
        </div>
      </div>
    );
  }

  // Index variations by product_id
  const variationsByProduct = new Map<string, ProductVariation[]>();
  for (const v of variationRows ?? []) {
    if (!v?.id || !v.product_id) continue;

    const item: ProductVariation = {
      id: v.id,
      product_id: v.product_id,
      name: v.name ?? "Variação",
      price: v.price ?? null,
      sort_order: v.order_index ?? 0,
    };

    const list = variationsByProduct.get(v.product_id) ?? [];
    list.push(item);
    variationsByProduct.set(v.product_id, list);
  }

  // Build categories (UI)
  const categoriesAll: Category[] = (categoryRows ?? [])
    .filter((c) => c?.id && (c.name ?? "").trim() !== "")
    .map((c) => ({
      id: c.id,
      unit_id: unit.id,
      name: c.name ?? "Categoria",
      slug: slugify(c.name ?? "categoria"),
      type: null, // ✅ seu DB não tem type confirmado
      sort_order: c.order_index ?? 0,
    }));

  const categoryIdSet = new Set(categoriesAll.map((c) => c.id));

  // Build products (UI)
  const productsAll: Product[] = (productRows ?? [])
    .filter((p) => p?.id && categoryIdSet.has(p.category_id))
    .map((p) => ({
      id: p.id,
      category_id: p.category_id,
      unit_id: unit.id,
      name: p.name ?? "Produto",
      description: p.description ?? null,
      price: p.base_price ?? null, // ✅ DB -> UI
      image_url: p.thumbnail_url ?? null, // ✅ DB -> UI
      video_url: p.video_url ?? null,
      is_active: p.is_active ?? true, // ✅ se não existir, default true
      sort_order: p.order_index ?? 0, // ✅ DB -> UI
      variations: variationsByProduct.get(p.id) ?? [],
    }));

  // ✅ filtra categorias vazias (como você já vinha fazendo)
  const productsByCategoryCount = new Map<string, number>();
  for (const p of productsAll) {
    productsByCategoryCount.set(p.category_id, (productsByCategoryCount.get(p.category_id) ?? 0) + 1);
  }

  const categories = categoriesAll.filter((c) => (productsByCategoryCount.get(c.id) ?? 0) > 0);

  // se alguma categoria foi removida por estar vazia, remove produtos órfãos (segurança)
  const finalCategorySet = new Set(categories.map((c) => c.id));
  const products = productsAll.filter((p) => finalCategorySet.has(p.category_id));

  return (
    <>
      <MenuClient unit={unit} categories={categories} products={products} />
      <BottomGlassBar unit={unit} />
    </>
  );
}