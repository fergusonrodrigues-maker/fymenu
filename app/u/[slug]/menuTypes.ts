// FILE: /app/u/[slug]/menuTypes.ts
// ACTION: REPLACE ENTIRE FILE

export type PriceType = "fixed" | "variable";

export type ProductVariation = {
  id: string;
  product_id: string;
  name: string;
  price: number | null;
  order_index?: number | null;
};

export type Product = {
  id: string;
  category_id: string;
  name: string;
  description?: string | null;

  thumbnail_url?: string | null;
  video_url?: string | null;

  price?: number | null;
  price_type?: PriceType | null;
  order_index?: number | null;

  variations?: ProductVariation[];
};

export type Category = {
  id: string;
  unit_id: string;
  name: string;
  order_index?: number | null;
};

export type CategoryWithProducts = Category & {
  products: Product[];
};