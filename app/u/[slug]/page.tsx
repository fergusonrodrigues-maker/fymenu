// FILE: app/u/[slug]/page.tsx
// ACTION: REPLACE ENTIRE FILE

import MenuClient from "./MenuClient";
import { createClient } from "@/lib/supabase/server";

type UnitRow = {
  id: string;
  name: string | null;
  address: string | null;
  instagram: string | null;
  whatsapp: string | null;
  logo_url: string | null;
  slug: string | null;
  city?: string | null;
  neighborhood?: string | null;
};

type CategoryRow = {
  id: string;
  unit_id: string;
  name: string;
  type: string;
  slug: string | null;
  order_index: number | null;
};

type VariationRow = {
  id: string;
  product_id: string;
  name: string;
  price: number;
  order_index: number | null;
};

type ProductRow = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price_type: "fixed" | "variable";
  base_price: number;
  thumbnail_url: string | null;
  video_url: string | null;
  variations: VariationRow[] | null;
};

function cleanSlug(input: string) {
  return (input ?? "").trim().replace(/\r?\n/g, "");
}

export default async function Page({
  params,
}: {
  params: { slug?: string };
}) {
  const supabase = await createClient();

  const slug = cleanSlug(params?.slug || "");

  if (!slug) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#0b0b0b",
          color: "#fff",
          padding: 24,
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 900 }}>Cardápio não encontrado</div>
        <div style={{ marginTop: 6, opacity: 0.75 }}>Slug vazio.</div>
      </main>
    );
  }

  const { data: unit, error: unitError } = await supabase
    .from("units")
    .select("id, name, address, instagram, whatsapp, logo_url, slug, city, neighborhood")
    .in("slug", [slug, `${slug}\n`, `${slug}\r\n`])
    .maybeSingle<UnitRow>();

  if (unitError || !unit) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#0b0b0b",
          color: "#fff",
          padding: 24,
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 900 }}>Cardápio não encontrado</div>
        <div style={{ marginTop: 6, opacity: 0.75 }}>
          Não achamos uma unidade com esse slug.
        </div>
      </main>
    );
  }

  const { data: categories } = await supabase
    .from("categories")
    .select("id, unit_id, name, type, slug, order_index")
    .eq("unit_id", unit.id)
    .order("order_index", { ascending: true })
    .returns<CategoryRow[]>();

  const categoryIds = (categories ?? []).map((c) => c.id);

  const { data: productsRaw } = await supabase
    .from("products")
    .select(
      "id, category_id, name, description, price_type, base_price, thumbnail_url, video_url, variations:product_variations(id, product_id, name, price, order_index)"
    )
    .in("category_id", categoryIds.length ? categoryIds : ["__none__"])
    .returns<ProductRow[]>();

  const products = (productsRaw ?? []).map((p) => ({
    id: p.id,
    category_id: p.category_id,
    name: p.name,
    description: p.description ?? "",
    price_type: p.price_type,
    base_price: p.base_price ?? 0,
    thumbnail_url: p.thumbnail_url ?? "",
    video_url: p.video_url ?? "",
    variations: (p.variations ?? []).map((v) => ({
      id: v.id,
      product_id: v.product_id,
      name: v.name,
      price: v.price,
      order_index: v.order_index ?? 0,
    })),
  }));

  const safeUnit = {
    id: unit.id,
    name: unit.name ?? "",
    address: unit.address ?? "",
    instagram: unit.instagram ?? "",
    slug: unit.slug ?? slug,
    whatsapp: unit.whatsapp ?? "",
    logo_url: unit.logo_url ?? "",
    city: unit.city ?? "",
    neighborhood: unit.neighborhood ?? "",
  };

  return (
    <MenuClient
      unit={safeUnit as any}
      categories={(categories ?? []) as any}
      products={products as any}
    />
  );
}