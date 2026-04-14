// app/menu/[slug]/page.tsx
// Cardápio presencial — ancora.fymenu.com/menu → middleware → /menu/[slug]
// Usa o mesmo cache que /delivery/[slug]

import { createClient } from "@/lib/supabase/server";
import { getOrBuildMenuCache } from "@/lib/cache/buildMenuCache";
import type { MenuCacheData } from "@/lib/cache/buildMenuCache";
import MenuClient from "@/app/delivery/[slug]/MenuClient";
import type { Category, Product, ProductVariation, Unit } from "@/app/delivery/[slug]/menuTypes";
import { normalizePublicSlug, slugify, toNumberOrNull } from "@/app/delivery/[slug]/menuTypes";

export const revalidate = 0;

// ─── Storage-first cache helper (same logic as /delivery/[slug]) ─────────────
async function fetchMenuCache(slug: string, unitId: string): Promise<MenuCacheData> {
  const storageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/menu-cache/${slug}.json`;
  try {
    const res = await fetch(storageUrl, { next: { revalidate: 30 } });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.categories)) return data as MenuCacheData;
    }
  } catch {}
  return getOrBuildMenuCache(unitId);
}

export default async function MenuPresencialPage({
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
      "id, restaurant_id, name, slug, city, neighborhood, whatsapp, instagram, maps_url, logo_url, cover_url, banner_url, description, payment_active, facebook_pixel_id, ifood_url, ifood_platform, business_hours, force_status"
    )
    .eq("slug", publicSlug)
    .maybeSingle();

  if (unitErr) return <ErrorScreen message={unitErr.message} />;
  if (!unitData) return <NotFoundScreen slug={publicSlug} />;

  // ─── Access control ────────────────────────────────────────────────────────
  if (unitData.payment_active === false && unitData.restaurant_id) {
    const { data: restaurantData } = await supabase
      .from("restaurants")
      .select("free_access")
      .eq("id", unitData.restaurant_id)
      .single();
    if (!restaurantData?.free_access) return <InactiveScreen />;
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
    cover_url: unitData.cover_url ?? null,
    banner_url: unitData.banner_url ?? null,
    description: unitData.description ?? null,
    facebook_pixel_id: unitData.facebook_pixel_id ?? null,
    ifood_url: unitData.ifood_url ?? null,
    ifood_platform: unitData.ifood_platform ?? null,
    business_hours: unitData.business_hours ?? null,
    force_status: unitData.force_status ?? "auto",
  };

  // ─── 2) MENU DATA — Storage CDN first, table fallback, DB rebuild last ─────
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

  if (!categories.length) {
    return <MenuClient unit={unit} categories={[]} products={[]} variations={{}} upsells={{}} mode="presencial" />;
  }

  const products: Product[] = cachedMenu.categories.flatMap((c) =>
    c.products.filter((p) => p.is_active !== false).map((p) => ({
      id: p.id,
      category_id: c.id,
      name: p.name,
      description: p.description ?? null,
      price_type: (p.variations.length > 0 ? "variable" : "fixed") as "fixed" | "variable",
      base_price: toNumberOrNull(p.base_price),
      thumbnail_url: p.thumbnail_url ?? null,
      video_url: p.video_url ?? null,
      is_active: p.is_active,
      is_age_restricted: p.is_age_restricted ?? false,
      order_index: null,
      upsell_mode: p.upsell_mode ?? null,
      avail_mode: p.avail_mode ?? null,
    }))
  );

  if (!products.length) {
    return <MenuClient unit={unit} categories={categories} products={[]} variations={{}} upsells={{}} mode="presencial" />;
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

function InactiveScreen() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <p className="text-lg font-semibold">Cardápio inativo</p>
        <p className="mt-2 text-sm text-white/60">
          Este cardápio está inativo. O proprietário precisa ativar um plano.
        </p>
      </div>
    </div>
  );
}
