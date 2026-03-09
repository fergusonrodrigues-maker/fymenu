"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createCategory, updateCategory, deleteCategory,
  createProduct, updateProduct, deleteProduct,
  addUpsellItem, removeUpsellItem,
} from "../actions";
import UpsellSection from "./UpsellSection";
import { DescribeAIButton } from "../ia/DescribeAIButton";

type Category = { id: string; name: string; order_index: number | null };

type Product = {
  id: string; category_id: string; name: string;
  description: string | null; price_type: string;
  base_price: number | null; thumbnail_url: string | null;
  video_url: string | null; order_index: number | null;
};

type UpsellItem = {
  id: string;
  product_id: string;
  upsell_item_id: string;
  suggested_product_id: string;
  name: string;
  base_price: number | null;
  price_type: string;
};

const inputStyle: React.CSSProperties = {
  padding: "8px 12px", borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.05)",
  color: "#fff", fontSize: 13, width: "100%",
  boxSizing: "border-box",
};
const btnPrimaryStyle: React.CSSProperties = {
  padding: "8px 16px", borderRadius: 8, border: "none",
  background: "rgba(0,255,174,0.15)", color: "#00ffae",
  fontSize: 13, fontWeight: 700, cursor: "pointer",
};
const btnGhostStyle: React.CSSProperties = {
  padding: "8px 14px", borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "transparent", color: "rgba(255,255,255,0.5)",
  fontSize: 12, cursor: "pointer",
};
const btnDangerStyle: React.CSSProperties = {
  padding: "6px 12px", borderRadius: 8, border: "none",
  background: "rgba(255,80,80,0.12)", color: "#f87171",
  fontSize: 12, cursor: "pointer",
};

