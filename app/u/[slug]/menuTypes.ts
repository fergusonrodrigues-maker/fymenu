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
  /**
   * Importante:
   * - No seu banco pode NÃO existir slug em category.
   * - Então a gente GARANTE aqui um slug sempre (gerado do name) no mapper do page.tsx.
   */
  slug: string;
  /**
   * type vem do banco como string|null, e não pode virar undefined (Vercel quebra).
   */
  type: string | null;
  sort_order: number;
};

export type ProductVariation = {
  id: UUID;
  product_id: UUID;
  name: string;
  price: number | null;
  sort_order: number;
};

export type Product = {
  id: UUID;
  category_id: UUID;
  unit_id: UUID;
  name: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
  video_url: string | null;
  is_active: boolean;
  sort_order: number;
  variations: ProductVariation[];
};

export type MenuPayload = {
  unit: Unit;
  categories: Category[];
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
 * Normaliza slug vindo da URL (evita bug de \n, espaços etc)
 */
export function normalizePublicSlug(raw: string): string {
  return (raw ?? "").toString().trim().replace(/\s+/g, ""); // remove espaços internos também
}