// FILE: /app/dashboard/DashboardClient.tsx
// ACTION: REPLACE ENTIRE FILE

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type DashboardCategory = {
  id: string;
  name: string;
  order_index: number;
};

export type DashboardVariation = {
  id: string;
  product_id: string;
  name: string;
  price: number;
};

export type DashboardProduct = {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price_type: "fixed" | "variable";
  base_price: number;
  thumbnail_url: string;
  video_url: string;
  order_index: number;
  variations: DashboardVariation[];
};

type Props = {
  unitId: string;
  categories: DashboardCategory[];
  products: DashboardProduct[];
};

type DraftCategory = DashboardCategory & { _isNew?: boolean; _isSaving?: boolean };

type DraftVariation = {
  id: string; // pode ser temp
  product_id: string;
  name: string;
  price: number;
  _isNew?: boolean;
};

type DraftProduct = Omit<DashboardProduct, "variations"> & {
  variations: DraftVariation[];
  _isNew?: boolean;
  _isSaving?: boolean;
};

export default function DashboardClient({ unitId, categories, products }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // drafts de categorias
  const [catDrafts, setCatDrafts] = useState<Record<string, DraftCategory>>(() => {
    const map: Record<string, DraftCategory> = {};
    for (const c of categories) map[c.id] = { ...c };
    return map;
  });

  // drafts de produtos (com variações)
  const [prodDrafts, setProdDrafts] = useState<Record<string, DraftProduct>>(() => {
    const map: Record<string, DraftProduct> = {};
    for (const p of products) {
      map[p.id] = {
        ...p,
        variations: (p.variations ?? []).map((v) => ({ ...v })),
      };
    }
    return map;
  });

  // UI criar categoria
  const [newCategoryName, setNewCategoryName] = useState("");

  const categoriesList = useMemo(() => {
    const list = Object.values(catDrafts);
    list.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    return list;
  }, [catDrafts]);

  const productsByCategory = useMemo(() => {
    const list = Object.values(prodDrafts);
    const grouped: Record<string, DraftProduct[]> = {};
    for (const c of categoriesList) grouped[c.id] = [];
    for (const p of list) {
      if (!grouped[p.category_id]) grouped[p.category_id] = [];
      grouped[p.category_id].push(p);
    }
    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    }
    return grouped;
  }, [prodDrafts, categoriesList]);

  function setCatDraft(id: string, patch: Partial<DraftCategory>) {
    setCatDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  function setProdDraft(id: string, patch: Partial<DraftProduct>) {
    setProdDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  // -----------------------
  // CATEGORIAS (CRUD)
  // -----------------------
  async function createCategory() {
    const name = newCategoryName.trim();
    if (!name) {
      alert("Nome da categoria é obrigatório.");
      return;
    }

    const nextOrder =
      categoriesList.length ? Math.max(...categoriesList.map((c) => c.order_index ?? 0)) + 1 : 0;

    const tempId = `new-cat-${crypto.randomUUID()}`;
    setCatDrafts((prev) => ({
      ...prev,
      [tempId]: { id: tempId, name, order_index: nextOrder, _isNew: true, _isSaving: true },
    }));
    setNewCategoryName("");

    try {
      const { data, error } = await supabase
        .from("categories")
        .insert({ unit_id: unitId, name, order_index: nextOrder })
        .select("id, name, order_index")
        .single();

      if (error) throw error;

      const newId = data.id as string;

      setCatDrafts((prev) => {
        const copy = { ...prev };
        const temp = copy[tempId];
        delete copy[tempId];
        copy[newId] = {
          id: newId,
          name: data.name ?? temp.name,
          order_index: data.order_index ?? temp.order_index,
          _isNew: false,
          _isSaving: false,
        };
        return copy;
      });

      router.refresh();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Erro ao criar categoria.");
      setCatDrafts((prev) => {
        const copy = { ...prev };
        delete copy[tempId];
        return copy;
      });
    }
  }

  async function saveCategory(cat: DraftCategory) {
    const name = cat.name.trim();
    if (!name) {
      alert("Nome da categoria é obrigatório.");
      return;
    }

    setCatDraft(cat.id, { _isSaving: true });

    try {
      if (cat._isNew) {
        setCatDraft(cat.id, { _isSaving: false });
        return;
      }

      const { error } = await supabase.from("categories").update({ name }).eq("id", cat.id);
      if (error) throw error;

      setCatDraft(cat.id, { name, _isSaving: false });
      router.refresh();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Erro ao salvar categoria.");
      setCatDraft(cat.id, { _isSaving: false });
    }
  }

  async function deleteCategory(cat: DraftCategory) {
    const ok = confirm("Excluir esta categoria?");
    if (!ok) return;

    const hasProducts = (productsByCategory[cat.id] ?? []).length > 0;
    if (hasProducts) {
      alert("Essa categoria tem produtos. Apague os produtos primeiro (MVP).");
      return;
    }

    if (cat._isNew) {
      setCatDrafts((prev) => {
        const copy = { ...prev };
        delete copy[cat.id];
        return copy;
      });
      return;
    }

    setCatDraft(cat.id, { _isSaving: true });

    try {
      const { error } = await supabase.from("categories").delete().eq("id", cat.id);
      if (error) throw error;

      setCatDrafts((prev) => {
        const copy = { ...prev };
        delete copy[cat.id];
        return copy;
      });

      router.refresh();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Erro ao excluir categoria.");
      setCatDraft(cat.id, { _isSaving: false });
    }
  }

  // -----------------------
  // PRODUTOS (CRUD + VARIAÇÕES)
  // -----------------------
  function addNewProduct(categoryId: string) {
    const tempId = `new-${crypto.randomUUID()}`;
    const current = productsByCategory[categoryId] ?? [];
    const nextOrder = current.length ? Math.max(...current.map((p) => p.order_index ?? 0)) + 1 : 0;

    setProdDrafts((prev) => ({
      ...prev,
      [tempId]: {
        id: tempId,
        category_id: categoryId,
        name: "",
        description: "",
        price_type: "fixed",
        base_price: 0,
        thumbnail_url: "",
        video_url: "",
        order_index: nextOrder,
        variations: [],
        _isNew: true,
      },
    }));
  }

  function addVariation(productId: string) {
    const p = prodDrafts[productId];
    const next = {
      id: `new-var-${crypto.randomUUID()}`,
      product_id: productId,
      name: "",
      price: 0,
      _isNew: true,
    } as DraftVariation;

    setProdDraft(productId, { variations: [...(p.variations ?? []), next] });
  }

  function updateVariation(productId: string, varId: string, patch: Partial<DraftVariation>) {
    const p = prodDrafts[productId];
    const vars = (p.variations ?? []).map((v) => (v.id === varId ? { ...v, ...patch } : v));
    setProdDraft(productId, { variations: vars });
  }

  function deleteVariation(productId: string, varId: string) {
    const p = prodDrafts[productId];
    const vars = (p.variations ?? []).filter((v) => v.id !== varId);
    setProdDraft(productId, { variations: vars });
  }

  async function persistVariations(productId: string, variations: DraftVariation[]) {
    // 1) apaga tudo do produto
    const { error: delErr } = await supabase
      .from("product_variations")
      .delete()
      .eq("product_id", productId);

    if (delErr) throw delErr;

    // 2) insere novamente se tiver
    const cleaned = variations
      .map((v) => ({
        product_id: productId,
        name: (v.name ?? "").trim(),
        price: Number(v.price ?? 0),
      }))
      .filter((v) => v.name.length > 0);

    if (cleaned.length === 0) return;

    const { error: insErr } = await supabase.from("product_variations").insert(cleaned);
    if (insErr) throw insErr;
  }

  async function saveProduct(p: DraftProduct) {
    if (!p.name?.trim()) {
      alert("Nome do produto é obrigatório.");
      return;
    }

    // Regra: se variável, precisa de pelo menos 1 variação válida
    if (p.price_type === "variable") {
      const valid = (p.variations ?? []).filter((v) => (v.name ?? "").trim().length > 0);
      if (valid.length === 0) {
        alert("Produto variável precisa de pelo menos 1 variação (nome + preço).");
        return;
      }
    }

    setProdDraft(p.id, { _isSaving: true });

    try {
      // CREATE
      if (p._isNew) {
        const { data, error } = await supabase
          .from("products")
          .insert({
            category_id: p.category_id,
            name: p.name.trim(),
            description: p.description?.trim() || null,
            price_type: p.price_type,
            base_price: p.base_price ?? 0,
            thumbnail_url: p.thumbnail_url?.trim() || null,
            video_url: p.video_url?.trim() || null,
            order_index: p.order_index ?? 0,
          })
          .select("id")
          .single();

        if (error) throw error;

        const newId = data.id as string;

        // ✅ se for variável, persiste variações
        if (p.price_type === "variable") {
          await persistVariations(newId, p.variations ?? []);
        } else {
          // opcional: garante que não sobra variação velha
          await persistVariations(newId, []);
        }

        setProdDrafts((prev) => {
          const copy = { ...prev };
          const temp = copy[p.id];
          delete copy[p.id];
          copy[newId] = { ...temp, id: newId, _isNew: false, _isSaving: false };
          return copy;
        });

        router.refresh();
        return;
      }

      // UPDATE
      const { error } = await supabase
        .from("products")
        .update({
          name: p.name.trim(),
          description: p.description?.trim() || null,
          price_type: p.price_type,
          base_price: p.base_price ?? 0,
          thumbnail_url: p.thumbnail_url?.trim() || null,
          video_url: p.video_url?.trim() || null,
          order_index: p.order_index ?? 0,
        })
        .eq("id", p.id);

      if (error) throw error;

      // ✅ sincroniza variações
      if (p.price_type === "variable") {
        await persistVariations(p.id, p.variations ?? []);
      } else {
        await persistVariations(p.id, []);
      }

      setProdDraft(p.id, { _isSaving: false });
      router.refresh();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Erro ao salvar produto.");
      setProdDraft(p.id, { _isSaving: false });
    }
  }

  async function deleteProduct(p: DraftProduct) {
    const ok = confirm("Excluir este produto?");
    if (!ok) return;

    if (p._isNew) {
      setProdDrafts((prev) => {
        const copy = { ...prev };
        delete copy[p.id];
        return copy;
      });
      return;
    }

    setProdDraft(p.id, { _isSaving: true });

    try {
      // apaga variações primeiro
      await persistVariations(p.id, []);

      const { error } = await supabase.from("products").delete().eq("id", p.id);
      if (error) throw error;

      setProdDrafts((prev) => {
        const copy = { ...prev };
        delete copy[p.id];
        return copy;
      });

      router.refresh();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Erro ao excluir produto.");
      setProdDraft(p.id, { _isSaving: false });
    }
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* Criar categoria */}
      <section style={sectionStyle}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Categorias</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
          <input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Nova categoria (ex: Pizzas Tradicionais)"
            style={inputStyle}
          />
          <button onClick={createCategory} style={buttonStyle}>
            Criar
          </button>
        </div>
      </section>

      {/* Categorias + produtos */}
      {categoriesList.map((c) => {
        const list = productsByCategory[c.id] ?? [];

        return (
          <section key={c.id} style={sectionStyle}>
            {/* Header categoria com editar/excluir */}
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10 }}>
                <input
                  value={c.name}
                  onChange={(e) => setCatDraft(c.id, { name: e.target.value })}
                  placeholder="Nome da categoria"
                  style={inputStyle}
                />

                <button
                  disabled={!!c._isSaving}
                  onClick={() => saveCategory(c)}
                  style={{ ...buttonStyle, opacity: c._isSaving ? 0.7 : 1 }}
                >
                  {c._isSaving ? "..." : "Salvar"}
                </button>

                <button
                  disabled={!!c._isSaving}
                  onClick={() => deleteCategory(c)}
                  style={dangerButtonStyle}
                >
                  Excluir
                </button>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={() => addNewProduct(c.id)} style={buttonStyle}>
                  + Criar Produto
                </button>
              </div>
            </div>

            <div style={{ height: 10 }} />

            {list.length === 0 ? (
              <div style={{ opacity: 0.7, fontSize: 13 }}>Sem produtos nessa categoria.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {list.map((p) => (
                  <div key={p.id} style={productCardStyle}>
                    <div style={{ display: "grid", gap: 8 }}>
                      <input
                        value={p.name}
                        onChange={(e) => setProdDraft(p.id, { name: e.target.value })}
                        placeholder="Nome do produto"
                        style={inputStyle}
                      />

                      <input
                        value={p.description}
                        onChange={(e) => setProdDraft(p.id, { description: e.target.value })}
                        placeholder="Descrição (opcional)"
                        style={inputStyle}
                      />

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <input
                          value={String(p.base_price ?? 0)}
                          onChange={(e) =>
                            setProdDraft(p.id, {
                              base_price: Number(e.target.value.replace(",", ".")) || 0,
                            })
                          }
                          placeholder="Preço (ex: 39.90)"
                          style={inputStyle}
                        />

                        <select
                          value={p.price_type}
                          onChange={(e) =>
                            setProdDraft(p.id, {
                              price_type: e.target.value === "variable" ? "variable" : "fixed",
                            })
                          }
                          style={inputStyle}
                        >
                          <option value="fixed">Fixo</option>
                          <option value="variable">Variável</option>
                        </select>
                      </div>

                      {/* BLOCO VARIAÇÕES */}
                      {p.price_type === "variable" && (
                        <div style={{ display: "grid", gap: 8 }}>
                          <div style={{ fontSize: 12, opacity: 0.7 }}>
                            Variações ({p.variations?.length ?? 0})
                          </div>

                          {(p.variations?.length ?? 0) === 0 ? (
                            <div style={{ fontSize: 12, opacity: 0.7 }}>
                              Nenhuma variação (clique em “+ Adicionar”).
                            </div>
                          ) : (
                            <div style={{ display: "grid", gap: 8 }}>
                              {p.variations.map((v) => (
                                <div
                                  key={v.id}
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 160px auto",
                                    gap: 8,
                                  }}
                                >
                                  <input
                                    value={v.name}
                                    onChange={(e) =>
                                      updateVariation(p.id, v.id, { name: e.target.value })
                                    }
                                    placeholder="Nome (ex: Pequena)"
                                    style={inputStyle}
                                  />

                                  <input
                                    value={String(v.price ?? 0)}
                                    onChange={(e) =>
                                      updateVariation(p.id, v.id, {
                                        price: Number(e.target.value.replace(",", ".")) || 0,
                                      })
                                    }
                                    placeholder="Preço (ex: 39.90)"
                                    style={inputStyle}
                                  />

                                  <button
                                    onClick={() => deleteVariation(p.id, v.id)}
                                    style={miniDangerButtonStyle}
                                    title="Remover"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          <div style={{ display: "flex", justifyContent: "flex-end" }}>
                            <button onClick={() => addVariation(p.id)} style={buttonStyle}>
                              + Adicionar
                            </button>
                          </div>
                        </div>
                      )}

                      <input
                        value={p.thumbnail_url}
                        onChange={(e) => setProdDraft(p.id, { thumbnail_url: e.target.value })}
                        placeholder="URL da thumb (opcional)"
                        style={inputStyle}
                      />

                      <input
                        value={p.video_url}
                        onChange={(e) => setProdDraft(p.id, { video_url: e.target.value })}
                        placeholder="URL do vídeo (opcional)"
                        style={inputStyle}
                      />
                    </div>

                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                      <button
                        disabled={!!p._isSaving}
                        onClick={() => saveProduct(p)}
                        style={{ ...buttonStyle, opacity: p._isSaving ? 0.7 : 1 }}
                      >
                        {p._isSaving ? "Salvando..." : "Salvar"}
                      </button>

                      <button
                        disabled={!!p._isSaving}
                        onClick={() => deleteProduct(p)}
                        style={dangerButtonStyle}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

const sectionStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 14,
  padding: 14,
  background: "rgba(255,255,255,0.03)",
};

const productCardStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 14,
  padding: 12,
  background: "rgba(0,0,0,0.18)",
  display: "grid",
  gap: 10,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)",
  color: "inherit",
  outline: "none",
};

const buttonStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.10)",
  cursor: "pointer",
};

const dangerButtonStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,80,80,0.45)",
  background: "rgba(255,80,80,0.12)",
  cursor: "pointer",
};

const miniDangerButtonStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,80,80,0.45)",
  background: "rgba(255,80,80,0.12)",
  cursor: "pointer",
};