export default function CardapioClient({
  units, activeUnit, categories, products, upsellItems,
}: {
  units: any[]; activeUnit: any;
  categories: Category[]; products: Product[];
  upsellItems: UpsellItem[];
}) {
  const router = useRouter();
  const [expandedCat, setExpandedCat] = useState<string | null>(
    categories[0]?.id ?? null
  );

  const productsByCat = categories.reduce<Record<string, Product[]>>((acc, cat) => {
    acc[cat.id] = products.filter((p) => p.category_id === cat.id);
    return acc;
  }, {});

  const upsellsByProduct = upsellItems.reduce<Record<string, UpsellItem[]>>((acc, item) => {
    if (!acc[item.product_id]) acc[item.product_id] = [];
    acc[item.product_id].push(item);
    return acc;
  }, {});

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 900, margin: 0 }}>Cardápio</h1>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 4 }}>
            {activeUnit.name}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {units.length > 1 && (
            <select
              value={activeUnit.id}
              onChange={(e) => router.push(`/dashboard/cardapio?unit=${e.target.value}`)}
              style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", fontSize: 13, cursor: "pointer" }}
            >
              {units.map((u) => (
                <option key={u.id} value={u.id} style={{ background: "#1a1a1a" }}>{u.name}</option>
              ))}
            </select>
          )}
          {/* Botão Importar com IA */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); router.push("/dashboard/ia"); }}
            style={{ padding: "8px 14px", borderRadius: 10, background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#a5b4fc", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            ✨ Importar IA
          </button>
          <a href={`/u/${activeUnit.slug}`} target="_blank" rel="noreferrer"
            style={{ padding: "8px 14px", borderRadius: 10, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none" }}
          >Ver cardápio ↗</a>
        </div>
      </div>

      {/* Nova categoria */}
      <form action={createCategory} style={{ display: "flex", gap: 8 }}>
        <input type="hidden" name="unit_id" value={activeUnit.id} />
        <input name="name" placeholder="+ Nova categoria" required style={inputStyle} />
        <button type="submit" style={btnPrimaryStyle}>Criar</button>
      </form>

      {categories.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 0", color: "rgba(255,255,255,0.25)", fontSize: 14 }}>
          Nenhuma categoria ainda. Crie a primeira acima!
        </div>
      )}

      {categories.map((cat) => {
        const isOpen = expandedCat === cat.id;
        const catProducts = productsByCat[cat.id] ?? [];
        return (
          <div key={cat.id} style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", overflow: "hidden" }}>
            <div
              style={{ display: "flex", alignItems: "center", padding: "14px 16px", gap: 10, cursor: "pointer", borderBottom: isOpen ? "1px solid rgba(255,255,255,0.06)" : "none" }}
              onClick={() => setExpandedCat(isOpen ? null : cat.id)}
            >
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.2s", display: "inline-block" }}>▶</span>
              <form action={updateCategory} onClick={(e) => e.stopPropagation()} style={{ flex: 1, display: "flex", gap: 8 }}>
                <input type="hidden" name="id" value={cat.id} />
                <input name="name" defaultValue={cat.name} style={{ ...inputStyle, flex: 1, fontSize: 15, fontWeight: 800 }} />
                <button type="submit" style={btnGhostStyle}>Salvar</button>
              </form>
              <form action={deleteCategory} onClick={(e) => e.stopPropagation()} onSubmit={(e) => { if (!confirm("Excluir categoria e todos os produtos?")) e.preventDefault(); }}>
                <input type="hidden" name="id" value={cat.id} />
                <button type="submit" style={btnDangerStyle}>✕</button>
              </form>
            </div>

            {isOpen && (
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                {catProducts.length === 0 && (
                  <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 13 }}>Nenhum produto nesta categoria.</div>
                )}
                {catProducts.map((p) => (
                  <ProductRow
                    key={p.id}
                    product={p}
                    categoryName={cat.name}
                    upsellItems={(upsellsByProduct[p.id] ?? []).map((u) => ({
                      id: u.upsell_item_id,
                      product_id: u.suggested_product_id,
                      name: u.name,
                      base_price: u.base_price,
                      price_type: u.price_type,
                    }))}
                    allProducts={products.filter((other) => other.id !== p.id)}
                  />
                ))}
                <NewProductForm categoryId={cat.id} categoryName={cat.name} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ProductRow({
  product, categoryName, upsellItems, allProducts,
}: {
  product: Product;
  categoryName: string;
  upsellItems: { id: string; product_id: string; name: string; base_price: number | null; price_type: string }[];
  allProducts: Product[];
}) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState(product.description ?? "");

  return (
    <div style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "12px 14px", gap: 12, cursor: "pointer" }} onClick={() => setOpen((o) => !o)}>
        {product.thumbnail_url ? (
          <img src={product.thumbnail_url} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
        ) : (
          <div style={{ width: 44, height: 44, borderRadius: 8, flexShrink: 0, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🍽</div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{product.name}</div>
          <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>
            {product.price_type === "variable" ? "Preço variável" : product.base_price != null ? `R$ ${Number(product.base_price).toFixed(2).replace(".", ",")}` : "Sem preço"}
          </div>
        </div>
        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <div style={{ padding: "0 14px 14px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <form action={updateProduct} style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 12 }}>
            <input type="hidden" name="id" value={product.id} />
            <input name="name" defaultValue={product.name} placeholder="Nome" required style={inputStyle} />

            {/* Descrição com botão IA */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <DescribeAIButton
                  productName={product.name}
                  categoryName={categoryName}
                  currentDescription={description}
                  onGenerated={(d) => setDescription(d)}
                />
              </div>
              <textarea
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição (opcional)"
                rows={2}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input name="base_price" defaultValue={product.base_price != null ? String(product.base_price).replace(".", ",") : ""} placeholder="Preço (ex: 29,90)" inputMode="decimal" style={inputStyle} />
              <select name="price_type" defaultValue={product.price_type} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="fixed">Preço fixo</option>
                <option value="variable">Preço variável</option>
              </select>
            </div>
            <input name="thumbnail_url" defaultValue={product.thumbnail_url ?? ""} placeholder="URL da thumbnail" style={inputStyle} />
            <input name="video_url" defaultValue={product.video_url ?? ""} placeholder="URL do vídeo" style={inputStyle} />
            <button type="submit" style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "rgba(0,255,174,0.15)", color: "#00ffae", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Salvar</button>
          </form>

          <UpsellSection
            productId={product.id}
            upsellItems={upsellItems}
            allProducts={allProducts.map((p) => ({
              id: p.id, name: p.name,
              base_price: p.base_price, price_type: p.price_type,
            }))}
          />

          <form action={deleteProduct} style={{ marginTop: 12 }} onSubmit={(e) => { if (!confirm("Excluir produto?")) e.preventDefault(); }}>
            <input type="hidden" name="id" value={product.id} />
            <button type="submit" style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "rgba(255,80,80,0.12)", color: "#f87171", fontSize: 13, fontWeight: 700, cursor: "pointer", width: "100%" }}>Excluir produto</button>
          </form>
        </div>
      )}
    </div>
  );
}

function NewProductForm({ categoryId, categoryName }: { categoryId: string; categoryName: string }) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [name, setName] = useState("");

  if (!open) return (
    <button onClick={() => setOpen(true)} style={{ padding: "10px 14px", borderRadius: 10, width: "100%", background: "transparent", border: "1px dashed rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.4)", fontSize: 13, cursor: "pointer" }}>
      + Adicionar produto
    </button>
  );

  return (
    <form action={createProduct} style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)" }}>
      <input type="hidden" name="category_id" value={categoryId} />
      <input
        name="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome do produto"
        required
        style={inputStyle}
      />

      {/* Descrição com botão IA */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <DescribeAIButton
            productName={name}
            categoryName={categoryName}
            currentDescription={description}
            onGenerated={(d) => setDescription(d)}
          />
        </div>
        <textarea
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descrição (opcional)"
          rows={2}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <input name="base_price" placeholder="Preço (ex: 29,90)" inputMode="decimal" style={inputStyle} />
        <select name="price_type" defaultValue="fixed" style={{ ...inputStyle, cursor: "pointer" }}>
          <option value="fixed">Preço fixo</option>
          <option value="variable">Preço variável</option>
        </select>
      </div>
      <input name="thumbnail_url" placeholder="URL da thumbnail" style={inputStyle} />
      <input name="video_url" placeholder="URL do vídeo" style={inputStyle} />
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" onClick={() => setOpen(false)} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "rgba(255,255,255,0.5)", fontSize: 12, cursor: "pointer" }}>Cancelar</button>
        <button type="submit" style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "rgba(0,255,174,0.15)", color: "#00ffae", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Criar produto</button>
      </div>
    </form>
  );
}
