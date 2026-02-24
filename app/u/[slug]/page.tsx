// FILE: /app/u/[slug]/page.tsx
// ACTION: REPLACE ENTIRE FILE

import MenuClient from "./MenuClient";
import { createClient } from "@/lib/supabase/server";
import type { Category, Product, Unit, Variation } from "./menuTypes";

type PageProps = {
  params: { slug: string } | Promise<{ slug: string }>;
};

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
  name: string | null;
  order_index: number | null;
  type?: string | null; // se não existir na tabela, ignoramos
  slug?: string | null; // se não existir na tabela, ignoramos
};

type ProductRow = {
  id: string;
  category_id: string;
  name: string | null;
  description: string | null;
  price_type: "fixed" | "variable" | null;
  base_price: number | null;
  thumbnail_url: string | null;
  video_url: string | null;
  order_index: number | null;
};

type VariationRow = {
  id: string;
  product_id: string;
  name: string | null;
  price: number | null;
  order_index: number | null;
};

function cleanSlug(v: string) {
  return String(v ?? "")
    .trim()
    .replace(/[\r\n]/g, "");
}

export default async function Page({ params }: PageProps) {
  const supabase = await createClient();

  // Next 16: params pode ser Promise
  const resolvedParams = await Promise.resolve(params);
  const slug = cleanSlug(resolvedParams?.slug ?? "");

  if (!slug) {
    return (
      <main style={{ padding: 16 }}>
        <h1>Cardápio não encontrado</h1>
        <p>Slug vazio.</p>
      </main>
    );
  }

  // 1) Unit por slug (mantém fallback \n / \r\n só por segurança)
  const { data: unitRow, error: unitError } = await supabase
    .from("units")
    .select("id, name, address, instagram, whatsapp, logo_url, slug, city, neighborhood")
    .in("slug", [slug, `${slug}\n`, `${slug}\r\n`])
    .limit(1)
    .maybeSingle<UnitRow>();

  if (unitError || !unitRow) {
    return (
      <main style={{ padding: 16 }}>
        <h1>Cardápio não encontrado</h1>
        <p>Slug recebido: {slug}</p>
        {unitError && (
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(unitError, null, 2)}</pre>
        )}
      </main>
    );
  }

  const unit: Unit = {
    id: unitRow.id,
    name: unitRow.name ?? "Unidade",
    address: unitRow.address ?? "",
    instagram: unitRow.instagram ?? "",
    whatsapp: unitRow.whatsapp ?? "",
    logo_url: unitRow.logo_url ?? "",
    slug: unitRow.slug ?? slug,
    city: unitRow.city ?? "",
    neighborhood: unitRow.neighborhood ?? "",
  };

  // 2) Categorias
  const { data: categoriesRaw, error: catError } = await supabase
    .from("categories")
    .select("id, name, order_index")
    .eq("unit_id", unit.id)
    .order("order_index", { ascending: true })
    .returns<CategoryRow[]>();

  if (catError) {
    return (
      <main style={{ padding: 16 }}>
        <h1>Erro ao carregar categorias</h1>
        <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(catError, null, 2)}</pre>
      </main>
    );
  }

  const categoriesRows = categoriesRaw ?? [];
  const categoryIds = categoriesRows.map((c) => c.id);

  // 3) Produtos
  const { data: productsRaw, error: prodError } = await supabase
    .from("products")
    .select("id, category_id, name, description, price_type, base_price, thumbnail_url, video_url, order_index")
    .in("category_id", categoryIds.length ? categoryIds : ["00000000-0000-0000-0000-000000000000"])
    .order("order_index", { ascending: true })
    .returns<ProductRow[]>();

  if (prodError) {
    return (
      <main style={{ padding: 16 }}>
        <h1>Erro ao carregar produtos</h1>
        <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(prodError, null, 2)}</pre>
      </main>
    );
  }

  const productsRows = productsRaw ?? [];
  const productIds = productsRows.map((p) => p.id);

  // 4) Variações
  const { data: variationsRaw, error: varError } = await supabase
    .from("product_variations")
    .select("id, product_id, name, price, order_index")
    .in("product_id", productIds.length ? productIds : ["00000000-0000-0000-0000-000000000000"])
    .order("order_index", { ascending: true })
    .returns<VariationRow[]>();

  if (varError) {
    return (
      <main style={{ padding: 16 }}>
        <h1>Erro ao carregar variações</h1>
        <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(varError, null, 2)}</pre>
      </main>
    );
  }

  const variationsRows = variationsRaw ?? [];

  // Map product_id => variations
  const variationsByProductId = new Map<string, Variation[]>();
  for (const v of variationsRows) {
    const arr = variationsByProductId.get(v.product_id) ?? [];
    arr.push({
      id: v.id,
      product_id: v.product_id,
      name: v.name ?? "Variação",
      price: Number(v.price ?? 0),
      order_index: v.order_index ?? undefined, // <- NUNCA null
    });
    variationsByProductId.set(v.product_id, arr);
  }

  // ✅ NÃO exibir categorias vazias
  const categoryIdsWithProducts = new Set(productsRows.map((p) => p.category_id));
  const categoriesFilteredRows = categoriesRows.filter((c) => categoryIdsWithProducts.has(c.id));

  const categories: Category[] = categoriesFilteredRows.map((c) => ({
    id: c.id,
    name: c.name ?? "Categoria",
    type: "normal",
  }));

  const allowedCategoryIds = new Set(categories.map((c) => c.id));
  const productsFilteredRows = productsRows.filter((p) => allowedCategoryIds.has(p.category_id));

  const products: Product[] = productsFilteredRows.map((p) => ({
    id: p.id,
    category_id: p.category_id,
    name: p.name ?? "Produto",
    description: p.description ?? "",
    price_type: p.price_type === "variable" ? "variable" : "fixed",
    base_price: Number(p.base_price ?? 0),
    thumbnail_url: p.thumbnail_url ?? "",
    video_url: p.video_url ?? "",
    variations: variationsByProductId.get(p.id) ?? [],
  }));

  return <MenuClient unit={unit} categories={categories} products={products} />;
}