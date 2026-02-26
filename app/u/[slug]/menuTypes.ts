// FILE: /app/u/[slug]/menuTypes.ts
// ACTION: REPLACE ENTIRE FILE

export type UUID = string;

export type Unit = {
  id: UUID;
  restaurant_id: UUID | null;
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
  id: UUID;
  unit_id: UUID;
  name: string;
  order_index: number | null;

  // Não existe no banco hoje, mas a UI pode usar.
  slug?: string | null;
  type?: string | null;
};

export type ProductVariation = {
  id: UUID;
  product_id: UUID;
  name: string;
  price: number | null;
  order_index: number | null;
};

export type Product = {
  id: UUID;
  category_id: UUID;

  name: string;
  description: string | null;

  // Confirmado no seu banco
  price_type: "fixed" | "variable";
  base_price: number | null;

  // Confirmado no seu banco
  thumbnail_url: string | null;
  video_url: string | null;

  // Confirmado no seu banco (pode vir null)
  order_index: number | null;

  variations: ProductVariation[];
};

export type CategoryWithProducts = Category & {
  products: Product[];
};

export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Normaliza slug vindo da URL (evita bug de \n, espaços etc.)
 */
export function normalizePublicSlug(raw: string): string {
  return (raw ?? "").toString().trim().replace(/\s+/g, "");
}

export function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}