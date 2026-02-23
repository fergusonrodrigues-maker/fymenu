import MenuClient from "./MenuClient";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: { slug: string };
};

type UnitRow = {
  id: string;
  name: string | null;
  address: string | null;
  instagram: string | null;
  whatsapp: string | null;
  logo_url: string | null;
  slug: string | null;
};

type CategoryRow = {
  id: string;
  name: string;
  order_index: number | null;
};

type ProductRow = {
  id: string;
  category_id: string;
  name: string;
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
  name: string;
  price: number;
  order_index: number | null;
};

export default async function Page({ params }: PageProps) {
  const supabase = await createClient();

  const rawSlug = params?.slug ?? "";

  // higiene extra: trim + remove \n / \r
  const slug = String(rawSlug).trim().replace(/[\r\n]/g, "");

  if (!slug) {
    return (
      <main style={{ padding: 16 }}>
        <h1>Cardápio não encontrado</h1>
        <p>Slug vazio.</p>
      </main>
    );
  }

  // 1) Unit pelo slug (fallback de \n / \r\n só por segurança)
  const { data: unit, error: unitError } = await supabase
    .from("units")
    .select("id, name, address, instagram, whatsapp, logo_url, slug")
    .in("slug", [slug, `${slug}\n`, `${slug}\r\n`])
    .limit(1)
    .maybeSingle<UnitRow>();

  if (unitError || !unit) {
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

  // 2) Categorias da unidade
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

  const categories = categoriesRaw ?? [];
  const categoryIds = categories.map((c) => c.id);

  // 3) Produtos dessas categorias
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

  const products = productsRaw ?? [];
  const productIds = products.map((p) => p.id);

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

  const variations = variationsRaw ?? [];

  // Map: product_id -> variations[]
  const variationsByProductId = new Map<string, VariationRow[]>();
  for (const v of variations) {
    const arr = variationsByProductId.get(v.product_id) ?? [];
    arr.push(v);
    variationsByProductId.set(v.product_id, arr);
  }

  // ✅ NÃO exibir categorias vazias (server)
  const categoryIdsWithProducts = new Set(products.map((p) => p.category_id));
  const categoriesFiltered = categories.filter((c) => categoryIdsWithProducts.has(c.id));

  // ✅ filtra produtos para somente categorias visíveis
  const allowedCategoryIds = new Set(categoriesFiltered.map((c) => c.id));
  const productsFiltered = products.filter((p) => allowedCategoryIds.has(p.category_id));

  return (
    <MenuClient
      unit={{
        id: unit.id,
        name: unit.name || "Unidade",
        address: unit.address || "",
        instagram: unit.instagram || "",
        whatsapp: unit.whatsapp || "",
        logo_url: unit.logo_url || "",
        slug: unit.slug || slug,
      }}
      categories={categoriesFiltered.map((c) => ({
        id: c.id,
        name: c.name,
        type: "normal",
      }))}
      products={productsFiltered.map((p) => {
        const priceType: "fixed" | "variable" = p.price_type === "variable" ? "variable" : "fixed";
        const basePrice = typeof p.base_price === "number" ? p.base_price : 0;

        const vars = variationsByProductId.get(p.id) ?? [];

        return {
          id: p.id,
          category_id: p.category_id,
          name: p.name,
          description: p.description || "",
          price_type: priceType,
          base_price: Number(basePrice ?? 0),
          thumbnail_url: p.thumbnail_url || "",
          video_url: p.video_url || "",
          variations: vars.map((v) => ({
            id: v.id,
            product_id: v.product_id,
            name: v.name,
            price: Number(v.price ?? 0),
            order_index: v.order_index ?? 0,
          })),
        };
      })}
    />
  );
}