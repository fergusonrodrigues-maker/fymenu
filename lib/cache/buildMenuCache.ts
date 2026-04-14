import { createClient } from "@/lib/supabase/server";

export interface MenuCacheData {
  unit: {
    id: string;
    name: string;
    slug: string;
    logo_url?: string;
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
      upsells: any[];
    }>;
  }>;
}

export async function buildMenuCache(unitId: string): Promise<{ menu_json: MenuCacheData; checksum: string }> {
  const supabase = await createClient();

  const { data: unit, error: unitError } = await supabase
    .from("units")
    .select("id, name, slug, restaurant_id, logo_url")
    .eq("id", unitId)
    .single();

  if (unitError || !unit) throw new Error("Unidade não encontrada");

  // restaurants não tem policy pública — tratamos como opcional
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name, plan")
    .eq("id", unit.restaurant_id)
    .maybeSingle();

  const { data: categories, error: catError } = await supabase
    .from("categories")
    .select("id, name, order_index, is_featured, schedule_enabled, available_days, start_time, end_time, availability")
    .eq("unit_id", unitId)
    .order("order_index", { ascending: true });

  if (catError) throw new Error("Erro ao buscar categorias");

  const categoriesWithProducts = await Promise.all(
    (categories || []).map(async (category) => {
      const { data: products } = await supabase
        .from("products")
        .select("id, name, description, base_price, thumbnail_url, video_url, is_active, is_age_restricted, order_index, upsell_mode, avail_mode")
        .eq("category_id", category.id)
        .eq("is_active", true)
        .order("order_index", { ascending: true });

      const productsWithDetails = await Promise.all(
        (products || []).map(async (product) => {
          const { data: variations } = await supabase
            .from("product_variations")
            .select("id, name, price")
            .eq("product_id", product.id)
            .eq("is_active", true);

          const { data: upsells } = await supabase
            .from("product_upsells")
            .select("id, type")
            .eq("product_id", product.id);

          return {
            ...product,
            variations: variations || [],
            upsells: upsells || [],
          };
        })
      );

      return {
        ...category,
        position: category.order_index ?? 0,
        is_featured: category.is_featured ?? false,
        schedule_enabled: category.schedule_enabled ?? false,
        available_days: (category.available_days as string[] | null) ?? [],
        start_time: category.start_time ?? null,
        end_time: category.end_time ?? null,
        availability: (category as any).availability ?? null,
        products: productsWithDetails,
      };
    })
  );

  const menu_json: MenuCacheData = {
    unit: {
      id: unit.id,
      name: unit.name,
      slug: unit.slug,
      logo_url: unit.logo_url || undefined,
    },
    restaurant: restaurant
      ? { id: restaurant.id, name: restaurant.name, plan: restaurant.plan }
      : null,
    categories: categoriesWithProducts,
  };

  const checksum = Buffer.from(JSON.stringify(menu_json)).toString("base64").slice(0, 32);

  return { menu_json, checksum };
}

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

  return menu_json;
}
