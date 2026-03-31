"use client";

import { useState, useEffect, useRef } from "react";
import { createCategory, updateCategory, deleteCategory, createProduct } from "../actions";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import ProductRow from "../ProductRow";
import dynamic from "next/dynamic";
import { Unit, Category, Product } from "../types";

const ImportClient = dynamic(() => import("../ia/ImportClient"), { ssr: false });

const inp: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: 12,
  border: "1px solid var(--dash-input-border)",
  background: "var(--dash-input-bg)",
  color: "var(--dash-text)", fontSize: 16, boxSizing: "border-box",
  outline: "none",
};

function NewProductFormInline({ categoryId, section, anyProductExpanded, onOpen }: { categoryId: string; section: 'pratos' | 'drinks' | 'bebidas'; anyProductExpanded: boolean; onOpen: () => void }) {
  const [open, setOpen] = useState(false);
  const [priceType, setPriceType] = useState("fixed");
  const [isAlcoholic, setIsAlcoholic] = useState(false);

  const showVideo = section !== 'bebidas';
  const showAlcoholic = section === 'drinks' || section === 'bebidas';

  useEffect(() => {
    if (anyProductExpanded) setOpen(false);
  }, [anyProductExpanded]);

  function handleOpen() {
    onOpen();
    setPriceType("fixed");
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
    setPriceType("fixed");
    setIsAlcoholic(false);
  }

  if (!open) return (
    <button onClick={handleOpen} style={{ padding: "10px", borderRadius: 10, width: "100%", background: "transparent", border: "1px dashed var(--dash-btn-border)", color: "var(--dash-text-muted)", fontSize: 13, cursor: "pointer" }}>
      + Adicionar produto
    </button>
  );
  return (
    <form
      action={async (formData) => {
        await createProduct(formData);
        handleClose();
      }}
      style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, borderRadius: 12, border: "1px solid var(--dash-input-border)", background: "var(--dash-card)" }}
    >
      <input type="hidden" name="category_id" value={categoryId} />
      <input name="name" placeholder="Nome do produto" required style={inp} />
      <textarea name="description" placeholder="Descrição (opcional)" rows={2} style={{ ...inp, resize: "vertical" }} />
      <div style={{ display: "flex", gap: 8 }}>
        <select name="price_type" value={priceType} onChange={(e) => setPriceType(e.target.value)} style={{ ...inp, flex: 1, cursor: "pointer" }}>
          <option value="fixed">Preço fixo</option>
          <option value="variable">Preço variável</option>
        </select>
        {priceType === "fixed" && (
          <input name="base_price" placeholder="Preço (ex: 29,90)" inputMode="decimal" style={{ ...inp, flex: 1 }} />
        )}
      </div>
      {priceType === "variable" && (
        <p style={{ color: "var(--dash-text-muted)", fontSize: 12, margin: 0 }}>
          💡 Adicione as variações de preço após criar o produto (clique no produto para editar).
        </p>
      )}
      {showAlcoholic && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <button
            type="button"
            onClick={() => setIsAlcoholic(!isAlcoholic)}
            style={{ width: 44, height: 26, borderRadius: 13, background: isAlcoholic ? "#00ffae" : "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}
          >
            <span style={{ display: "block", width: 20, height: 20, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: 3, transition: "transform 0.2s", transform: isAlcoholic ? "translateX(18px)" : "translateX(0)" }} />
          </button>
          <input type="hidden" name="is_alcoholic" value={isAlcoholic ? "on" : "off"} />
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>{section === 'drinks' ? "Drink alcoólico" : "Bebida alcoólica"}</span>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" onClick={handleClose} style={{ padding: "9px 14px", borderRadius: 10, border: "1px solid var(--dash-btn-border)", background: "transparent", color: "var(--dash-text-dim)", fontSize: 12, cursor: "pointer" }}>Cancelar</button>
        <button type="submit" style={{ padding: "9px 16px", borderRadius: 10, border: "none", background: "rgba(0,255,174,0.15)", color: "#00ffae", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Criar</button>
      </div>
    </form>
  );
}

export default function CardapioModal({ unit, categories, products, upsellItems, onClose }: {
  unit: Unit | null; categories: Category[]; products: Product[]; upsellItems: any[]; onClose: () => void;
}) {
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [showAllProducts, setShowAllProducts] = useState<Record<string, boolean>>({});
  const [catActiveState, setCatActiveState] = useState<Record<string, boolean>>({});

  function isCatActive(cat: any) {
    if (catActiveState[cat.id] !== undefined) return catActiveState[cat.id];
    return cat.is_active !== false;
  }
  const [newCatType, setNewCatType] = useState<"food" | "drink">("food");
  const [newCatSection, setNewCatSection] = useState<'pratos' | 'drinks' | 'bebidas'>('pratos');
  const [editCatSection, setEditCatSection] = useState<Record<string, 'pratos' | 'drinks' | 'bebidas'>>({});
  const [showImport, setShowImport] = useState(false);
  const [orderedCats, setOrderedCats] = useState(categories);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const touchStartY = useRef(0);
  const touchCurrentY = useRef(0);
  const dragElRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { setOrderedCats(categories); }, [categories]);

  function handleReorder(fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx) return;
    const updated = [...orderedCats];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    setOrderedCats(updated);
    updated.forEach((cat, i) => {
      const fd = new FormData();
      fd.set("id", cat.id);
      fd.set("name", cat.name);
      fd.set("order_index", String(i));
      updateCategory(fd);
    });
  }

  function onTouchStartDrag(e: React.TouchEvent, idx: number) {
    e.stopPropagation();
    setDragIdx(idx);
    touchStartY.current = e.touches[0].clientY;
    touchCurrentY.current = e.touches[0].clientY;
    dragElRef.current = (e.currentTarget as HTMLElement).closest('[data-cat-idx]') as HTMLDivElement;
    if (dragElRef.current) {
      dragElRef.current.style.transition = "none";
      dragElRef.current.style.zIndex = "999";
      dragElRef.current.style.position = "relative";
    }
  }

  function onTouchMoveDrag(e: React.TouchEvent) {
    if (dragIdx === null || !dragElRef.current) return;
    e.preventDefault();
    const y = e.touches[0].clientY;
    touchCurrentY.current = y;
    const dy = y - touchStartY.current;
    dragElRef.current.style.transform = `translateY(${dy}px) scale(1.03)`;
    dragElRef.current.style.opacity = "0.85";
    dragElRef.current.style.boxShadow = "0 8px 32px rgba(0,0,0,0.4)";
    const items = document.querySelectorAll('[data-cat-idx]');
    items.forEach((item) => {
      const rect = item.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      if (y > mid - 20 && y < mid + 20) {
        const idx = parseInt(item.getAttribute('data-cat-idx') || '-1');
        if (idx !== dragIdx) setOverIdx(idx);
      }
    });
  }

  function onTouchEndDrag() {
    if (dragIdx !== null && overIdx !== null) {
      handleReorder(dragIdx, overIdx);
    }
    if (dragElRef.current) {
      dragElRef.current.style.transition = "all 0.25s ease";
      dragElRef.current.style.transform = "";
      dragElRef.current.style.opacity = "";
      dragElRef.current.style.boxShadow = "";
      dragElRef.current.style.zIndex = "";
      dragElRef.current.style.position = "";
      dragElRef.current = null;
    }
    setDragIdx(null);
    setOverIdx(null);
  }

  const productsByCat = orderedCats.reduce<Record<string, Product[]>>((acc, cat) => {
    acc[cat.id] = products.filter((p) => p.category_id === cat.id);
    return acc;
  }, {});

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
      {/* Links rápidos */}
      <div style={{ display: "flex", gap: 8 }}>
        {showImport ? (
          <>
            <button type="button" className="btn-ai" style={{ flex: 1 }} onClick={() => setShowImport(false)}>
              ← Voltar ao cardápio
            </button>
            {unit && (
              <a href={`/delivery/${unit.slug}`} target="_blank" rel="noreferrer" style={{ flex: 1, textAlign: "center", padding: "10px", borderRadius: 12, background: "var(--dash-link-bg)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -2px 0 rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.15)", color: "var(--dash-text-secondary)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                Ver cardápio ↗
              </a>
            )}
          </>
        ) : (
          <>
            {unit && (
              <a href={`/delivery/${unit.slug}`} target="_blank" rel="noreferrer" style={{ flex: 1, textAlign: "center", padding: "10px", borderRadius: 12, background: "var(--dash-link-bg)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -2px 0 rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.15)", color: "var(--dash-text-secondary)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                Ver cardápio ↗
              </a>
            )}
            <button type="button" className="btn-ai" style={{ flex: 1 }} onClick={() => setShowImport(true)}>
              ✨ Importar com IA
            </button>
          </>
        )}
      </div>

      {showImport ? (
        <div style={{ marginTop: 8 }}>
          {unit && <ImportClient unitId={unit.id} unitName={unit.name} embedded />}
        </div>
      ) : (
        <>

      {/* Nova categoria */}
      {unit && (
        <form action={createCategory} className="modal-neon-card" style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px 14px", borderRadius: 14, background: "var(--dash-card)" }}>
          <input type="hidden" name="unit_id" value={unit.id} />
          <input type="hidden" name="category_type" value={newCatType} />
          <input type="hidden" name="is_alcoholic" value="false" />
          <input type="hidden" name="section" value={newCatSection} />
          <div style={{ display: "flex", gap: 8 }}>
            <input name="name" placeholder="Nome da categoria" required style={{ ...inp, flex: 1, height: 38, padding: "0 12px" }} />
            <button type="submit" className="btn-gradient" style={{ padding: "0 14px", whiteSpace: "nowrap", minWidth: 60, height: 30, borderRadius: 8 }}>
              Criar
            </button>
          </div>
          {/* Sessão */}
          <div style={{ marginBottom: 4 }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>Sessão</div>
            <div style={{ display: "flex", gap: 8 }}>
              {([['pratos','🍽️','Pratos'],['drinks','🍸','Drinks'],['bebidas','🥤','Bebidas']] as const).map(([val, icon, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setNewCatSection(val)}
                  style={{
                    flex: 1, padding: "8px 4px", borderRadius: 10, border: "1px solid",
                    borderColor: newCatSection === val ? "#00ffae" : "rgba(255,255,255,0.12)",
                    background: newCatSection === val ? "rgba(0,255,174,0.12)" : "rgba(255,255,255,0.04)",
                    color: newCatSection === val ? "#00ffae" : "rgba(255,255,255,0.5)",
                    fontSize: 12, fontWeight: 700, cursor: "pointer",
                  }}
                >{icon} {label}</button>
              ))}
            </div>
          </div>
        </form>
      )}

      {orderedCats.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--dash-text-subtle)", fontSize: 14 }}>Crie sua primeira categoria acima!</div>
      )}

      {orderedCats.map((cat, catIdx) => {
        const isOpen = expandedCat === cat.id;
        const catProducts = productsByCat[cat.id] ?? [];
        const isDragging = dragIdx === catIdx;
        const isOver = overIdx === catIdx;
        return (
          <div
            key={cat.id}
            data-cat-idx={catIdx}
            draggable
            onDragStart={() => setDragIdx(catIdx)}
            onDragOver={(e) => { e.preventDefault(); setOverIdx(catIdx); }}
            onDragEnd={() => { if (dragIdx !== null && overIdx !== null) handleReorder(dragIdx, overIdx); setDragIdx(null); setOverIdx(null); }}
            onDrop={() => { if (dragIdx !== null) handleReorder(dragIdx, catIdx); setDragIdx(null); setOverIdx(null); }}
            className={overIdx === catIdx ? "" : "modal-neon-card"}
            style={{
              borderRadius: 16,
              border: overIdx === catIdx ? "2px solid #FF6B00" : undefined,
              background: dragIdx === catIdx ? "var(--dash-card-hover, rgba(255,255,255,0.08))" : "var(--dash-card-subtle)",
              overflow: "hidden",
              opacity: dragIdx === catIdx ? 0.7 : 1,
              transition: "all 0.2s ease",
              transform: overIdx === catIdx && dragIdx !== catIdx ? "scale(1.02)" : "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", padding: "10px 12px", gap: 6, cursor: "pointer" }} onClick={() => { setExpandedCat(isOpen ? null : cat.id); if (isOpen) setShowAllProducts(prev => ({ ...prev, [cat.id]: false })); }}>
              <span
                style={{ cursor: "grab", fontSize: 16, color: "var(--dash-text-muted)", opacity: 0.5, userSelect: "none", WebkitUserSelect: "none", touchAction: "none", WebkitTouchCallout: "none", padding: "0 2px", lineHeight: 1, flexShrink: 0, width: 18, textAlign: "center" }}
                onMouseDown={(e) => e.stopPropagation()}
                onContextMenu={(e) => e.preventDefault()}
                onTouchStart={(e) => { e.preventDefault(); onTouchStartDrag(e, catIdx); }}
                onTouchMove={(e) => onTouchMoveDrag(e)}
                onTouchEnd={() => onTouchEndDrag()}
                title="Segurar e arrastar para reordenar"
              >⠿</span>
              <span className="cat-header-arrow" data-open={isOpen ? "true" : "false"} style={{ color: "var(--dash-text-muted)", fontSize: 11, flexShrink: 0, width: 14, textAlign: "center", lineHeight: 1 }}>▼</span>
              {cat.section === 'drinks' && <span style={{ fontSize: 14, flexShrink: 0 }} title="Drinks">🍸</span>}
              {cat.section === 'bebidas' && <span style={{ fontSize: 14, flexShrink: 0 }} title="Bebidas">🥤</span>}
              <form action={updateCategory} onClick={(e) => e.stopPropagation()} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <input type="hidden" name="id" value={cat.id} />
                <input type="hidden" name="section" value={editCatSection[cat.id] ?? cat.section ?? 'pratos'} />
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input name="name" defaultValue={cat.name} style={{ ...inp, flex: 1, fontSize: 14, fontWeight: 800, height: 38, padding: "0 12px" }} />
                  <button type="submit" className="btn-gradient" style={{ padding: "0 10px", height: 30, fontSize: 11, minWidth: 50, borderRadius: 7, flexShrink: 0 }}>
                    Salvar
                  </button>
                </div>
                {isOpen && (
                  <div style={{ display: "flex", gap: 6 }}>
                    {([['pratos','🍽️','Pratos'],['drinks','🍸','Drinks'],['bebidas','🥤','Bebidas']] as const).map(([val, icon, label]) => {
                      const current = editCatSection[cat.id] ?? cat.section ?? 'pratos';
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setEditCatSection(prev => ({ ...prev, [cat.id]: val }))}
                          style={{
                            flex: 1, padding: "5px 2px", borderRadius: 8, border: "1px solid",
                            borderColor: current === val ? "#00ffae" : "rgba(255,255,255,0.12)",
                            background: current === val ? "rgba(0,255,174,0.12)" : "rgba(255,255,255,0.04)",
                            color: current === val ? "#00ffae" : "rgba(255,255,255,0.5)",
                            fontSize: 11, fontWeight: 700, cursor: "pointer",
                          }}
                        >{icon} {label}</button>
                      );
                    })}
                  </div>
                )}
              </form>
              <form action={deleteCategory} onClick={(e) => e.stopPropagation()} onSubmit={(e) => { if (!confirm("Excluir categoria e todos os produtos?")) e.preventDefault(); }}>
                <input type="hidden" name="id" value={cat.id} />
                <button type="submit" className="delete-btn">
                  <span className="x-line" />
                  <span className="x-line" />
                </button>
              </form>
              <label className="switch-toggle" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={isCatActive(cat)}
                  onChange={async (e) => {
                    const newActive = e.target.checked;
                    setCatActiveState(prev => ({ ...prev, [cat.id]: newActive }));
                    const supabase = createSupabaseClient();
                    const { error } = await supabase
                      .from("categories")
                      .update({ is_active: newActive })
                      .eq("id", cat.id);
                    if (error) {
                      console.error("Toggle category active error:", error);
                      setCatActiveState(prev => ({ ...prev, [cat.id]: !newActive }));
                    }
                  }}
                />
                <div className="sw-slider">
                  <div className="sw-circle">
                    <svg className="sw-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <svg className="sw-cross" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </div>
                </div>
              </label>
            </div>
            <div className="cat-dropdown-content" data-open={isOpen ? "true" : "false"}>
              <div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: isOpen ? "0 12px 12px" : "0 12px" }}>
                  {isOpen && (
                    <>
                      {catProducts.length === 0 && <div style={{ color: "var(--dash-text-subtle)", fontSize: 13, padding: "8px 0" }}>Nenhum produto nesta categoria.</div>}
                      {(showAllProducts[cat.id] ? catProducts : catProducts.slice(0, 4)).map((p) => (
                        <ProductRow
                          key={p.id}
                          product={p}
                          expanded={expandedProductId === p.id}
                          onToggle={() => setExpandedProductId(expandedProductId === p.id ? null : p.id)}
                          onClose={() => setExpandedProductId(null)}
                        />
                      ))}
                      {catProducts.length > 4 && !showAllProducts[cat.id] && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setShowAllProducts(prev => ({ ...prev, [cat.id]: true })); }}
                          style={{
                            width: "100%",
                            padding: "10px 0",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 8,
                            color: "#00ffae",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Ver mais {catProducts.length - 4} produto{catProducts.length - 4 !== 1 ? "s" : ""} ↓
                        </button>
                      )}
                      <NewProductFormInline
                        categoryId={cat.id}
                        section={editCatSection[cat.id] ?? cat.section ?? 'pratos'}
                        anyProductExpanded={expandedProductId !== null}
                        onOpen={() => setExpandedProductId(null)}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
        </>
      )}
    </div>
  );
}
