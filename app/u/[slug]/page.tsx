// app/u/[slug]/page.tsx
import MenuClient from "./MenuClient";
import { createClient } from "@/lib/supabase/server";

type Unit = {
  id: string;
  name: string;
  address: string | null;
  instagram: string | null;
  whatsapp: string | null;
  logo_url: string | null;
  slug: string;
  city: string | null;
  neighborhood: string | null;
};

type Category = {
  id: string;
  name: string;
  type: string | null;
};

type Variation = {
  id: string;
  product_id: string;
  name: string;
  price: number;
  order_index: number | null;
};

type Product = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price_type: "fixed" | "variable";
  base_price: number;
  thumbnail_url: string | null;
  video_url: string | null;
  variations?: Variation[];
};

function cleanSlug(v: string) {
  return (v ?? "").trim().replace(/\r?\n/g, "");
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const supabase = await createClient();

  const p = await params;
  const slug = cleanSlug(p?.slug || "");

  if (!slug) {
    return (
      <main style={{ minHeight: "100vh", padding: 24 }}>
        <h1>Cardápio não encontrado</h1>
        <p>Slug inválido.</p>
      </main>
    );
  }

  // 1) Unit
  const { data: unit, error: unitError } = await supabase
    .from("units")
    .select("id, name, address, instagram, whatsapp, logo_url, slug, city, neighborhood")
    .eq("slug", slug)
    .maybeSingle<Unit>();

  if (unitError) {
    return (
      <main style={{ minHeight: "100vh", padding: 24 }}>
        <h1>Erro ao carregar</h1>
        <pre style={{ whiteSpace: "pre-wrap" }}>{unitError.message}</pre>
      </main>
    );
  }

  if (!unit) {
    return (
      <main style={{ minHeight: "100vh", padding: 24 }}>
        <h1>Cardápio não encontrado</h1>
        <p>Nenhuma unidade com o slug: <b>{slug}</b></p>
      </main>
    );
  }

  // 2) Categories
  const { data: categoriesRaw, error: catError } = await supabase
    .from("categories")
    .select("id, name, type")
    .eq("unit_id", unit.id)
    .order("order_index", { ascending: true });

  if (catError) {
    return (
      <main style={{ minHeight: "100vh", padding: 24 }}>
        <h1>Erro ao carregar categorias</h1>
        <pre style={{ whiteSpace: "pre-wrap" }}>{catError.message}</pre>
      </main>
    );
  }

  const categories = (categoriesRaw ?? []) as Category[];
  const categoryIds = categories.map((c) => c.id);

  // 3) Products (todos das categorias)
  const { data: productsRaw, error: prodError } = await supabase
    .from("products")
    .select("id, category_id, name, description, price_type, base_price, thumbnail_url, video_url")
    .in("category_id", categoryIds)
    .order("order_index", { ascending: true });

  if (prodError) {
    return (
      <main style={{ minHeight: "100vh", padding: 24 }}>
        <h1>Erro ao carregar produtos</h1>
        <pre style={{ whiteSpace: "pre-wrap" }}>{prodError.message}</pre>
      </main>
    );
  }

  const products = (productsRaw ?? []) as Product[];
  const productIds = products.map((p) => p.id);

  // 4) Variations (opcional)
  let variationsByProduct = new Map<string, Variation[]>();
  if (productIds.length) {
    const { data: varsRaw } = await supabase
      .from("product_variations")
      .select("id, product_id, name, price, order_index")
      .in("product_id", productIds)
      .order("order_index", { ascending: true });

    const vars = (varsRaw ?? []) as Variation[];
    for (const v of vars) {
      if (!variationsByProduct.has(v.product_id)) variationsByProduct.set(v.product_id, []);
      variationsByProduct.get(v.product_id)!.push(v);
    }
  }

  const productsWithVars: Product[] = products.map((p) => ({
    ...p,
    variations: variationsByProduct.get(p.id) ?? [],
  }));

  return (
    <MenuClient
      unit={{
        id: unit.id,
        name: unit.name,
        address: unit.address ?? "",
        instagram: unit.instagram ?? "",
        slug: unit.slug,
        whatsapp: unit.whatsapp ?? "",
        logo_url: unit.logo_url ?? "",
        city: unit.city ?? "",
        neighborhood: unit.neighborhood ?? "",
      }}
      categories={categories}
      products={productsWithVars}
    />
  );
}