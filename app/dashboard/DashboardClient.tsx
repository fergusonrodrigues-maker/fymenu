// FILE: /app/dashboard/DashboardClient.tsx
// ACTION: REPLACE ENTIRE FILE

"use client";

import React, { useMemo, useState } from "react";
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
  variations?: DashboardVariation[];
};

type Props = {
  unitId: string;
  categories: DashboardCategory[];
  products: DashboardProduct[];
};

type DraftCategory = DashboardCategory & { _isNew?: boolean; _isSaving?: boolean };

type DraftVariation = DashboardVariation & {
  _isNew?: boolean;
  _isSaving?: boolean;
  price_input?: string; // pra digitar 39,90 sem quebrar
};

type DraftProduct = Omit<DashboardProduct, "variations"> & {
  variations: DraftVariation[];
  _isNew?: boolean;
  _isSaving?: boolean;
};

function normalizeText(v: string) {
  return (v ?? "").trim();
}

function parsePriceLoose(input: string): number {
  const raw = String(input ?? "").trim();
  if (!raw) return 0;

  // aceita "1.234,56" ou "1234.56" ou "39,90"
  const normalized = raw.replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function formatMoneyBR(n: number) {
  try {
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  } catch {
    return `R$ ${Number(n ?? 0).toFixed(2)}`;
  }
}

export default function DashboardClient({ unitId, categories, products }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // drafts de categorias
  const [catDrafts, setCatDrafts] = useState<Record<string, DraftCategory>>(() => {
    const map: Record<string, DraftCategory> = {};
    for (const c of categories) map[c.id] = { ...c };
    return map;
  });

  // drafts de produtos + variações
  const [prodDrafts, setProdDrafts] = useState<Record<string, DraftProduct>>(() => {
    const map: Record<string, DraftProduct> = {};
    for (const p of products) {
      const draftVars: DraftVariation[] = (p.variations ?? []).map((v) => ({
        id: v.id,
        product_id: v.product_id,
        name: v.name ?? "",
        price: Number(v.price ?? 0),
        price_input: String(v.price ?? 0).replace(".", ","), // amigável
      }));

      map[p.id] = {
        ...p,
        variations: draftVars,
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

  function setVariation(productId: string, variationId: string, patch: Partial<DraftVariation>) {
    setProdDrafts((prev) => {
      const p = prev[productId];
      if (!p) return prev;
      const nextVars = (p.variations ?? []).map((v) =>
        v.id === variationId ? { ...v, ...patch } : v
      );
      return { ...prev, [productId]: { ...p, variations: nextVars } };
    });
  }

  function addVariation(productId: string) {
    const tempId = `new-var-${crypto.randomUUID()}`;
    setProdDrafts((prev) => {
      const p = prev[productId];
      if (!p) return prev;

      const next: DraftVariation = {
        id: tempId,
        product_id: productId,
        name: "",
        price: 0,
        price_input: "",
        _isNew: true,
      };

      return {
        ...prev,
        [productId]: {
          ...p,
          variations: [...(p.variations ?? []), next],
        },
      };
    });
  }

  function deleteVariation(productId: string, variationId: string) {
    setProdDrafts((prev) => {
      const p = prev[productId];
      if (!p) return prev;
      const nextVars = (p.variations ?? []).filter((v) => v.id !== variationId);
      return { ...prev, [productId]: { ...p, variations: nextVars } };
    });
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
      [tempId]: {
        id: tempId,
        name,
        order_index: nextOrder,
        _isNew: true,
        _isSaving: true,
      },
    }));
    setNewCategoryName("");

    try {
      const { data, error } = await supabase
        .from("categories")
        .insert({
          unit_id: unitId,
          name,
          order_index: nextOrder,
        })
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
  // PRODUTOS + VARIAÇÕES (CRUD)
  // -----------------------
  function addNewProduct(categoryId: string) {
    const tempId = `new-prod-${crypto.randomUUID()}`;
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

  function validateVariableProduct(p: DraftProduct) {
    const vars = p.variations ?? [];
    if (vars.length < 1) return "Produto variável precisa de pelo menos 1 variação.";

    // exige nome e preço > 0 (pode ajustar depois)
    for (const v of vars) {
      const n = normalizeText(v.name);
      const price = parsePriceLoose(v.price_input ?? String(v.price ?? 0));
      if (!n) return "Toda variação precisa de um nome (ex: Pequena).";
      if (!(price > 0)) return "Toda variação precisa de um preço maior que 0.";
    }
    return null;
  }

  async function syncVariations(productId: string, drafts: DraftVariation[]) {
    // 1) puxa atuais do banco
    const { data: current, error: curErr } = await supabase
      .from("product_variations")
      .select("id, product_id, name, price")
      .eq("product_id", productId);

    if (curErr) throw curErr;

    const currentList = (current ?? []) as DashboardVariation[];
    const currentById = new Map(currentList.map((v) => [v.id, v]));

    const draftById = new Map(drafts.filter((v) => !String(v.id).startsWith("new-var-")).map((v) => [v.id, v]));

    // 2) deletes (os que existem no banco e não estão no draft)
    const toDelete = currentList.filter((v) => !draftById.has(v.id)).map((v) => v.id);
    if (toDelete.length) {
      const { error: delErr } = await supabase.from("product_variations").delete().in("id", toDelete);
      if (delErr) throw delErr;
    }

    // 3) updates (existentes)
    for (const v of drafts) {
      if (String(v.id).startsWith("new-var-")) continue;

      const old = currentById.get(v.id);
      const name = normalizeText(v.name);
      const price = parsePriceLoose(v.price_input ?? String(v.price ?? 0));

      if (!old) continue;

      const changed = old.name !== name || Number(old.price ?? 0) !== Number(price ?? 0);
      if (!changed) continue;

      const { error: upErr } = await supabase
        .from("product_variations")
        .update({ name, price })
        .eq("id", v.id);

      if (upErr) throw upErr;
    }

    // 4) inserts (novas)
    const news = drafts.filter((v) => String(v.id).startsWith("new-var-"));
    if (news.length) {
      const payload = news.map((v) => ({
        product_id: productId,
        name: normalizeText(v.name),
        price: parsePriceLoose(v.price_input ?? String(v.price ?? 0)),
      }));

      const { data: ins, error: insErr } = await supabase
        .from("product_variations")
        .insert(payload)
        .select("id, product_id, name, price");

      if (insErr) throw insErr;

      // retorna novos ids para atualizar estado (opcional)
      return (ins ?? []) as DashboardVariation[];
    }

    return [] as DashboardVariation[];
  }

  async function saveProduct(p: DraftProduct) {
    if (!p.name?.trim()) {
      alert("Nome do produto é obrigatório.");
      return;
    }

    if (p.price_type === "variable") {
      const msg = validateVariableProduct(p);
      if (msg) {
        alert(msg);
        return;
      }
    }

    setProdDraft(p.id, { _isSaving: true });

    try {
      let productId = p.id;

      // 1) salva produto
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

        productId = data.id as string;

        // troca tempId -> realId
        setProdDrafts((prev) => {
          const copy = { ...prev };
          const temp = copy[p.id];
          delete copy[p.id];
          copy[productId] = { ...temp, id: productId, _isNew: false, _isSaving: false };
          return copy;
        });
      } else {
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

        setProdDraft(p.id, { _isSaving: false });
      }

      // 2) sync variações (apenas se variável)
      if (p.price_type === "variable") {
        const currentDraft = (() => {
          // se era _isNew, o estado já foi migrado pro id real (mas pode não ter re-render ainda)
          const fromState = prodDrafts[productId] ?? p;
          return fromState.variations ?? [];
        })();

        const inserted = await syncVariations(productId, currentDraft);

        // atualiza estado das novas variações com ids reais
        if (inserted.length) {
          setProdDrafts((prev) => {
            const copy = { ...prev };
            const prod = copy[productId];
            if (!prod) return prev;

            const existingNonTemp = (prod.variations ?? []).filter((v) => !String(v.id).startsWith("new-var-"));
            const insertedDrafts: DraftVariation[] = inserted.map((v) => ({
              id: v.id,
              product_id: v.product_id,
              name: v.name,
              price: Number(v.price ?? 0),
              price_input: String(v.price ?? 0).replace(".", ","),
              _isNew: false,
            }));

            copy[productId] = { ...prod, variations: [...existingNonTemp, ...insertedDrafts], _isSaving: false };
            return copy;
          });
        }
      }

      setProdDraft(productId, { _isSaving: false });
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
      // apaga variações antes (para não depender de cascade)
      await supabase.from("product_variations").delete().eq("product_id", p.id);

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
      <section style={cardStyle}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Categorias</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
          <input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Nova categoria (ex: Pizzas Tradicionais)"
            style={inputStyle}
          />
          <button onClick={createCategory} style={btnStyle}>
            Criar
          </button>
        </div>
      </section>

      {/* Categorias + produtos */}
      {categoriesList.map((c) => {
        const list = productsByCategory[c.id] ?? [];

        return (
          <section key={c.id} style={cardStyle}>
            {/* Header categoria */}
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10 }}>
                <input
                  value={c.name}
                  onChange={(e) => setCatDraft(c.id, { name: e.target.value })}
                  placeholder="Nome da categoria"
                  style={inputStyle}
                />

                <button disabled={!!c._isSaving} onClick={() => saveCategory(c)} style={btnStyle}>
                  {c._isSaving ? "..." : "Salvar"}
                </button>

                <button disabled={!!c._isSaving} onClick={() => deleteCategory(c)} style={dangerBtnStyle}>
                  Excluir
                </button>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={() => addNewProduct(c.id)} style={btnStyle}>
                  + Criar Produto
                </button>
              </div>
            </div>

            <div style={{ height: 10 }} />

            {list.length === 0 ? (
              <div style={{ opacity: 0.7, fontSize: 13 }}>Sem produtos nessa categoria.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {list.map((p) => {
                  const vars = p.variations ?? [];
                  const isVariable = p.price_type === "variable";

                  const fromPrice =
                    isVariable && vars.length
                      ? Math.min(...vars.map((v) => parsePriceLoose(v.price_input ?? String(v.price ?? 0))))
                      : p.base_price ?? 0;

                  return (
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
                            value={String(p.base_price ?? 0).replace(".", ",")}
                            onChange={(e) =>
                              setProdDraft(p.id, { base_price: parsePriceLoose(e.target.value) })
                            }
                            placeholder="Preço fixo (ex: 39,90)"
                            style={inputStyle}
                            disabled={isVariable}
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
                            <option value="fixed">Preço fixo</option>
                            <option value="variable">Preço variável</option>
                          </select>
                        </div>

                        {isVariable && (
                          <div style={{ marginTop: 6, display: "grid", gap: 10 }}>
                            <div style={{ fontWeight: 800, fontSize: 13, opacity: 0.9 }}>
                              Variações (ex: Pequena / Média / Grande)
                            </div>

                            {vars.length === 0 ? (
                              <div style={{ fontSize: 13, opacity: 0.7 }}>
                                Nenhuma variação ainda. Clique em “+ Adicionar variação”.
                              </div>
                            ) : (
                              <div style={{ display: "grid", gap: 8 }}>
                                {vars.map((v) => (
                                  <div
                                    key={v.id}
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns: "1fr 140px auto",
                                      gap: 8,
                                      alignItems: "center",
                                    }}
                                  >
                                    <input
                                      value={v.name}
                                      onChange={(e) =>
                                        setVariation(p.id, v.id, { name: e.target.value })
                                      }
                                      placeholder="Nome (ex: Pequena)"
                                      style={inputStyle}
                                    />

                                    <input
                                      value={v.price_input ?? String(v.price ?? 0).replace(".", ",")}
                                      onChange={(e) =>
                                        setVariation(p.id, v.id, {
                                          price_input: e.target.value,
                                          price: parsePriceLoose(e.target.value),
                                        })
                                      }
                                      placeholder="Preço (ex: 39,90)"
                                      style={inputStyle}
                                    />

                                    <button
                                      onClick={() => deleteVariation(p.id, v.id)}
                                      style={{
                                        padding: "10px 12px",
                                        borderRadius: 12,
                                        border: "1px solid rgba(255,80,80,0.45)",
                                        background: "rgba(255,80,80,0.12)",
                                        cursor: "pointer",
                                        fontWeight: 800,
                                      }}
                                      title="Remover variação"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div style={{ display: "flex", justifyContent: "flex-end" }}>
                              <button onClick={() => addVariation(p.id)} style={btnStyle}>
                                + Adicionar variação
                              </button>
                            </div>

                            <div style={{ fontSize: 12, opacity: 0.75 }}>
                              No público vai aparecer: <b>A partir de {formatMoneyBR(fromPrice)}</b>
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
                        <button disabled={!!p._isSaving} onClick={() => saveProduct(p)} style={btnStyle}>
                          {p._isSaving ? "Salvando..." : "Salvar"}
                        </button>

                        <button disabled={!!p._isSaving} onClick={() => deleteProduct(p)} style={dangerBtnStyle}>
                          Excluir
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
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

const btnStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.10)",
  cursor: "pointer",
  fontWeight: 800,
};

const dangerBtnStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,80,80,0.45)",
  background: "rgba(255,80,80,0.12)",
  cursor: "pointer",
  fontWeight: 800,
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