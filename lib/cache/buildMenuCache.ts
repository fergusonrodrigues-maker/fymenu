import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Public menu cache shape ──────────────────────────────────────────────────
// This is the canonical JSON written to both the menu_cache table and
// Supabase Storage (menu-cache/{slug}.json).  Consumers should treat every
// field that is not `unit.id` / `categories` as optional so that old cached
// payloads are still accepted gracefully.

export interface MenuCacheData {
  unit: {
    id: string;
    name: string;
    slug: string;
    logo_url?: string;
    cover_url?: string;
    banner_url?: string;
    description?: string;
    whatsapp?: string;
    instagram?: string;
    maps_url?: string;
    city?: string;
    neighborhood?: string;
    facebook_pixel_id?: string;
    ifood_url?: string;
    ifood_platform?: string;
    business_hours?: any;
    force_status?: string;
  };
  restaurant: {
    id: string;
    name: string;
    plan: string;
  } | null;
  categories: Array<{
    id: string;
    name: string;
    position: number;
    is_featured: boolean;
    schedule_enabled?: boolean;
    available_days?: string[];
    start_time?: string | null;
    end_time?: string | null;
    availability?: string | null;
    products: Array<{
      id: string;
      name: string;
      description?: string;
      base_price: number;
      thumbnail_url?: string;
      video_url?: string;
      is_active: boolean;
      is_age_restricted: boolean;
      upsell_mode?: string | null;
      avail_mode?: string | null;
      variations: Array<{
        id: string;
        name: string;
        price: number;
      }>;
      /** Full upsell suggestions — name, price and image already resolved. */
      upsells: Array<{
        id: string;
        name: string;
        price: number;
        image_path?: string;
      }>;
    }>;
  }>;
  generated_at: string;
}

// ─── Build ────────────────────────────────────────────────────────────────────

export async function buildMenuCache(
  unitId: string
): Promise<{ menu_json: MenuCacheData; checksum: string }> {
  const supabase = await createClient();

  // 1) Unit — fetch all fields needed by the public page
  const { data: unit, error: unitError } = await supabase
    .from("units")
    .select(
      "id, name, slug, restaurant_id, logo_url, cover_url, banner_url, description, whatsapp, instagram, maps_url, city, neighborhood, facebook_pixel_id, ifood_url, ifood_platform, business_hours, force_status"
    )
    .eq("id", unitId)
    .single();

  if (unitError || !unit) throw new Error("Unidade não encontrada");

  // 2) Restaurant (optional — RLS may block anonymous reads)
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name, plan")
    .eq("id", unit.restaurant_id)
    .maybeSingle();

  // 3) Categories
  const { data: categories, error: catError } = await supabase
    .from("categories")
    .select(
      "id, name, order_index, is_featured, schedule_enabled, available_days, start_time, end_time, availability"
    )
    .eq("unit_id", unitId)
    .order("order_index", { ascending: true });

  if (catError) throw new Error("Erro ao buscar categorias");

  // 4) All active products for this unit in one query
  const categoryIds = (categories ?? []).map((c) => c.id);

  const { data: allProducts } = categoryIds.length
    ? await supabase
        .from("products")
        .select(
          "id, category_id, name, description, base_price, thumbnail_url, video_url, is_active, is_age_restricted, order_index, upsell_mode, avail_mode"
        )
        .in("category_id", categoryIds)
        .eq("is_active", true)
        .order("order_index", { ascending: true })
    : { data: [] };

  const productIds = (allProducts ?? []).map((p) => p.id);

  // 5) All variations in one query
  const { data: allVariations } = productIds.length
    ? await supabase
        .from("product_variations")
        .select("id, product_id, name, price, order_index")
        .in("product_id", productIds)
        .order("order_index", { ascending: true })
    : { data: [] };

  // 6) Upsells — resolve full suggestion data in two queries
  const { data: upsellGroups } = productIds.length
    ? await supabase
        .from("product_upsells")
        .select("id, product_id")
        .in("product_id", productIds)
    : { data: [] };

  const upsellGroupIds = (upsellGroups ?? []).map((g: any) => g.id);

  const { data: upsellItems } = upsellGroupIds.length
    ? await supabase
        .from("product_upsell_items")
        .select("upsell_id, product_id, position")
        .in("upsell_id", upsellGroupIds)
        .order("position", { ascending: true })
    : { data: [] };

  // Build lookup maps for upsells
  const upsellGroupMap = new Map<string, string>(
    (upsellGroups ?? []).map((g: any) => [g.id, g.product_id])
  );
  const productMap = new Map(
    (allProducts ?? []).map((p) => [p.id, p])
  );
  const variationsByProduct = new Map<string, typeof allVariations>();
  for (const v of allVariations ?? []) {
    const arr = variationsByProduct.get((v as any).product_id) ?? [];
    arr.push(v as any);
    variationsByProduct.set((v as any).product_id, arr);
  }

  // owner product_id → resolved suggestions
  const resolvedUpsells = new Map<
    string,
    { id: string; name: string; price: number; image_path?: string }[]
  >();

  for (const item of upsellItems ?? []) {
    const ownerProductId = upsellGroupMap.get((item as any).upsell_id);
    if (!ownerProductId) continue;

    const suggested = productMap.get((item as any).product_id);
    if (!suggested) continue;

    const existing = resolvedUpsells.get(ownerProductId) ?? [];
    if (existing.some((u) => u.id === suggested.id)) continue;

    const suggestedVars = variationsByProduct.get(suggested.id) ?? [];
    const price =
      suggestedVars.length > 0
        ? Math.min(...suggestedVars.map((v: any) => v.price))
        : (suggested.base_price ?? 0);

    existing.push({
      id: suggested.id,
      name: suggested.name,
      price,
      image_path: suggested.thumbnail_url ?? undefined,
    });
    resolvedUpsells.set(ownerProductId, existing);
  }

  // 7) Assemble categories → products
  const productsByCategory = new Map<string, typeof allProducts>();
  for (const p of allProducts ?? []) {
    const arr = productsByCategory.get((p as any).category_id) ?? [];
    arr.push(p as any);
    productsByCategory.set((p as any).category_id, arr);
  }

  const categoriesWithProducts = (categories ?? []).map((category) => {
    const products = (productsByCategory.get(category.id) ?? []).map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description ?? undefined,
      base_price: product.base_price ?? 0,
      thumbnail_url: product.thumbnail_url ?? undefined,
      video_url: product.video_url ?? undefined,
      is_active: product.is_active ?? true,
      is_age_restricted: product.is_age_restricted ?? false,
      upsell_mode: product.upsell_mode ?? null,
      avail_mode: product.avail_mode ?? null,
      variations: (variationsByProduct.get(product.id) ?? []).map((v: any) => ({
        id: v.id,
        name: v.name,
        price: v.price,
      })),
      upsells: resolvedUpsells.get(product.id) ?? [],
    }));

    return {
      id: category.id,
      name: category.name,
      position: category.order_index ?? 0,
      is_featured: category.is_featured ?? false,
      schedule_enabled: category.schedule_enabled ?? false,
      available_days: (category.available_days as string[] | null) ?? [],
      start_time: category.start_time ?? null,
      end_time: category.end_time ?? null,
      availability: (category as any).availability ?? null,
      products,
    };
  });

  const menu_json: MenuCacheData = {
    unit: {
      id: unit.id,
      name: unit.name,
      slug: unit.slug,
      logo_url: unit.logo_url ?? undefined,
      cover_url: unit.cover_url ?? undefined,
      banner_url: unit.banner_url ?? undefined,
      description: unit.description ?? undefined,
      whatsapp: unit.whatsapp ?? undefined,
      instagram: unit.instagram ?? undefined,
      maps_url: unit.maps_url ?? undefined,
      city: unit.city ?? undefined,
      neighborhood: unit.neighborhood ?? undefined,
      facebook_pixel_id: unit.facebook_pixel_id ?? undefined,
      ifood_url: unit.ifood_url ?? undefined,
      ifood_platform: unit.ifood_platform ?? undefined,
      business_hours: unit.business_hours ?? undefined,
      force_status: unit.force_status ?? undefined,
    },
    restaurant: restaurant
      ? { id: restaurant.id, name: restaurant.name, plan: restaurant.plan }
      : null,
    categories: categoriesWithProducts,
    generated_at: new Date().toISOString(),
  };

  const checksum = Buffer.from(JSON.stringify(menu_json))
    .toString("base64")
    .slice(0, 32);

  return { menu_json, checksum };
}

