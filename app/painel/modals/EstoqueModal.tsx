"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

const CATEGORIES = [
  { value: "proteinas", label: "Proteínas", icon: "🥩" },
  { value: "hortifruti", label: "Hortifruti", icon: "🥬" },
  { value: "laticinios", label: "Laticínios", icon: "🧀" },
  { value: "graos", label: "Grãos", icon: "🌾" },
  { value: "bebidas", label: "Bebidas", icon: "🥤" },
  { value: "temperos", label: "Temperos", icon: "🧂" },
  { value: "embalagens", label: "Embalagens", icon: "📦" },
  { value: "limpeza", label: "Limpeza", icon: "🧹" },
  { value: "geral", label: "Geral", icon: "📋" },
];

const UNITS = [
  { value: "kg", label: "Quilogramas (kg)" },
  { value: "g", label: "Gramas (g)" },
  { value: "l", label: "Litros (l)" },
  { value: "ml", label: "Mililitros (ml)" },
  { value: "un", label: "Unidades (un)" },
  { value: "cx", label: "Caixas (cx)" },
  { value: "pct", label: "Pacotes (pct)" },
  { value: "dz", label: "Dúzias (dz)" },
];

function fmtBRL(v: number) {
  return `R$ ${(v / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

export default function EstoqueModal({ unit, restaurant }: { unit: any; restaurant: any }) {
  const [tab, setTab] = useState<"lista" | "alertas" | "movimentacoes">("lista");
  const [items, setItems] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("geral");
  const [formUnit, setFormUnit] = useState("kg");
  const [formStock, setFormStock] = useState("");
  const [formMinStock, setFormMinStock] = useState("");
  const [formCost, setFormCost] = useState("");
  const [formSupplier, setFormSupplier] = useState("");

  // Movement form
  const [showMovement, setShowMovement] = useState<string | null>(null);
  const [movType, setMovType] = useState<string>("purchase");
  const [movQty, setMovQty] = useState("");
  const [movCost, setMovCost] = useState("");
  const [movNotes, setMovNotes] = useState("");

  useEffect(() => { loadData(); }, [unit?.id]);

  async function loadData() {
    if (!unit?.id) return;
    setLoading(true);
    const [{ data: inv }, { data: mov }] = await Promise.all([
      supabase.from("inventory_items").select("*").eq("unit_id", unit.id).eq("is_active", true).order("name"),
      supabase.from("inventory_movements").select("*, inventory_items(name)").eq("unit_id", unit.id).order("created_at", { ascending: false }).limit(100),
    ]);
    if (inv) setItems(inv);
    if (mov) setMovements(mov);
    setLoading(false);
  }

  const filtered = items.filter(i => {
    if (filterCategory !== "all" && i.category !== filterCategory) return false;
    if (searchQuery && !i.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const lowStockItems = items.filter(i => i.min_stock > 0 && i.current_stock <= i.min_stock);
  const totalStockValue = items.reduce((s, i) => s + (i.current_stock * (i.cost_per_unit || 0)), 0);

  function resetForm() {
    setFormName(""); setFormCategory("geral"); setFormUnit("kg");
    setFormStock(""); setFormMinStock(""); setFormCost(""); setFormSupplier("");
    setEditingItem(null); setShowForm(false);
  }

  function startEdit(item: any) {
    setFormName(item.name);
    setFormCategory(item.category);
    setFormUnit(item.unit_measure);
    setFormStock(String(item.current_stock));
    setFormMinStock(String(item.min_stock || ""));
    setFormCost(item.cost_per_unit ? String(item.cost_per_unit / 100) : "");
    setFormSupplier(item.supplier || "");
    setEditingItem(item);
    setShowForm(true);
  }

  async function handleSave() {
    if (!formName.trim() || !unit?.id) return;
    const payload = {
      unit_id: unit.id,
      name: formName.trim(),
      category: formCategory,
      unit_measure: formUnit,
      current_stock: parseFloat(formStock) || 0,
      min_stock: parseFloat(formMinStock) || 0,
      cost_per_unit: formCost ? Math.round(parseFloat(formCost) * 100) : 0,
      supplier: formSupplier.trim() || null,
      updated_at: new Date().toISOString(),
    };
    if (editingItem) {
      await supabase.from("inventory_items").update(payload).eq("id", editingItem.id);
    } else {
      await supabase.from("inventory_items").insert({ ...payload, is_active: true });
    }
    resetForm();
    loadData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este ingrediente?")) return;
    await supabase.from("inventory_items").update({ is_active: false }).eq("id", id);
    loadData();
  }

  async function handleMovement(itemId: string) {
    if (!movQty || !unit?.id) return;
    const qty = parseFloat(movQty);
    const actualQty = (movType === "purchase" || movType === "return" || movType === "adjustment")
      ? Math.abs(qty)
      : -Math.abs(qty);

    await supabase.from("inventory_movements").insert({
      inventory_item_id: itemId,
      unit_id: unit.id,
      type: movType,
      quantity: actualQty,
      cost_total: movCost ? Math.round(parseFloat(movCost) * 100) : 0,
      notes: movNotes || null,
    });

    const item = items.find(i => i.id === itemId);
    if (item) {
      const newStock = Math.max(0, (item.current_stock || 0) + actualQty);
      await supabase.from("inventory_items").update({
        current_stock: newStock,
        updated_at: new Date().toISOString(),
        ...(movType === "purchase" ? { last_purchase_date: new Date().toISOString().split("T")[0] } : {}),
      }).eq("id", itemId);
    }

    setShowMovement(null);
    setMovType("purchase"); setMovQty(""); setMovCost(""); setMovNotes("");
    loadData();
  }

  const inputStyle: React.CSSProperties = {
    padding: "10px 14px", borderRadius: 12,
    background: "rgba(255,255,255,0.04)", border: "none",
    color: "var(--dash-text)", fontSize: 13, outline: "none",
  };

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
        <div style={{ padding: 14, borderRadius: 14, background: "rgba(255,255,255,0.03)", textAlign: "center", boxShadow: "0 1px 0 rgba(255,255,255,0.02) inset, 0 -1px 0 rgba(0,0,0,0.15) inset" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: "var(--dash-text)" }}>{items.length}</div>
          <div style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>Ingredientes</div>
        </div>
        <div style={{ padding: 14, borderRadius: 14, background: lowStockItems.length > 0 ? "rgba(248,113,113,0.06)" : "rgba(255,255,255,0.03)", textAlign: "center", boxShadow: "0 1px 0 rgba(255,255,255,0.02) inset, 0 -1px 0 rgba(0,0,0,0.15) inset" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: lowStockItems.length > 0 ? "#f87171" : "var(--dash-text)" }}>{lowStockItems.length}</div>
          <div style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>Estoque baixo</div>
        </div>
        <div style={{ padding: 14, borderRadius: 14, background: "rgba(255,255,255,0.03)", textAlign: "center", boxShadow: "0 1px 0 rgba(255,255,255,0.02) inset, 0 -1px 0 rgba(0,0,0,0.15) inset" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--dash-text)" }}>{fmtBRL(Math.round(totalStockValue))}</div>
          <div style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>Valor em estoque</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 4 }}>
        {[
          { key: "lista", label: "Ingredientes" },
          { key: "alertas", label: lowStockItems.length > 0 ? `Alertas (${lowStockItems.length})` : "Alertas" },
          { key: "movimentacoes", label: "Movimentações" },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)} style={{
            flex: 1, padding: "8px 10px", borderRadius: 10, border: "none", cursor: "pointer",
            background: tab === t.key ? "rgba(0,255,174,0.1)" : "transparent",
            color: tab === t.key ? "var(--dash-accent)" : "var(--dash-text-muted)",
            fontSize: 12, fontWeight: 600, transition: "all 0.2s", fontFamily: "inherit",
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── TAB LISTA ── */}
      {tab === "lista" && (
        <div>
          {/* Search + filter + add */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input
              placeholder="Buscar ingrediente..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ flex: 1, padding: "8px 12px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "none", color: "var(--dash-text)", fontSize: 13, outline: "none" }}
            />
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
              style={{ padding: "8px 10px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "none", color: "var(--dash-text)", fontSize: 12, outline: "none" }}>
              <option value="all">Todas</option>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
            </select>
            <button onClick={() => { resetForm(); setShowForm(true); }} style={{
              padding: "8px 14px", borderRadius: 10, border: "none", cursor: "pointer",
              background: "rgba(0,255,174,0.1)", color: "var(--dash-accent)", fontSize: 12, fontWeight: 700,
              boxShadow: "0 1px 0 rgba(0,255,174,0.12) inset, 0 -1px 0 rgba(0,0,0,0.2) inset", whiteSpace: "nowrap",
              fontFamily: "inherit",
            }}>+ Adicionar</button>
          </div>

          {/* Inline form */}
          {showForm && (
            <div style={{ padding: 16, borderRadius: 14, background: "rgba(255,255,255,0.03)", marginBottom: 16, display: "flex", flexDirection: "column", gap: 10, boxShadow: "0 1px 0 rgba(255,255,255,0.02) inset, 0 -1px 0 rgba(0,0,0,0.15) inset" }}>
              <input
                placeholder="Nome do ingrediente"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                autoFocus
                style={{ ...inputStyle, fontSize: 14 }}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <select value={formCategory} onChange={e => setFormCategory(e.target.value)} style={inputStyle}>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                </select>
                <select value={formUnit} onChange={e => setFormUnit(e.target.value)} style={inputStyle}>
                  {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <div>
                  <label style={{ fontSize: 10, color: "var(--dash-text-muted)", display: "block", marginBottom: 4 }}>Estoque atual</label>
                  <input type="number" step="0.01" placeholder="0" value={formStock} onChange={e => setFormStock(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "none", color: "var(--dash-text)", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "var(--dash-text-muted)", display: "block", marginBottom: 4 }}>Estoque mínimo</label>
                  <input type="number" step="0.01" placeholder="0" value={formMinStock} onChange={e => setFormMinStock(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "none", color: "var(--dash-text)", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "var(--dash-text-muted)", display: "block", marginBottom: 4 }}>Custo/{formUnit} (R$)</label>
                  <input type="number" step="0.01" placeholder="0.00" value={formCost} onChange={e => setFormCost(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "none", color: "var(--dash-text)", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
              <input placeholder="Fornecedor (opcional)" value={formSupplier} onChange={e => setFormSupplier(e.target.value)} style={inputStyle} />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={resetForm} style={{ flex: 1, padding: 10, borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "none", color: "var(--dash-text-muted)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
                <button onClick={handleSave} style={{ flex: 1, padding: 10, borderRadius: 12, background: "rgba(0,255,174,0.1)", border: "none", color: "var(--dash-accent)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  {editingItem ? "Atualizar" : "Salvar"}
                </button>
              </div>
            </div>
          )}

          {/* Items list */}
          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--dash-text-muted)" }}>Carregando...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--dash-text-muted)" }}>
              {items.length === 0 ? "Nenhum ingrediente cadastrado. Clique em + Adicionar." : "Nenhum resultado para o filtro."}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {filtered.map(item => {
                const isLow = item.min_stock > 0 && item.current_stock <= item.min_stock;
                const catInfo = CATEGORIES.find(c => c.value === item.category);
                return (
                  <div key={item.id}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "12px 14px", borderRadius: 14,
                      background: isLow ? "rgba(248,113,113,0.04)" : "rgba(255,255,255,0.03)",
                      boxShadow: isLow
                        ? "0 1px 0 rgba(248,113,113,0.06) inset, 0 -1px 0 rgba(0,0,0,0.15) inset"
                        : "0 1px 0 rgba(255,255,255,0.02) inset, 0 -1px 0 rgba(0,0,0,0.15) inset",
                    }}>
                      <span style={{ fontSize: 20 }}>{catInfo?.icon || "📋"}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: "var(--dash-text)", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                        <div style={{ color: "var(--dash-text-muted)", fontSize: 11, marginTop: 2 }}>
                          {item.current_stock} {item.unit_measure}
                          {item.cost_per_unit > 0 && ` · ${fmtBRL(item.cost_per_unit)}/${item.unit_measure}`}
                          {item.supplier && ` · ${item.supplier}`}
                        </div>
                        {isLow && (
                          <div style={{ color: "#f87171", fontSize: 10, fontWeight: 700, marginTop: 2 }}>
                            ⚠️ Estoque baixo (mín: {item.min_stock} {item.unit_measure})
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        <button onClick={() => { setShowMovement(showMovement === item.id ? null : item.id); setMovType("purchase"); setMovQty(""); setMovCost(""); setMovNotes(""); }} style={{
                          padding: "4px 8px", borderRadius: 6, background: "rgba(0,255,174,0.08)", border: "none",
                          color: "var(--dash-accent)", fontSize: 11, cursor: "pointer", fontWeight: 700, fontFamily: "inherit",
                        }}>±</button>
                        <button onClick={() => startEdit(item)} style={{
                          padding: "4px 8px", borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "none",
                          color: "var(--dash-text-muted)", fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                        }}>✏️</button>
                        <button onClick={() => handleDelete(item.id)} style={{
                          padding: "4px 8px", borderRadius: 6, background: "rgba(248,113,113,0.06)", border: "none",
                          color: "rgba(248,113,113,0.6)", fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                        }}>✕</button>
                      </div>
                    </div>

                    {/* Movement panel — expanded below item */}
                    {showMovement === item.id && (
                      <div style={{ padding: 14, borderRadius: "0 0 14px 14px", background: "rgba(255,255,255,0.04)", marginTop: -4, display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--dash-text)" }}>Movimentação: {item.name}</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {[
                            { value: "purchase", label: "Compra", color: "var(--dash-accent)" },
                            { value: "usage", label: "Uso", color: "#fbbf24" },
                            { value: "waste", label: "Perda", color: "#f87171" },
                            { value: "adjustment", label: "Ajuste", color: "var(--dash-text-muted)" },
                          ].map(t => (
                            <button key={t.value} onClick={() => setMovType(t.value)} style={{
                              padding: "4px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                              background: movType === t.value ? "rgba(255,255,255,0.08)" : "transparent",
                              color: movType === t.value ? t.color : "var(--dash-text-muted)",
                              fontSize: 11, fontWeight: 600, fontFamily: "inherit",
                            }}>{t.label}</button>
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <input type="number" step="0.01" placeholder={`Qtd (${item.unit_measure})`} value={movQty} onChange={e => setMovQty(e.target.value)}
                            style={{ flex: 1, padding: "8px 10px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "none", color: "var(--dash-text)", fontSize: 13, outline: "none" }} />
                          {movType === "purchase" && (
                            <input type="number" step="0.01" placeholder="Custo total (R$)" value={movCost} onChange={e => setMovCost(e.target.value)}
                              style={{ flex: 1, padding: "8px 10px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "none", color: "var(--dash-text)", fontSize: 13, outline: "none" }} />
                          )}
                        </div>
                        <input placeholder="Observação (opcional)" value={movNotes} onChange={e => setMovNotes(e.target.value)}
                          style={{ padding: "8px 10px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "none", color: "var(--dash-text)", fontSize: 12, outline: "none" }} />
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => { setShowMovement(null); setMovQty(""); setMovCost(""); setMovNotes(""); }} style={{ flex: 1, padding: 8, borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "none", color: "var(--dash-text-muted)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
                          <button onClick={() => handleMovement(item.id)} style={{ flex: 1, padding: 8, borderRadius: 10, background: "rgba(0,255,174,0.1)", border: "none", color: "var(--dash-accent)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Registrar</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB ALERTAS ── */}
      {tab === "alertas" && (
        <div>
          {lowStockItems.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--dash-text-muted)" }}>
              ✅ Tudo em ordem! Nenhum ingrediente com estoque baixo.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {lowStockItems.map(item => {
                const catInfo = CATEGORIES.find(c => c.value === item.category);
                return (
                  <div key={item.id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "14px 16px", borderRadius: 14,
                    background: "rgba(248,113,113,0.04)",
                    boxShadow: "0 1px 0 rgba(248,113,113,0.06) inset, 0 -1px 0 rgba(0,0,0,0.15) inset",
                  }}>
                    <span style={{ fontSize: 20 }}>{catInfo?.icon || "📋"}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "var(--dash-text)", fontSize: 14, fontWeight: 600 }}>{item.name}</div>
                      <div style={{ color: "#f87171", fontSize: 12, marginTop: 2 }}>
                        Atual: {item.current_stock} {item.unit_measure} · Mínimo: {item.min_stock} {item.unit_measure}
                      </div>
                      {item.supplier && (
                        <div style={{ color: "var(--dash-text-muted)", fontSize: 11, marginTop: 2 }}>Fornecedor: {item.supplier}</div>
                      )}
                    </div>
                    <button onClick={() => { setShowMovement(item.id); setMovType("purchase"); setTab("lista"); }} style={{
                      padding: "6px 12px", borderRadius: 8, background: "rgba(0,255,174,0.1)", border: "none",
                      color: "var(--dash-accent)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                    }}>Repor</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB MOVIMENTAÇÕES ── */}
      {tab === "movimentacoes" && (
        <div>
          {movements.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--dash-text-muted)" }}>Nenhuma movimentação registrada.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {movements.map(m => (
                <div key={m.id} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.02)",
                }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>
                    {m.type === "purchase" ? "📥" : m.type === "usage" ? "📤" : m.type === "waste" ? "🗑️" : "🔄"}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: "var(--dash-text)", fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.inventory_items?.name || "?"} · {m.quantity > 0 ? "+" : ""}{m.quantity}
                    </div>
                    <div style={{ color: "var(--dash-text-muted)", fontSize: 10 }}>
                      {new Date(m.created_at).toLocaleDateString("pt-BR")} {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      {m.notes && ` · ${m.notes}`}
                    </div>
                  </div>
                  {m.cost_total > 0 && (
                    <span style={{ color: "var(--dash-text-muted)", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{fmtBRL(m.cost_total)}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
