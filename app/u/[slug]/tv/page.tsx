import { createClient } from "@/lib/supabase/server";
import TvClient from "./TvClient";

export const revalidate = 0;

export default async function TvPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  // 1) Unidade
  const { data: unitData } = await supabase
    .from("units")
    .select("id, name, logo_url")
    .eq("slug", slug)
    .maybeSingle();

  if (!unitData) {
    return (
      <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "sans-serif" }}>
        Unidade não encontrada.
      </div>
    );
  }

  // 2) Categorias da unidade
  const { data: categories } = await supabase
    .from("categories")
    .select("id")
    .eq("unit_id", unitData.id);

  const categoryIds = (categories ?? []).map((c: any) => c.id);

  // 3) Produtos com vídeo
  let tvItems: any[] = [];
  if (categoryIds.length > 0) {
    const { data: products } = await supabase
      .from("products")
      .select("id, name, description, price, price_type, video_url, thumbnail_url")
      .in("category_id", categoryIds)
      .not("video_url", "is", null)
      .order("created_at", { ascending: true });

    tvItems = (products ?? []).filter((p: any) => p.video_url);
  }

  return (
    <TvClient
      items={tvItems}
      unitName={unitData.name ?? slug}
      logoUrl={unitData.logo_url ?? null}
    />
  );
}
