"use client";

import { useState, useTransition } from "react";
import { addUpsellItem, removeUpsellItem } from "../actions";

type UpsellProduct = {
  id: string;
  name: string;
  base_price: number | null;
  price_type: string;
};

type UpsellItem = {
  id: string; // id do upsell_item row
  product_id: string;
  name: string;
  base_price: number | null;
  price_type: string;
};

interface UpsellSectionProps {
  productId: string;
  upsellItems: UpsellItem[];
  allProducts: UpsellProduct[]; // todos os produtos da unidade exceto o próprio
}

const inputStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.05)",
  color: "#fff",
  fontSize: 13,
  width: "100%",
  boxSizing: "border-box",
};

const btnStyle: React.CSSProperties = {
  padding: "7px 14px",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 700,
};

export default function UpsellSection({
  productId,
  upsellItems,
  allProducts,
}: UpsellSectionProps) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [isPending, startTransition] = useTransition();

  const MAX = 3;
  const canAdd = upsellItems.length < MAX;

  // Produtos que ainda não estão na lista de upsell
  const available = allProducts.filter(
    (p) => p.id !== productId && !upsellItems.some((u) => u.product_id === p.id)
  );

  function handleAdd() {
    if (!selectedId || !canAdd) return;
    const fd = new FormData();
    fd.set("product_id", productId);
    fd.set("upsell_product_id", selectedId);
    startTransition(() => {
      addUpsellItem(fd).then(() => setSelectedId(""));
    });
  }

  function handleRemove(itemId: string) {
    const fd = new FormData();
    fd.set("id", itemId);
    startTransition(() => { removeUpsellItem(fd); });
  }

  return (
    <div style={{
      marginTop: 12,
      borderTop: "1px solid rgba(255,255,255,0.06)",
      paddingTop: 12,
    }}>
      {/* Toggle */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          ...btnStyle,
          background: "rgba(255,255,255,0.06)",
          color: "rgba(255,255,255,0.6)",
          width: "100%",
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>⚡ Upsell ({upsellItems.length}/{MAX})</span>
        <span style={{ fontSize: 10 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Itens atuais */}
          {upsellItems.length === 0 && (
            <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 12 }}>
              Nenhuma sugestão configurada.
            </div>
          )}

          {upsellItems.map((item) => (
            <div key={item.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 10px", borderRadius: 8,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}>
              <div>
                <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>
                  {item.name}
                </span>
                <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginLeft: 8 }}>
                  {item.price_type === "variable"
                    ? "variável"
                    : item.base_price != null
                    ? `R$${Number(item.base_price).toFixed(2).replace(".", ",")}`
                    : "—"}
                </span>
              </div>
              <button
                onClick={() => handleRemove(item.id)}
                disabled={isPending}
                style={{ ...btnStyle, background: "rgba(255,80,80,0.15)", color: "#f87171", padding: "4px 10px" }}
              >
                ✕
              </button>
            </div>
          ))}

          {/* Adicionar novo */}
          {canAdd && available.length > 0 && (
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                style={{ ...inputStyle, flex: 1, cursor: "pointer" }}
              >
                <option value="">Selecionar produto...</option>
                {available.map((p) => (
                  <option key={p.id} value={p.id} style={{ background: "#1a1a1a" }}>
                    {p.name}
                    {p.base_price != null
                      ? ` — R$${Number(p.base_price).toFixed(2).replace(".", ",")}`
                      : ""}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAdd}
                disabled={!selectedId || isPending}
                style={{
                  ...btnStyle,
                  background: selectedId ? "rgba(0,255,174,0.15)" : "rgba(255,255,255,0.05)",
                  color: selectedId ? "#00ffae" : "rgba(255,255,255,0.3)",
                  whiteSpace: "nowrap",
                }}
              >
                + Adicionar
              </button>
            </div>
          )}

          {!canAdd && (
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>
              Máximo de {MAX} sugestões atingido.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
