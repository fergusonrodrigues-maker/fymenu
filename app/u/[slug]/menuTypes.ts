// FILE: /app/u/[slug]/menuTypes.ts
// ACTION: REPLACE ENTIRE FILE

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
  slug?: string;
  type?: string | null;
};

export type ProductVariation = {
  id: string;
  product_id: string;
  name: string;
  price: number | null;
  order_index: number | null;
};

export type Product = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price_type: "fixed" | "variable";
  price: number | null; // vem de base_price (banco) mapeado no page.tsx
  thumbnail_url: string | null;
  video_url: string | null;
  order_index: number | null;
  variations?: ProductVariation[];
};

export type CategoryWithProducts = Category & {
  products: Product[];
};

export type MenuPayload = {
  unit: Unit;
  categories: CategoryWithProducts[];
};

// ─────────────────────────────────────────────
// Helpers (SERVER-SAFE: sem JSX, só TS)
// ─────────────────────────────────────────────

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
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function normalizePublicSlug(input: string): string {
  // corrige \n, espaços etc. e normaliza
  const cleaned = (input ?? "").toString().replace(/\s+/g, " ").trim();
  return slugify(cleaned);
}