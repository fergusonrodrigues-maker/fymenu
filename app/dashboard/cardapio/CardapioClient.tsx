"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createCategory, updateCategory, deleteCategory,
  createProduct, updateProduct, deleteProduct,
} from "../actions";

type Category = { id: string; name: string; order_index: number | null };
type Product = {
  id: string; category_id: string; name: string;
  description: string | null; price_type: string;
  base_price: number | null; thumbnail_url: string | null;
  video_url: string | null; order_index: number | null;
};

export default function CardapioClient({
  units, activeUnit, categories, products,
}: {
  units: any[]; activeUnit: any;
  categories: Category[]; products: Product[];
}) {
  const router = useRouter();
  const [expandedCat, setExpandedCat] = useState<string | null>(
    categories[0]?.id ?? null
  );

  const productsByCat = categories.reduce<Record<string, Product[]>>((acc, cat) => {
    acc[cat.id] = products.filter((p) => p.category_id === cat.id);
    return acc;
  }, {});

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 900, margin: 0 }}>
            Cardápio
          </h1>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 4 }}>
            {activeUnit.name}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {units.length > 1 && (
            <select
              value={activeUnit.id}
              onChange={(e) => router.push(`/dashboard/cardapio?unit=${e.target.value}`)}
              style={{
                padding: "8px 12px", borderRadius: 10,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#fff", fontSize: 13, cursor: "pointer",
              }}
            >
              {units.map((u) => (
                <option key={u.id} value={u.id} style={{ background: "#1a1a1a" }}>
                  {u.name}
                </option>
              ))}
            </select>
          )}

          <a
            href={`/u/${activeUnit.slug}`}
            target="_blank"
            rel="noreferrer"
            style={{
              padding: "8px 14px", borderRadius: 10,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#fff", fontSize: 13, fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Ver cardápio ↗
          </a>
        </div>
      </div>

      {/* Nova categoria */}
      <form action={createCategory} style={{ display: "flex", gap: 8 }}>
        <input type="hidden" name="unit_id" value={activeUnit.id} />
        <input
          name="name"
          placeholder="+ Nova categoria"
          required
          style={inputStyle}
        />
        <button type="submit" style={btnPrimaryStyle}>Criar</button>
      </form>

      {/* Lista de categorias */}
      {categories.length === 0 && (
        <div style={{
          textAlign: "center", padding: "48px 0",
          color: "rgba(255,255,255,0.25)", fontSize: 14,
        }}>
          Nenhuma categoria ainda. Crie a primeira acima!
        </div>
      )}

      {categories.map((cat) => {
        const isOpen = expandedCat === cat.id;
        const catProducts = productsByCat[cat.id] ?? [];

        return (
          <div key={cat.id} style={{
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
            overflow: "hidden",
          }}>
            {/* Cabeçalho da categoria */}
            <div
              style={{
                display: "flex", alignItems: "center",
                padding: "14px 16px", gap: 10,
                cursor: "pointer",
                borderBottom: isOpen ? "1px solid rgba(255,255,255,0.06)" : "none",
              }}
              onClick={() => setExpandedCat(isOpen ? null : cat.id)}
            >
              <span style={{
                color: "rgba(255,255,255,0.4)", fontSize: 13,
                transform: isOpen ? "rotate(90deg)" : "none",
                transition: "transform 0.2s",
                display: "inline-block",
              }}>▶</span>

              <form action={updateCategory}
                onClick={(e) => e.stopPropagation()}
                style={{ flex: 1, display: "flex", gap: 8 }}
              >
                <input type="hidden" name="id" value={cat.id} />
                <input
                  name="name"
                  defaultValue={cat.name}
                  style={{ ...inputStyle, flex: 1, fontSize: 15, fontWeight: 800 }}
                />
                <button type="submit" style={btnGhostStyle}>Salvar</button>
              </form>

              <form
                action={deleteCategory}
                onClick={(e) => e.stopPropagation()}
                onSubmit={(e) => {
                  if (!confirm("Excluir categoria e todos os produtos?")) e.preventDefault();
                }}
              >
                <input type="hidden" name="id" value={cat.id} />
                <button type="submit" style={btnDangerStyle}>✕</button>
              </form>
            </div>

            {/* Produtos */}
            {isOpen && (
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                {catProducts.length === 0 && (
                  <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 13 }}>
                    Nenhum produto nesta categoria.
                  </div>
                )}

                {catProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}

                <NewProductForm categoryId={cat.id} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.07)",
      background: "rgba(255,255,255,0.03)",
      overflow: "hidden",
    }}>
      {/* Preview linha */}
      <div
        style={{
          display: "flex", alignItems: "center",
          padding: "12px 14px", gap: 12, cursor: "pointer",
        }}
        onClick={() => setOpen((o) => !o)}
      >
        {product.thumbnail_url ? (
          <img src={product.thumbnail_url} alt=""
            style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
        ) : (
          <div style={{
            width: 44, height: 44, borderRadius: 8, flexShrink: 0,
            background: "rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18,
          }}>🍽</div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 14,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {product.name}
          </div>
          <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>
            {product.price_type === "variable"
              ? "Preço variável"
              : product.base_price != null
              ? `R$ ${Number(product.base_price).toFixed(2).replace(".", ",")}`
              : "Sem preço"}
          </div>
        </div>
        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>
          {open ? "▲" : "▼"}
        </span>
      </div>

      {/* Form edição + delete (forms separados, sem aninhamento) */}
      {open && (
        <div style={{
          padding: "0 14px 14px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}>
          <form action={updateProduct} style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 12 }}>
            <input type="hidden" name="id" value={product.id} />

            <input name="name" defaultValue={product.name}
              placeholder="Nome" required style={inputStyle} />

            <textarea name="description" defaultValue={product.description ?? ""}
              placeholder="Descrição (opcional)" rows={2}
              style={{ ...inputStyle, resize: "vertical" }} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input name="base_price"
                defaultValue={product.base_price != null
                  ? String(product.base_price).replace(".", ",") : ""}
                placeholder="Preço (ex: 29,90)"
                inputMode="decimal" style={inputStyle} />

              <select name="price_type" defaultValue={product.price_type}
                style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="fixed">Preço fixo</option>
                <option value="variable">Preço variável</option>
              </select>
            </div>

            <input name="thumbnail_url" defaultValue={product.thumbnail_url ?? ""}
              placeholder="URL da thumbnail" style={inputStyle} />

            <input name="video_url" defaultValue={product.video_url ?? ""}
              placeholder="URL do vídeo" style={inputStyle} />

            <button type="submit" style={btnPrimaryStyle}>Salvar</button>
          </form>

          {/* Delete em form separado para evitar aninhamento */}
          <form
            action={deleteProduct}
            style={{ marginTop: 8 }}
            onSubmit={(e) => {
              if (!confirm("Excluir produto?")) e.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={product.id} />
            <button type="submit" style={{ ...btnDangerStyle, width: "100%" }}>
              Excluir produto
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function NewProductForm({ categoryId }: { categoryId: string }) {
  const [open, setOpen] = useState(false);

  if (!open) return (
    <button onClick={() => setOpen(true)} style={{
      padding: "10px 14px", borderRadius: 10, width: "100%",
      background: "transparent", border: "1px dashed rgba(255,255,255,0.12)",
      color: "rgba(255,255,255,0.4)", fontSize: 13, cursor: "pointer",
    }}>
      + Adicionar produto
    </button>
  );

  return (
    <form action={createProduct}
      style={{
        display: "flex", flexDirection: "column", gap: 10,
        padding: 14, borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.04)",
      }}
    >
      <input type="hidden" name="category_id" value={categoryId} />

      <input name="name" placeholder="Nome do produto" required style={inputStyle} />

      <textarea name="description" placeholder="Descrição (opcional)"
        rows={2} style={{ ...inputStyle, resize: "vertical" }} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <input name="base_price" placeholder="Preço (ex: 29,90)"
          inputMode="decimal" style={inputStyle} />
        <select name="price_type" defaultValue="fixed"
          style={{ ...inputStyle, cursor: "pointer" }}>
          <option value="fixed">Preço fixo</option>
          <option value="variable">Preço variável</option>
        </select>
      </div>

      <input name="thumbnail_url" placeholder="URL da thumbnail" style={inputStyle} />
      <input name="video_url" placeholder="URL do vídeo" style={inputStyle} />

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" onClick={() => setOpen(false)} style={btnGhostStyle}>
          Cancelar
        </button>
        <button type="submit" style={btnPrimaryStyle}>Criar produto</button>
      </div>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "10px 14px", borderRadius: 10, width: "100%",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "#fff", fontSize: 14, outline: "none",
};
const btnPrimaryStyle: React.CSSProperties = {
  padding: "10px 18px", borderRadius: 10,
  background: "#fff", color: "#000",
  fontWeight: 800, fontSize: 13, cursor: "pointer", border: "none",
  whiteSpace: "nowrap",
};
const btnGhostStyle: React.CSSProperties = {
  padding: "10px 14px", borderRadius: 10,
  background: "transparent", color: "rgba(255,255,255,0.5)",
  fontWeight: 700, fontSize: 13, cursor: "pointer",
  border: "1px solid rgba(255,255,255,0.10)",
  whiteSpace: "nowrap",
};
const btnDangerStyle: React.CSSProperties = {
  padding: "10px 14px", borderRadius: 10,
  background: "transparent", color: "rgba(255,80,80,0.8)",
  fontWeight: 700, fontSize: 13, cursor: "pointer",
  border: "1px solid rgba(255,80,80,0.2)",
  whiteSpace: "nowrap",
};
