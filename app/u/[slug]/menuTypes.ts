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
};
export type Category = {
  id: string;
  unit_id: string;
  name: string;
  order_index: number | null;
  is_featured: boolean;
  slug?: string;
  type?: string | null;
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
  price_type: "fixed" | "variable";
  base_price: number | null;
  image_path: string | null;
  thumb_path: string | null;
  video_path: string | null;
  is_active: boolean;
  order_index: number | null;
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
