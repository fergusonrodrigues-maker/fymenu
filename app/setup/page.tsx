"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 40);
}

function randomSuffix() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export default function SetupPage() {
  const [restaurantName, setRestaurantName] = useState("");
  const [phone, setPhone] = useState("");
  const [unitName, setUnitName] = useState("Unidade 1");
  const [address, setAddress] = useState("");
  const [instagram, setInstagram] = useState("");
  const [niche, setNiche] = useState("pizzaria");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ unitUrl?: string; slug?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setError(null);
    setResult(null);

    if (!restaurantName || !phone || !unitName || !address) {
      setError("Preencha: Nome do restaurante, Telefone, Nome da unidade e Endereço.");
      return;
    }

    setLoading(true);

    try {
      // 1) cria restaurante
      const { data: rData, error: rErr } = await supabase
        .from("restaurants")
        .insert([{ name: restaurantName, phone, plan: "basic" }])
        .select("id")
        .single();

      if (rErr) throw rErr;

      const restaurantId = rData.id as string;

      // 2) cria unidade com slug automático
      const baseSlug = slugify(`${restaurantName}-${unitName}`);
      let slug = `${baseSlug}-${randomSuffix()}`;

      // tentativa simples de garantir único (até 3 tentativas)
      for (let i = 0; i < 3; i++) {
        const { error: uErr } = await supabase.from("units").insert([
          {
            restaurant_id: restaurantId,
            name: unitName,
            address,
            instagram: instagram || null,
            slug,
          },
        ]);

        if (!uErr) break;

        // se slug duplicou, tenta outro sufixo
        slug = `${baseSlug}-${randomSuffix()}`;
        if (i === 2) throw uErr;
      }

      // 3) (MVP) cria categorias base simples por nicho (mínimo)
      // Vamos pegar a unidade recém-criada para obter o id
      const { data: unitRow, error: unitFetchErr } = await supabase
        .from("units")
        .select("id, slug")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (unitFetchErr) throw unitFetchErr;

      const unitId = unitRow.id as string;

      const baseCategoriesByNiche: Record<string, string[]> = {
        pizzaria: ["Destaques", "Pizzas Salgadas", "Pizzas Doces", "Bebidas"],
        hamburgueria: ["Destaques", "Entradas", "Hambúrgueres", "Sobremesas", "Bebidas"],
        restaurante: ["Destaques", "Entradas", "Pratos Principais", "Sobremesas", "Bebidas"],
        bar: ["Destaques", "Petiscos", "Porções para compartilhar", "Pratos completos", "Drinks", "Vinhos e destilados", "Bebidas"],
        lanchonete: ["Destaques", "Salgados", "Doces", "Porções", "Cafés", "Bebidas"],
        outros: ["Destaques", "Categoria 1", "Categoria 2"],
      };

      const catNames = baseCategoriesByNiche[niche] ?? baseCategoriesByNiche["outros"];

      const categoriesPayload = catNames.map((name, idx) => ({
        unit_id: unitId,
        name,
        type: "normal",
        order_index: idx,
      }));

      const { error: cErr } = await supabase.from("categories").insert(categoriesPayload);
      if (cErr) throw cErr;

      const unitUrl = `/u/${unitRow.slug}`;
      setResult({ unitUrl, slug: unitRow.slug });
    } catch (e: any) {
      setError(e?.message ?? "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 720 }}>
      <h1>Setup FyMenu (MVP rápido)</h1>
      <p>Cria restaurante + 1 unidade + categorias base.</p>

      <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
        <label>
          Nome do restaurante*
          <input value={restaurantName} onChange={(e) => setRestaurantName(e.target.value)} style={{ width: "100%" }} />
        </label>

        <label>
          Telefone*
          <input value={phone} onChange={(e) => setPhone(e.target.value)} style={{ width: "100%" }} />
        </label>

        <label>
          Nicho*
          <select value={niche} onChange={(e) => setNiche(e.target.value)} style={{ width: "100%" }}>
            <option value="pizzaria">Pizzaria</option>
            <option value="hamburgueria">Hamburgueria</option>
            <option value="restaurante">Restaurante</option>
            <option value="bar">Bar</option>
            <option value="lanchonete">Lanchonete</option>
            <option value="outros">Outros</option>
          </select>
        </label>

        <hr />

        <label>
          Nome da unidade*
          <input value={unitName} onChange={(e) => setUnitName(e.target.value)} style={{ width: "100%" }} />
        </label>

        <label>
          Endereço*
          <input value={address} onChange={(e) => setAddress(e.target.value)} style={{ width: "100%" }} />
        </label>

        <label>
          Instagram (opcional)
          <input value={instagram} onChange={(e) => setInstagram(e.target.value)} style={{ width: "100%" }} />
        </label>

        <button onClick={handleCreate} disabled={loading} style={{ padding: 12 }}>
          {loading ? "Criando..." : "Criar restaurante + unidade"}
        </button>

        {error && <p style={{ color: "red" }}>Erro: {error}</p>}

        {result?.unitUrl && (
          <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
            <p><b>Slug:</b> {result.slug}</p>
            <p><b>Link público (local):</b> <code>http://localhost:3000{result.unitUrl}</code></p>
          </div>
        )}
      </div>
    </main>
  );
}