"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, X, Search, Plus, Minus, Check } from "lucide-react";
import {
  listProductsForCart,
  type CategoryForCart,
  type ProductForCart,
  type CartItemInput,
} from "./actions";
import { formatCents as fmtBRL } from "@/lib/money";

export type ProductPickerModalProps = {
  open: boolean;
  onClose: () => void;
  onAdd: (item: CartItemInput) => void;
};

export default function ProductPickerModal({ open, onClose, onAdd }: ProductPickerModalProps) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductForCart[]>([]);
  const [categories, setCategories] = useState<CategoryForCart[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<ProductForCart | null>(null);

  // Debounce search 200ms
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim().toLowerCase()), 200);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Load on open
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setErr(null);
    setSelectedCategory(null);
    setSearchInput("");
    setSearch("");
    setDetail(null);
    (async () => {
      try {
        const token = sessionStorage.getItem("fy_emp_token") ?? "";
        const result = await listProductsForCart(token);
        setProducts(result.products);
        setCategories(result.categories);
      } catch (e: any) {
        setErr(e?.message ?? "Erro ao carregar cardápio");
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory && p.category_id !== selectedCategory) return false;
      if (search && !p.name.toLowerCase().includes(search) &&
          !(p.description ?? "").toLowerCase().includes(search)) return false;
      return true;
    });
  }, [products, search, selectedCategory]);

  if (!open) return null;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.55)",
        display: "flex", alignItems: "stretch", justifyContent: "center",
      }}
    >
      <div style={{
        background: "#fff", width: "100%", maxWidth: 640,
        height: "100vh", maxHeight: "100vh",
        overflowY: "auto",
        display: "flex", flexDirection: "column",
        animation: "slideUpFs 0.22s ease",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}>
        <style>{`@keyframes slideUpFs { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

        {detail ? (
          <ProductDetail
            product={detail}
            onBack={() => setDetail(null)}
            onAdd={(item) => { onAdd(item); setDetail(null); onClose(); }}
          />
        ) : (
          <>
            {/* Header */}
            <header style={{
              background: "#fff", borderBottom: "1px solid #e5e7eb",
              padding: "12px 16px", display: "flex", alignItems: "center", gap: 10,
              position: "sticky", top: 0, zIndex: 5,
            }}>
              <span style={{ flex: 1, fontSize: 16, fontWeight: 800, color: "#111827" }}>
                Adicionar item
              </span>
              <button onClick={onClose} aria-label="Fechar" style={{
                width: 32, height: 32, borderRadius: 8, border: "1px solid #fecaca",
                background: "#fef2f2", color: "#b91c1c",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}>
                <X size={16} strokeWidth={3} />
              </button>
            </header>

            {/* Search */}
            <div style={{
              padding: "12px 16px", background: "#fff",
              position: "sticky", top: 56, zIndex: 4,
              borderBottom: "1px solid #e5e7eb",
            }}>
              <div style={{ position: "relative" }}>
                <Search size={16} color="#9ca3af" style={{ position: "absolute", left: 12, top: 12 }} />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Buscar produto..."
                  style={{
                    width: "100%", padding: "10px 12px 10px 36px", borderRadius: 10,
                    border: "1px solid #e5e7eb", background: "#fafafa",
                    fontSize: 14, fontFamily: "inherit", outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Categories chips */}
            {categories.length > 0 && (
              <div style={{
                display: "flex", gap: 8, padding: "10px 16px",
                overflowX: "auto", borderBottom: "1px solid #f3f4f6",
                background: "#fff",
              }}>
                <CategoryChip label="Todos" active={!selectedCategory} onClick={() => setSelectedCategory(null)} />
                {categories.map((c) => (
                  <CategoryChip
                    key={c.id}
                    label={c.name}
                    active={selectedCategory === c.id}
                    onClick={() => setSelectedCategory(c.id)}
                  />
                ))}
              </div>
            )}

            {/* Products list */}
            <main style={{ flex: 1, padding: "12px 16px", background: "#fafafa" }}>
              {err && (
                <div role="alert" style={{
                  padding: "10px 14px", borderRadius: 8, marginBottom: 12,
                  background: "#fee2e2", border: "1px solid #fca5a5",
                  color: "#991b1b", fontSize: 13, fontWeight: 600,
                }}>⚠ {err}</div>
              )}

              {loading ? (
                <div style={{ textAlign: "center", padding: 40, color: "#9ca3af", fontSize: 13 }}>Carregando cardápio…</div>
              ) : filtered.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "#9ca3af", fontSize: 13 }}>
                  Nenhum produto encontrado.
                </div>
              ) : (
                filtered.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setDetail(p)}
                    style={{
                      width: "100%", textAlign: "left",
                      background: "#fff", border: "1px solid #e5e7eb",
                      borderRadius: 12, padding: 12, marginBottom: 8,
                      cursor: "pointer", fontFamily: "inherit",
                      display: "flex", gap: 12, alignItems: "center",
                    }}
                  >
                    {p.thumbnail_url ? (
                      <img src={p.thumbnail_url} alt="" style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 56, height: 56, borderRadius: 10, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", flexShrink: 0, fontSize: 22 }}>🍽️</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", lineHeight: 1.2 }}>{p.name}</div>
                      {p.description && (
                        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
                          {p.description}
                        </div>
                      )}
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#16a34a", marginTop: 4 }}>
                        {p.variations.length > 0 ? `a partir de ${fmtBRL(Math.min(...p.variations.map((v) => v.price)))}` : fmtBRL(p.base_price)}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </main>
          </>
        )}
      </div>
    </div>
  );
}

function CategoryChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0, padding: "7px 14px", borderRadius: 999,
        border: active ? "1px solid #16a34a" : "1px solid #e5e7eb",
        background: active ? "#f0fdf4" : "#fff",
        color: active ? "#15803d" : "#374151",
        fontSize: 12, fontWeight: 700, fontFamily: "inherit",
        cursor: "pointer", whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function ProductDetail({
  product, onBack, onAdd,
}: {
  product: ProductForCart;
  onBack: () => void;
  onAdd: (item: CartItemInput) => void;
}) {
  const hasVariations = product.variations.length > 0;
  const [variationId, setVariationId] = useState<string | null>(hasVariations ? product.variations[0].id : null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  const variation = hasVariations ? product.variations.find((v) => v.id === variationId) ?? null : null;
  const unitPrice = variation ? variation.price : product.base_price;
  const subtotal = unitPrice * quantity;

  function handleAdd() {
    onAdd({
      productId: product.id,
      productName: product.name,
      variationName: variation?.name,
      quantity,
      unitPrice,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <>
      <header style={{
        background: "#fff", borderBottom: "1px solid #e5e7eb",
        padding: "12px 16px", display: "flex", alignItems: "center", gap: 10,
        position: "sticky", top: 0, zIndex: 5,
      }}>
        <button onClick={onBack} aria-label="Voltar" style={{
          width: 36, height: 36, borderRadius: 10, border: "1px solid #e5e7eb",
          background: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
        }}>
          <ArrowLeft size={18} color="#374151" />
        </button>
        <span style={{ flex: 1, fontSize: 15, fontWeight: 800, color: "#111827", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {product.name}
        </span>
      </header>

      <main style={{ flex: 1, padding: 16, background: "#fafafa", overflowY: "auto" }}>
        {product.thumbnail_url && (
          <img src={product.thumbnail_url} alt="" style={{ width: "100%", maxHeight: 240, borderRadius: 14, objectFit: "cover", marginBottom: 12 }} />
        )}
        {product.description && (
          <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.5, marginBottom: 16 }}>{product.description}</p>
        )}

        {hasVariations && (
          <section style={{ marginBottom: 16 }}>
            <div style={fieldLabel}>Tamanho / Variação *</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {product.variations.map((v) => (
                <label key={v.id} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "12px 14px", borderRadius: 10,
                  border: variationId === v.id ? "2px solid #16a34a" : "1px solid #e5e7eb",
                  background: variationId === v.id ? "#f0fdf4" : "#fff",
                  cursor: "pointer",
                }}>
                  <input
                    type="radio"
                    name="variation"
                    checked={variationId === v.id}
                    onChange={() => setVariationId(v.id)}
                    style={{ accentColor: "#16a34a" }}
                  />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#111827" }}>{v.name}</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "#16a34a" }}>{fmtBRL(v.price)}</span>
                </label>
              ))}
            </div>
          </section>
        )}

        <section style={{ marginBottom: 16 }}>
          <div style={fieldLabel}>Quantidade</div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              style={qtyBtn}
              aria-label="Diminuir"
            >
              <Minus size={18} />
            </button>
            <span style={{ fontSize: 22, fontWeight: 800, color: "#111827", minWidth: 32, textAlign: "center" }}>
              {quantity}
            </span>
            <button
              onClick={() => setQuantity((q) => Math.min(99, q + 1))}
              style={qtyBtn}
              aria-label="Aumentar"
            >
              <Plus size={18} />
            </button>
          </div>
        </section>

        <section style={{ marginBottom: 16 }}>
          <div style={fieldLabel}>Observações</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 200))}
            placeholder="Ex: sem cebola, ao ponto, etc."
            rows={2}
            style={{
              width: "100%", padding: "10px 12px", borderRadius: 10,
              border: "1px solid #e5e7eb", background: "#fff",
              fontSize: 14, fontFamily: "inherit", outline: "none",
              resize: "none", boxSizing: "border-box",
            }}
          />
          <div style={{ textAlign: "right", fontSize: 11, color: "#9ca3af", marginTop: 3 }}>
            {notes.length}/200
          </div>
        </section>
      </main>

      <footer style={{
        background: "#fff", borderTop: "1px solid #e5e7eb",
        padding: "12px 16px",
        display: "flex", alignItems: "center", gap: 12,
        position: "sticky", bottom: 0,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase" }}>Subtotal</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: "#16a34a", lineHeight: 1 }}>{fmtBRL(subtotal)}</div>
        </div>
        <button
          onClick={handleAdd}
          disabled={hasVariations && !variationId}
          style={{
            padding: "13px 18px", borderRadius: 12, border: "none",
            background: (hasVariations && !variationId) ? "#9ca3af" : "#16a34a",
            color: "#fff", fontSize: 14, fontWeight: 800, fontFamily: "inherit",
            cursor: (hasVariations && !variationId) ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", gap: 6,
            boxShadow: "0 2px 6px rgba(22,163,74,0.25)",
          }}
        >
          <Check size={16} strokeWidth={3} /> Adicionar
        </button>
      </footer>
    </>
  );
}

const fieldLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 800, color: "#9ca3af",
  textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8,
};

const qtyBtn: React.CSSProperties = {
  width: 44, height: 44, borderRadius: 12,
  border: "1px solid #e5e7eb", background: "#fff",
  display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer", color: "#374151",
};
