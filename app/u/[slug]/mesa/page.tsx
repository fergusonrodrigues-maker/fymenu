import { createClient } from "@/lib/supabase/server";
import { getOrBuildMenuCache } from "@/lib/cache/buildMenuCache";
import type { MenuCacheData } from "@/lib/cache/buildMenuCache";
import MesaMenuClient from "./MesaMenuClient";
import type { Category, Product, ProductVariation, Unit } from "@/app/delivery/[slug]/menuTypes";
import { normalizePublicSlug, slugify, toNumberOrNull } from "@/app/delivery/[slug]/menuTypes";

export const revalidate = 0;

async function fetchMenuCache(slug: string, unitId: string): Promise<MenuCacheData> {
  const storageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/menu-cache/${slug}.json`;
  try {
    const res = await fetch(storageUrl, { next: { revalidate: 30 } });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.categories)) return data as MenuCacheData;
    }
  } catch { /* fall through */ }
  return getOrBuildMenuCache(unitId);
}

export default async function MesaPage({
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
      "id, restaurant_id, name, slug, logo_url, cover_url, business_hours, force_status, payment_active"
    )
    .eq("slug", publicSlug)
    .maybeSingle();

  if (unitErr || !unitData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <p className="text-gray-500">Cardápio não encontrado.</p>
      </div>
    );
  }

  if (unitData.payment_active === false && unitData.restaurant_id) {
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("free_access")
      .eq("id", unitData.restaurant_id)
      .single();
    if (!restaurant?.free_access) {
      return (
        <div className="min-h-screen bg-white flex items-center justify-center p-6 text-center">
          <div>
            <p className="text-lg font-semibold text-gray-800">Cardápio inativo</p>
            <p className="mt-2 text-sm text-gray-500">O proprietário precisa ativar um plano.</p>
          </div>
        </div>
      );
    }
  }

  const unit: Unit = {
    id: unitData.id,
    restaurant_id: unitData.restaurant_id ?? null,
    name: unitData.name ?? "",
    slug: unitData.slug ?? publicSlug,
    city: null,
    neighborhood: null,
    whatsapp: null,
    instagram: null,
    maps_url: null,
    logo_url: unitData.logo_url ?? null,
    cover_url: unitData.cover_url ?? null,
    banner_url: null,
    description: null,
    business_hours: unitData.business_hours ?? null,
    force_status: unitData.force_status ?? "auto",
    delivery_enabled: false,
  };

  const cachedMenu = await fetchMenuCache(unit.slug, unit.id);

  const categories: Category[] = cachedMenu.categories.map((c, idx) => ({
    id: c.id,
    unit_id: unit.id,
    name: c.name,
    order_index: c.position,
    is_featured: c.is_featured ?? false,
    slug: slugify(c.name || `categoria-${idx + 1}`),
    type: null,
    schedule_enabled: c.schedule_enabled ?? false,
    available_days: c.available_days ?? [],
    start_time: c.start_time ?? null,
    end_time: c.end_time ?? null,
    availability: c.availability ?? null,
  }));

  const products: Product[] = cachedMenu.categories.flatMap((c) =>
    c.products
      .filter((p) => p.is_active !== false)
      // exclude delivery-only products
      .filter((p) => !p.avail_mode || p.avail_mode === "both" || p.avail_mode === "mesa")
      .map((p) => ({
        id: p.id,
        category_id: c.id,
        name: p.name,
        description: p.description ?? null,
        price_type: (p.variations.length > 0 ? "variable" : "fixed") as "fixed" | "variable",
        base_price: toNumberOrNull(p.base_price),
        thumbnail_url: p.thumbnail_url ?? null,
        video_url: null,
        is_active: p.is_active,
        is_age_restricted: p.is_age_restricted ?? false,
        order_index: null,
        upsell_mode: null,
        avail_mode: p.avail_mode ?? null,
      }))
  );

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

  return (
    <MesaMenuClient
      unit={unit}
      categories={categories}
      products={products}
      variations={variations}
    />
  );
}
