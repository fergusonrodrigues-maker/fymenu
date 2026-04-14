// FILE: /app/u/[slug]/menuTypes.ts
export type Unit = {
  id: string;
  restaurant_id: string | null;
  name: string;
  slug: string;
  city: string | null;
  neighborhood: string | null;
  whatsapp: string | null;
  instagram: string | null;
  maps_url: string | null;
  logo_url: string | null;
  cover_url: string | null;
  banner_url: string | null;
  description: string | null;
  facebook_pixel_id?: string | null;
  ifood_url?: string | null;
  ifood_platform?: string | null;
  business_hours?: any[] | null;
  force_status?: string | null;
};
export type Category = {
  id: string;
  unit_id: string;
  name: string;
  order_index: number | null;
  is_featured: boolean;
  slug?: string;
  type?: string | null;
  schedule_enabled?: boolean;
  available_days?: string[];
  start_time?: string | null;
  end_time?: string | null;
  availability?: string | null; // 'both' | 'delivery' | 'mesa'
};
export type ProductVariation = {
  id: string;
  product_id: string;
  name: string;
  price: number;
  order_index: number | null;
};
export type Product = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  description_source?: "MANUAL" | "AI_GENERATED" | "HYBRID" | null;
  price_type: "fixed" | "variable";
  base_price: number | null;
  thumbnail_url: string | null;
  video_url: string | null;
  is_active: boolean;
  order_index: number | null;
  is_age_restricted?: boolean;
  upsell_mode?: string | null; // 'auto' | 'manual' | 'off'
  avail_mode?: string | null;  // 'both' | 'delivery' | 'mesa'
};

// Categoria com produtos embutidos (usado em CategoryPillsTop e similares)
export type CategoryWithProducts = Category & {
  products: Product[];
};

// ─── Helpers (server-safe) ───────────────────────────────────────────────────
export function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}
export function slugify(input: string): string {
  return (input ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
export function normalizePublicSlug(input: string): string {
  const cleaned = (input ?? "").toString().replace(/\s+/g, " ").trim();
  return slugify(cleaned);
}