// ─── Upload to Supabase Storage ───────────────────────────────────────────────

/**
 * Uploads the menu JSON to the public `menu-cache` Storage bucket.
 * Uses the admin client (service_role) so no RLS gets in the way.
 * Fails silently — callers should wrap in try/catch if needed.
 */
export async function uploadMenuCacheToStorage(
  slug: string,
  menu_json: MenuCacheData
): Promise<void> {
  const admin = createAdminClient();
  const body = JSON.stringify(menu_json);

  const { error } = await admin.storage
    .from("menu-cache")
    .upload(`${slug}.json`, body, {
      contentType: "application/json",
      upsert: true,
      cacheControl: "30", // CDN cache: 30 s — matches ISR revalidate
    });

  if (error) {
    // Log but don't throw — Storage is a best-effort layer
    console.warn("[menu-cache] Storage upload failed:", error.message);
  }
}

// ─── Get or build (used by public pages) ─────────────────────────────────────

export async function getOrBuildMenuCache(unitId: string): Promise<MenuCacheData> {
  const supabase = await createClient();

  const { data: cache } = await supabase
    .from("menu_cache")
    .select("menu_json, expires_at")
    .eq("unit_id", unitId)
    .maybeSingle();

  if (cache && cache.expires_at && new Date(cache.expires_at) > new Date()) {
    return cache.menu_json as MenuCacheData;
  }

  const { menu_json, checksum } = await buildMenuCache(unitId);

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  await supabase.from("menu_cache").upsert(
    {
      unit_id: unitId,
      menu_json,
      checksum,
      expires_at: expiresAt.toISOString(),
      last_built_at: new Date().toISOString(),
    },
    { onConflict: "unit_id" }
  );

  // Best-effort Storage upload
  try {
    await uploadMenuCacheToStorage(menu_json.unit.slug, menu_json);
  } catch {}

  return menu_json;
}
