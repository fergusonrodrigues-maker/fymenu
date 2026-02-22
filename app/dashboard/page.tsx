// FILE: /app/dashboard/page.tsx
// ACTION: REPLACE ENTIRE FILE

import { createClient } from "@/lib/supabase/server";
import DashboardClient, { DashboardCategory, DashboardProduct } from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();

  // MVP: primeira unit
  const { data: unit, error: unitError } = await supabase
    .from("units")
    .select("id, name")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (unitError || !unit) {
    return (
      <main style={{ padding: 16 }}>
        <h1>Dashboard</h1>
        <p>Erro ao carregar unit (MVP).</p>
        {unitError && <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(unitError, null, 2)}</pre>}
      </main>
    );
  }

  const { data: categoriesRaw, error: catError } = await supabase
    .from("categories")
    .select("id, name, order_index")
    .eq("unit_id", unit.id)
    .order("order_index", { ascending: true });

  if (catError) {
    return (
      <main style={{ padding: 16 }}>
        <h1>Dashboard</h1>
        <p>Erro ao carregar categorias.</p>
        <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(catError, null, 2)}</pre>
      </main>
    );
  }

  const categories: DashboardCategory[] = (categoriesRaw ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    order_index: c.order_index ?? 0,
  }));

  const categoryIds = categories.map((c) => c.id);

  const { data: productsRaw, error: prodError } = await supabase
    .from("products")
    .select("id, category_id, name, description, price_type, base_price, thumbnail_url, video_url, order_index")
    .in("category_id", categoryIds.length ? categoryIds : ["00000000-0000-0000-0000-000000000000"])
    .order("order_index", { ascending: true });

  if (prodError) {
    return (
      <main style={{ padding: 16 }}>
        <h1>Dashboard</h1>
        <p>Erro ao carregar produtos.</p>
        <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(prodError, null, 2)}</pre>
      </main>
    );
  }

  const products: DashboardProduct[] = (productsRaw ?? []).map((p) => ({
    id: p.id,
    category_id: p.category_id,
    name: p.name ?? "",
    description: p.description ?? "",
    price_type: p.price_type === "variable" ? "variable" : "fixed",
    base_price: Number(p.base_price ?? 0),
    thumbnail_url: p.thumbnail_url ?? "",
    video_url: p.video_url ?? "",
    order_index: p.order_index ?? 0,
  }));

  return (
    <main style={{ padding: 16 }}>
      <h1 style={{ marginBottom: 6 }}>Dashboard</h1>
      <div style={{ opacity: 0.75, marginBottom: 16 }}>
        Unit (MVP): {unit.id}
      </div>

      <DashboardClient unitId={unit.id} categories={categories} products={products} />
    </main>
  );
}