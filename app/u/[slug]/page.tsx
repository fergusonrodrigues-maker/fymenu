// app/u/[slug]/page.tsx

import MenuClient from "./MenuClient";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  // Compatível com Next que entrega params como Promise (sync-dynamic-apis)
  params: { slug: string } | Promise<{ slug: string }>;
};

export default async function Page({ params }: PageProps) {
  const supabase = createClient();

  const resolvedParams = await Promise.resolve(params);
  const rawSlug = resolvedParams?.slug ?? "";
  const slug = String(rawSlug).trim();

  if (!slug) {
    return (
      <main style={{ padding: 16 }}>
        <h1>Cardápio não encontrado</h1>
        <p>Slug vazio.</p>
      </main>
    );
  }

  // 1) Unit (unidade) pelo slug (slug é público) + fallback \n
  const { data: unit, error: unitError } = await supabase
    .from("units")
    .select("id, name, address, instagram, slug")
    .in("slug", [slug, `${slug}\n`, `${slug}\r\n`])
    .limit(1)
    .maybeSingle();

  if (unitError || !unit) {
    return (
      <main style={{ padding: 16 }}>
        <h1>Cardápio não encontrado</h1>
        <p>Slug recebido: {slug}</p>
        {unitError && (
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {JSON.stringify(unitError, null, 2)}
          </pre>
        )}
      </main>
    );
  }

  // 2) Categorias da unidade
  const { data: categories, error: catError } = await supabase
    .from("categories")
    .select("id, name, type, order_index")
    .eq("unit_id", unit.id)
    .order("order_index", { ascending: true });

  if (catError) {
    return (
      <main style={{ padding: 16 }}>
        <h1>Erro ao carregar categorias</h1>
        <pre style={{ whiteSpace: "pre-wrap" }}>
          {JSON.stringify(catError, null, 2)}
        </pre>
      </main>
    );
  }

  const categoryIds = (categories ?? []).map((c) => c.id);

  // 3) Produtos dessas categorias
  const { data: products, error: prodError } = await supabase
    .from("products")
    .select(
      "id, category_id, name, description, price_type, base_price, thumbnail_url, video_url, order_index"
    )
    .in(
      "category_id",
      categoryIds.length
        ? categoryIds
        : ["00000000-0000-0000-0000-000000000000"]
    )
    .order("order_index", { ascending: true });

  if (prodError) {
    return (
      <main style={{ padding: 16 }}>
        <h1>Erro ao carregar produtos</h1>
        <pre style={{ whiteSpace: "pre-wrap" }}>
          {JSON.stringify(prodError, null, 2)}
        </pre>
      </main>
    );
  }

  return (
    <MenuClient
      unit={{
        id: unit.id,
        name: unit.name || "Unidade",
        address: unit.address || "",
        instagram: unit.instagram || "",
        slug: unit.slug || slug,
      }}
      categories={(categories ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type || "normal",
      }))}
      products={(products ?? []).map((p) => ({
        id: p.id,
        category_id: p.category_id,
        name: p.name,
        description: p.description || "",
        price_type: p.price_type || "fixed",
        base_price: Number(p.base_price ?? 0),
        thumbnail_url: p.thumbnail_url || "",
        video_url: p.video_url || "",
      }))}
    />
  );
}