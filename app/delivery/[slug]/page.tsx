import { createClient } from "@/lib/supabase/server";
import { getOrBuildMenuCache } from "@/lib/cache/buildMenuCache";
import type { MenuCacheData } from "@/lib/cache/buildMenuCache";
import MenuClient from "./MenuClient";
import type { Category, Product, ProductVariation, Unit } from "./menuTypes";
import { normalizePublicSlug, slugify, toNumberOrNull } from "./menuTypes";
import type { UpsellSuggestion } from "./UpsellModal";
import type { Metadata } from "next";

export const revalidate = 0;

// ─── Storage-first cache helper ───────────────────────────────────────────────
// Priority: 1) Supabase Storage CDN  2) menu_cache table  3) rebuild from DB
// The Storage JSON is served by the Supabase CDN — it stays available even
// during Next.js deploys / cold starts.

async function fetchMenuCache(slug: string, unitId: string): Promise<MenuCacheData> {
  // 1) Try the public Storage CDN URL
  const storageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/menu-cache/${slug}.json`;

  try {
    const res = await fetch(storageUrl, {
      // Cache the CDN response for 30 s within the Next.js data cache.
      // The file itself is updated on every dashboard save, so stale window ≤ 30 s.
      next: { revalidate: 30 },
    });

    if (res.ok) {
      const data = await res.json();
      // Basic validation: must have categories array
      if (data && Array.isArray(data.categories)) {
        return data as MenuCacheData;
      }
    }
  } catch {
    // Storage unreachable — fall through to DB cache
  }

  // 2) Fallback to menu_cache table + rebuild
  return getOrBuildMenuCache(unitId);
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

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
  const mode =
    sp.mode === "mesa"
      ? "mesa"
      : sp.mode === "presencial" || sp.mesa
      ? "presencial"
      : "delivery";
  const publicSlug = normalizePublicSlug(slug);
  const supabase = await createClient();

  // ─── 1) UNIT — always from DB (needed for access control) ─────────────────
  const { data: unitData, error: unitErr } = await supabase
    .from("units")
    .select(
      "id, restaurant_id, name, slug, city, neighborhood, whatsapp, instagram, maps_url, logo_url, cover_url, banner_url, description, payment_active, facebook_pixel_id, ifood_url, ifood_platform, business_hours, force_status, delivery_enabled"
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

    if (!restaurantData?.free_access) {
      return <InactiveScreen />;
    }
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
    delivery_enabled: (unitData as any).delivery_enabled ?? false,
  };

  // ─── 2) MENU DATA — Storage CDN first, table fallback, DB rebuild last ─────
  const cachedMenu = await fetchMenuCache(unit.slug, unit.id);

  // ─── 3) Map categories ─────────────────────────────────────────────────────
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
    return <MenuClient unit={unit} categories={[]} products={[]} variations={{}} upsells={{}} />;
  }

  // ─── 4) Map products ───────────────────────────────────────────────────────
  const products: Product[] = cachedMenu.categories.flatMap((c) =>
    c.products
      .filter((p) => p.is_active !== false)
      .map((p) => ({
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
    return (
      <MenuClient unit={unit} categories={categories} products={[]} variations={{}} upsells={{}} />
    );
  }

  // ─── 5) Map variations ─────────────────────────────────────────────────────
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

  // ─── 6) Upsells — read from cache (no extra DB round-trip) ────────────────
  // The cache already has resolved upsell suggestions (name + price + image).
  // We only populate them when the unit has a WhatsApp number (the only flow
  // that shows the upsell modal).
  const upsells: Record<string, UpsellSuggestion[]> = {};

  if (unit.whatsapp) {
    for (const cat of cachedMenu.categories) {
      for (const product of cat.products) {
        if (product.upsells && product.upsells.length > 0) {
          upsells[product.id] = product.upsells.map((u) => ({
            id: u.id,
            name: u.name,
            price: u.price,
            image_path: u.image_path,
          }));
        }
      }
    }
  }

  // ─── 7) Render ─────────────────────────────────────────────────────────────
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

// ─── Error screens ────────────────────────────────────────────────────────────

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
