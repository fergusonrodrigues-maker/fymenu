// FILE: /app/u/[slug]/menuTypes.ts
// ACTION: REPLACE ENTIRE FILE

export type UUID = string;

export type Unit = {
  id: UUID;
  restaurant_id: UUID | null;
  name: string;
  slug: string;

  // ✅ existe no seu banco (você usa no BottomGlassBar)
  address: string | null;

  city: string | null;
  neighborhood: string | null;

  whatsapp: string | null;
  instagram: string | null;

  // se existir no futuro, ok; se não existir, deixa null
  maps_url: string | null;

  logo_url: string | null;
};

export type Category = {
  id: UUID;
  unit_id: UUID;
  name: string;

  /**
   * No seu banco NÃO tem slug em categories.
   * A gente gera sempre no mapper do page.tsx.
   */
  slug: string;

  /**
   * No seu banco NÃO tem type confirmado.
   * A gente seta null (ou 'featured' se você quiser depois).
   */
  type: string | null;

  // UI usa sort_order, DB usa order_index -> page.tsx converte
  sort_order: number;
};

export type ProductVariation = {
  id: UUID;
  product_id: UUID;
  name: string;
  price: number | null;

  // UI usa sort_order, DB usa order_index -> page.tsx converte
  sort_order: number;
};

export type Product = {
  id: UUID;
  category_id: UUID;
  unit_id: UUID;

  name: string;
  description: string | null;

  // UI usa price, DB usa base_price -> page.tsx converte
  price: number | null;

  // UI usa image_url, DB usa thumbnail_url -> page.tsx converte
  image_url: string | null;

  video_url: string | null;

  // se não existir no DB, a gente default true no page.tsx
  is_active: boolean;

  // UI usa sort_order, DB usa order_index -> page.tsx converte
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
  return (raw ?? "").toString().trim().replace(/\s+/g, "");
}