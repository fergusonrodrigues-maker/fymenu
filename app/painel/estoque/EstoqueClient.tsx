"use client";

import { useState, useTransition } from "react";
import { adjustStock, updateProductStock } from "../actions";

type StockProduct = {
  id: string;
  name: string;
  thumbnail_url: string | null;
  stock: number | null;
  stock_minimum: number | null;
  unlimited: boolean | null;
  sku: string | null;
  category_name: string;
};

type Props = {
  unitId: string;
  unitName: string;
  products: StockProduct[];
};

const inp: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.05)",
  color: "#fff", fontSize: 14, boxSizing: "border-box",
  outline: "none", fontFamily: "inherit",
};

function StockStatus({ product }: { product: StockProduct }) {
  if (product.unlimited !== false) return <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>Ilimitado</span>;
  const stock = product.stock ?? 0;
  const min = product.stock_minimum ?? 10;
  if (stock === 0) return <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "rgba(248,113,113,0.15)", color: "#f87171", fontWeight: 700 }}>Esgotado</span>;
  if (stock <= min) return <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "rgba(251,191,36,0.15)", color: "#fbbf24", fontWeight: 700 }}>Baixo · {stock}</span>;
  return <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "rgba(0,255,174,0.10)", color: "#00ffae", fontWeight: 700 }}>{stock} un.</span>;
}

function AdjustModal({ product, unitId, onClose }: { product: StockProduct; unitId: string; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("manual");
  const [notes, setNotes] = useState("");

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)", display: "flex", alignItems: "flex-end" }} onClick={onClose}>
      <div style={{ width: "100%", maxWidth: 480, margin: "0 auto", background: "linear-gradient(180deg, #161616 0%, #111 100%)", borderRadius: "24px 24px 0 0", border: "1px solid rgba(255,255,255,0.08)", padding: "20px 24px 40px" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)" }} />
        </div>
        <div style={{ color: "#fff", fontSize: 17, fontWeight: 800, marginBottom: 4 }}>Ajustar estoque</div>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginBottom: 20 }}>{product.name}</div>

        <form
          action={async (fd) => {
            startTransition(async () => {
              await adjustStock(fd);
              onClose();
            });
          }}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <input type="hidden" name="product_id" value={product.id} />
          <input type="hidden" name="unit_id" value={unitId} />

          <div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>Quantidade (use negativo para retirada)</div>
            <input type="number" name="quantity_change" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Ex: +10 ou -5" required style={inp} />
          </div>

          <div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>Motivo</div>
            <select name="reason" value={reason} onChange={(e) => setReason(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
              <option value="manual">Ajuste manual</option>
              <option value="compra">Compra / Recebimento</option>
              <option value="venda">Venda</option>
              <option value="perda">Perda / Desperdício</option>
              <option value="inventario">Inventário</option>
              <option value="correcao">Correção</option>
            </select>
          </div>

          <div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>Observações (opcional)</div>
            <input name="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex: NF 1234, fornecedor X..." style={inp} />
          </div>

          <button type="submit" disabled={isPending || !qty} style={{ padding: "14px", borderRadius: 14, border: "none", background: "rgba(0,255,174,0.15)", color: "#00ffae", fontSize: 15, fontWeight: 700, cursor: isPending || !qty ? "not-allowed" : "pointer", opacity: isPending || !qty ? 0.5 : 1, marginTop: 4 }}>
            {isPending ? "Salvando…" : "Confirmar ajuste"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function EstoqueClient({ unitId, unitName, products }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");
  const [adjusting, setAdjusting] = useState<StockProduct | null>(null);

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku ?? "").toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filter === "all") return true;
    if (filter === "out") return p.unlimited === false && (p.stock ?? 0) === 0;
    if (filter === "low") return p.unlimited === false && (p.stock ?? 0) > 0 && (p.stock ?? 0) <= (p.stock_minimum ?? 10);
    return true;
  });

  const outCount = products.filter((p) => p.unlimited === false && (p.stock ?? 0) === 0).length;
  const lowCount = products.filter((p) => p.unlimited === false && (p.stock ?? 0) > 0 && (p.stock ?? 0) <= (p.stock_minimum ?? 10)).length;

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,255,174,0.07) 0%, transparent 60%), #0a0a0a", fontFamily: "-apple-system, 'SF Pro Display', BlinkMacSystemFont, sans-serif", color: "#fff" }}>
      <style>{`* { box-sizing: border-box; } input::placeholder { color: rgba(255,255,255,0.25); }`}</style>

      {/* Header */}
      <div style={{ padding: "56px 24px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <a href="/painel" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: 18 }}>←</a>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#fff", fontSize: 18, fontWeight: 800, letterSpacing: "-0.5px" }}>Estoque</div>
          <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>{unitName}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {outCount > 0 && <div style={{ padding: "6px 10px", borderRadius: 8, background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171", fontSize: 12, fontWeight: 700 }}>{outCount} esgotado{outCount !== 1 ? "s" : ""}</div>}
          {lowCount > 0 && <div style={{ padding: "6px 10px", borderRadius: 8, background: "rgba(251,191,36,0.10)", border: "1px solid rgba(251,191,36,0.2)", color: "#fbbf24", fontSize: 12, fontWeight: 700 }}>{lowCount} baixo{lowCount !== 1 ? "s" : ""}</div>}
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "20px 16px 80px", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Search */}
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Buscar produto ou SKU..." style={inp} />

        {/* Filters */}
        <div style={{ display: "flex", gap: 8 }}>
          {([["all", "Todos"], ["low", "Estoque baixo"], ["out", "Esgotados"]] as const).map(([v, label]) => (
            <button key={v} onClick={() => setFilter(v)} style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: filter === v ? "rgba(0,255,174,0.15)" : "rgba(255,255,255,0.05)", color: filter === v ? "#00ffae" : "rgba(255,255,255,0.4)" }}>
              {label}
            </button>
          ))}
        </div>

        {/* Product list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ color: "#fff", fontSize: 14, fontWeight: 700, padding: "2px 0" }}>{filtered.length} produto{filtered.length !== 1 ? "s" : ""}</div>
          {filtered.length === 0 && (
            <div style={{ borderRadius: 16, padding: "32px", textAlign: "center", background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.25)", fontSize: 14 }}>Nenhum produto encontrado.</div>
          )}
          {filtered.map((p) => (
            <div key={p.id} style={{ borderRadius: 14, padding: "14px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: "rgba(255,255,255,0.06)", flexShrink: 0, overflow: "hidden" }}>
                {p.thumbnail_url && <img src={p.thumbnail_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: "#fff", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>{p.category_name}</span>
                  {p.sku && <><span>·</span><span>SKU: {p.sku}</span></>}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <StockStatus product={p} />
                {p.unlimited === false && (
                  <button onClick={() => setAdjusting(p)} style={{ padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}>
                    Ajustar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={{ borderRadius: 14, padding: "14px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>📦 Configure os limites de estoque em cada produto no Cardápio</div>
        </div>
      </div>

      {adjusting && <AdjustModal product={adjusting} unitId={unitId} onClose={() => setAdjusting(null)} />}
    </div>
  );
}
