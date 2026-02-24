// FILE: /app/u/[slug]/menuTypes.ts
// ACTION: CREATE

export type Variation = {
  id: string;
  product_id: string;
  name: string;
  price: number;
  order_index?: number; // nunca null
};

export type Unit = {
  id: string;
  name: string;
  address: string;
  instagram: string;
  slug: string;
  whatsapp: string;
  logo_url: string;
  city?: string;
  neighborhood?: string;
};

export type Category = {
  id: string;
  name: string;
  type: string; // nunca null
  slug?: string;
};

export type Product = {
  id: string;
  category_id: string;
  name: string;
  description: string; // nunca null
  price_type: "fixed" | "variable";
  base_price: number;
  thumbnail_url: string;
  video_url: string;
  variations?: Variation[];
};