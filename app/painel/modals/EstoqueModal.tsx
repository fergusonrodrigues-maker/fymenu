"use client";
import { useState, useEffect, useRef } from "react";
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
  const [tab, setTab] = useState<"lista" | "alertas" | "movimentacoes" | "previsao">("lista");
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
  const [formExpiry, setFormExpiry] = useState("");
  const [formExpiryAlert, setFormExpiryAlert] = useState("7");

  // Recipe / forecast states
  const [recipes, setRecipes] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [purchaseAI, setPurchaseAI] = useState<string | null>(null);
  const [generatingPurchaseAI, setGeneratingPurchaseAI] = useState(false);

  // Import stock states
  const [showImportStock, setShowImportStock] = useState(false);
  const [importStockStep, setImportStockStep] = useState<"upload" | "processing" | "preview" | "done">("upload");
  const [importStockData, setImportStockData] = useState<any>(null);
  const [importingStock, setImportingStock] = useState(false);
  const [stockText, setStockText] = useState("");
  const stockFileRef = useRef<HTMLInputElement>(null);

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
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [{ data: inv }, { data: mov }, { data: rec }, { data: prods }, { data: orders }] = await Promise.all([
      supabase.from("inventory_items").select("*").eq("unit_id", unit.id).eq("is_active", true).order("name"),
      supabase.from("inventory_movements").select("*, inventory_items(name)").eq("unit_id", unit.id).order("created_at", { ascending: false }).limit(100),
      supabase.from("product_recipes").select("*, inventory_items(id, name, unit_measure, current_stock, cost_per_unit), products(id, name, base_price, is_active)").eq("unit_id", unit.id),
      supabase.from("products").select("id, name, base_price, category_id, is_active").eq("unit_id", unit.id).eq("is_active", true),
      supabase.from("order_intents").select("items, created_at").eq("unit_id", unit.id).eq("status", "confirmed").gte("created_at", thirtyDaysAgo),
    ]);
    if (inv) setItems(inv);
    if (mov) setMovements(mov);
    if (rec) setRecipes(rec);
    if (prods) setAllProducts(prods);
    if (orders) setRecentOrders(orders);
    setLoading(false);
  }

  const filtered = items.filter(i => {
    if (filterCategory !== "all" && i.category !== filterCategory) return false;
    if (searchQuery && !i.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const lowStockItems = items.filter(i => i.min_stock > 0 && i.current_stock <= i.min_stock);
  const expiryItems = items
    .map(item => ({ ...item, expiryStatus: getExpiryStatus(item) }))
    .filter(item => item.expiryStatus.priority <= 2)
    .sort((a, b) => a.expiryStatus.priority - b.expiryStatus.priority);
  const totalAlerts = lowStockItems.length + expiryItems.length;
  const totalStockValue = items.reduce((s, i) => s + (i.current_stock * (i.cost_per_unit || 0)), 0);

  function resetForm() {
    setFormName(""); setFormCategory("geral"); setFormUnit("kg");
    setFormStock(""); setFormMinStock(""); setFormCost(""); setFormSupplier("");
    setFormExpiry(""); setFormExpiryAlert("7");
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
    setFormExpiry(item.expiry_date || "");
    setFormExpiryAlert(String(item.expiry_alert_days || 7));
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
      expiry_date: formExpiry || null,
      expiry_alert_days: parseInt(formExpiryAlert) || 7,
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

  const isBusiness = restaurant?.plan === "business";

  function getExpiryStatus(item: any): { label: string; color: string; icon: string; priority: number } {
    if (!item.expiry_date) return { label: "", color: "", icon: "", priority: 99 };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(item.expiry_date);
    expiry.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const alertDays = item.expiry_alert_days || 7;
    if (diffDays < 0) {
      return { label: `Vencido há ${Math.abs(diffDays)}d`, color: "var(--dash-danger)", icon: "🔴", priority: 0 };
    } else if (diffDays === 0) {
      return { label: "Vence hoje!", color: "var(--dash-danger)", icon: "🔴", priority: 1 };
    } else if (diffDays <= alertDays) {
      return { label: `Vence em ${diffDays}d`, color: "var(--dash-warning)", icon: "🟡", priority: 2 };
    } else {
      return { label: `Válido (${diffDays}d)`, color: "var(--dash-accent)", icon: "🟢", priority: 3 };
    }
  }

  // ── Forecast calculations ────────────────────────────────────────────────────

  function calculateProductCapacity() {
    const recipesByProduct: Record<string, any[]> = {};
    for (const r of recipes) {
      if (!recipesByProduct[r.product_id]) recipesByProduct[r.product_id] = [];
      recipesByProduct[r.product_id].push(r);
    }
    const results: any[] = [];
    for (const [productId, productRecipes] of Object.entries(recipesByProduct)) {
      const product = allProducts.find(p => p.id === productId);
      if (!product || !product.is_active) continue;
      let minCapacity = Infinity;
      let bottleneck = "";
      const ingredientDetails: any[] = [];
      for (const r of productRecipes) {
        const item = r.inventory_items;
        if (!item || r.quantity <= 0) continue;
        const capacity = Math.floor(item.current_stock / r.quantity);
        const itemCost = r.quantity * (item.cost_per_unit || 0);
        ingredientDetails.push({ name: item.name, unitMeasure: item.unit_measure, currentStock: item.current_stock, quantityPerDish: r.quantity, capacity, costPerDish: itemCost });
        if (capacity < minCapacity) { minCapacity = capacity; bottleneck = item.name; }
      }
      if (minCapacity === Infinity) minCapacity = 0;
      const cmv = ingredientDetails.reduce((s, d) => s + d.costPerDish, 0);
      const basePrice = product.base_price || 0;
      const basePriceCents = basePrice > 500 ? basePrice : Math.round(basePrice * 100);
      const margin = basePriceCents - cmv;
      results.push({
        productId, productName: product.name, capacity: minCapacity, bottleneck,
        basePrice: basePriceCents, cmv: Math.round(cmv), margin: Math.round(margin),
        marginPercent: basePriceCents > 0 ? ((margin / basePriceCents) * 100).toFixed(1) : "0",
        potentialRevenue: minCapacity * basePriceCents,
        potentialProfit: minCapacity * Math.round(margin),
        ingredientDetails,
      });
    }
    return results.sort((a, b) => b.potentialProfit - a.potentialProfit);
  }

  function calculateDailyConsumption() {
    const productSales: Record<string, number> = {};
    for (const order of recentOrders) {
      const orderItems = Array.isArray(order.items) ? order.items : [];
      for (const item of orderItems) {
        const name = item.name || "";
        const matchedProduct = allProducts.find(p => p.name.toLowerCase() === name.toLowerCase());
        if (matchedProduct) {
          productSales[matchedProduct.id] = (productSales[matchedProduct.id] || 0) + (item.qty || 1);
        }
      }
    }
    const dailyConsumption: Record<string, { name: string; dailyUsage: number; unitMeasure: string; currentStock: number; daysRemaining: number }> = {};
    for (const r of recipes) {
      const item = r.inventory_items;
      if (!item) continue;
      const sales = productSales[r.product_id] || 0;
      const dailyUsage = (sales / 30) * r.quantity;
      if (!dailyConsumption[item.id]) {
        dailyConsumption[item.id] = { name: item.name, dailyUsage: 0, unitMeasure: item.unit_measure, currentStock: item.current_stock, daysRemaining: 0 };
      }
      dailyConsumption[item.id].dailyUsage += dailyUsage;
    }
    for (const dc of Object.values(dailyConsumption)) {
      dc.daysRemaining = dc.dailyUsage > 0 ? Math.floor(dc.currentStock / dc.dailyUsage) : 999;
    }
    return Object.values(dailyConsumption).sort((a, b) => a.daysRemaining - b.daysRemaining);
  }

  const productCapacity = calculateProductCapacity();
  const totalPotentialRevenue = productCapacity.reduce((s, p) => s + p.potentialRevenue, 0);
  const totalPotentialProfit = productCapacity.reduce((s, p) => s + p.potentialProfit, 0);
  const productsWithRecipe = productCapacity.length;
  const productsWithoutRecipe = allProducts.length - productsWithRecipe;
  const dailyConsumption = calculateDailyConsumption();

  async function handlePurchaseAI() {
    setGeneratingPurchaseAI(true);
    try {
      const res = await fetch("/api/ia/purchase-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lowStock: lowStockItems.map(i => ({ name: i.name, currentStock: i.current_stock, minStock: i.min_stock, unitMeasure: i.unit_measure, supplier: i.supplier })),
          dailyConsumption: dailyConsumption.filter(d => d.dailyUsage > 0),
          bottlenecks: productCapacity.filter(p => p.capacity < 20).slice(0, 10),
          totalStockValue: Math.round(totalStockValue),
        }),
      });
      const json = await res.json();
      if (res.ok) setPurchaseAI(json.suggestions);
    } catch (err) { console.error(err); }
    finally { setGeneratingPurchaseAI(false); }
  }

  // ── Stock import handlers ────────────────────────────────────────────────────

  async function handleStockFile(file: File | undefined) {
    if (!file) return;
    setImportStockStep("processing");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/ia/import-stock", { method: "POST", body: formData });
      const json = await res.json();
      if (res.ok && json.importData) { setImportStockData(json.importData); setImportStockStep("preview"); }
      else { alert(json.error || "Erro ao processar"); setImportStockStep("upload"); }
    } catch { alert("Erro de conexão"); setImportStockStep("upload"); }
  }

  async function handleStockText(text: string) {
    setImportStockStep("processing");
    const formData = new FormData();
    formData.append("text", text);
    try {
      const res = await fetch("/api/ia/import-stock", { method: "POST", body: formData });
      const json = await res.json();
      if (res.ok && json.importData) { setImportStockData(json.importData); setImportStockStep("preview"); }
      else { alert(json.error || "Erro ao processar"); setImportStockStep("upload"); }
    } catch { alert("Erro de conexão"); setImportStockStep("upload"); }
  }

  async function handleConfirmStockImport() {
    if (!importStockData?.items) return;
    setImportingStock(true);
    try {
      const inserts = importStockData.items.map((item: any) => ({
        unit_id: unit.id,
        name: item.name,
        category: item.category || "geral",
        unit_measure: item.unit_measure || "kg",
        current_stock: item.quantity || 0,
        min_stock: item.min_stock || 0,
        cost_per_unit: item.cost_per_unit ? Math.round(item.cost_per_unit * 100) : 0,
        supplier: item.supplier || null,
        last_purchase_date: new Date().toISOString().split("T")[0],
        is_active: true,
      }));

      const { error } = await supabase.from("inventory_items").insert(inserts);
      if (error) throw error;

      const { data: inserted } = await supabase
        .from("inventory_items")
        .select("id, current_stock, cost_per_unit")
        .eq("unit_id", unit.id)
        .order("created_at", { ascending: false })
        .limit(inserts.length);

      if (inserted) {
        const movInserts = inserted.map((inv: any) => ({
          inventory_item_id: inv.id,
          unit_id: unit.id,
          type: "purchase",
          quantity: inv.current_stock,
          cost_total: Math.round(inv.current_stock * (inv.cost_per_unit || 0)),
          notes: "Estoque inicial (importado via IA)",
        }));
        await supabase.from("inventory_movements").insert(movInserts);
      }

      setImportStockStep("done");
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar ingredientes");
    } finally {
      setImportingStock(false);
    }
  }

  // ── Tabs ────────────────────────────────────────────────────────────────────

  const TABS = [
    { key: "lista", label: "Ingredientes" },
    { key: "alertas", label: totalAlerts > 0 ? `Alertas (${totalAlerts})` : "Alertas" },
    { key: "movimentacoes", label: "Movimentações" },
    ...(isBusiness ? [{ key: "previsao", label: "Previsão" }] : []),
  ];

  const inputStyle: React.CSSProperties = {
    padding: "10px 14px", borderRadius: 10,
    background: "var(--dash-card-hover)", border: "1px solid var(--dash-border)",
    color: "var(--dash-text)", fontSize: 13, fontWeight: 500, outline: "none",
    transition: "border-color 0.2s",
  };

  return (
    <div>
      {/* ── IMPORT STOCK OVERLAY ── */}
      {showImportStock && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--dash-text)" }}>Importar estoque</div>
            <button onClick={() => { setShowImportStock(false); setImportStockStep("upload"); setImportStockData(null); setStockText(""); }} style={{
              width: 32, height: 32, borderRadius: 10, border: "none", cursor: "pointer",
              background: "rgba(220,38,38,0.12)", color: "#ffffff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 600, transition: "all 0.2s", flexShrink: 0,
            }}>✕</button>
          </div>

          {/* Upload */}
          {importStockStep === "upload" && (
            <>
              <div style={{ fontSize: 12, color: "var(--dash-text-muted)", marginBottom: 16 }}>
                Envie uma planilha de inventário, foto da lista de compras, ou cole o texto.
              </div>
              <div
                onClick={() => stockFileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--dash-accent)"; }}
                onDragLeave={(e) => { e.currentTarget.style.borderColor = "var(--dash-border)"; }}
                onDrop={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--dash-border)"; handleStockFile(e.dataTransfer.files[0]); }}
                style={{
                  border: "2px dashed var(--dash-border)", borderRadius: 16,
                  padding: "30px 20px", textAlign: "center", cursor: "pointer",
                  transition: "border-color 0.3s", marginBottom: 14,
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
                <div style={{ color: "var(--dash-text)", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Arraste o arquivo aqui</div>
                <div style={{ color: "var(--dash-text-muted)", fontSize: 11 }}>CSV, Excel, PDF, Foto (lista de compras)</div>
              </div>
              <input ref={stockFileRef} type="file" accept=".csv,.xlsx,.xls,.pdf,.jpg,.jpeg,.png,.webp,.txt" style={{ display: "none" }}
                onChange={(e) => handleStockFile(e.target.files?.[0])} />

              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0" }}>
                <div style={{ flex: 1, height: 1, background: "var(--dash-separator)" }} />
                <span style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>ou cole a lista</span>
                <div style={{ flex: 1, height: 1, background: "var(--dash-separator)" }} />
              </div>

              <textarea
                placeholder={"Cole aqui a lista de ingredientes, ex:\n\nCarne de sol - 10kg - R$ 95/kg - Frigorífico X\nQueijo mussarela - 5kg - R$ 42/kg\nArroz - 30kg - R$ 6/kg\nCoca-Cola lata - 48un - R$ 2,50/un"}
                value={stockText}
                onChange={(e) => setStockText(e.target.value)}
                style={{
                  width: "100%", minHeight: 100, padding: 14, borderRadius: 14,
                  background: "var(--dash-card-hover)", border: "1px solid var(--dash-border)", color: "var(--dash-text)",
                  fontSize: 12, outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.6, fontFamily: "inherit",
                  transition: "border-color 0.2s",
                }}
              />
              {stockText.trim() && (
                <button onClick={() => handleStockText(stockText)} style={{
                  marginTop: 10, width: "100%", padding: 12, borderRadius: 14,
                  background: "var(--dash-accent-soft)", border: "none", color: "var(--dash-accent)",
                  fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
                  boxShadow: "0 1px 0 rgba(0,255,174,0.12) inset, 0 -1px 0 rgba(0,0,0,0.2) inset",
                }}>✨ Analisar com IA</button>
              )}
            </>
          )}

          {/* Processing */}
          {importStockStep === "processing" && (
            <div style={{ textAlign: "center", padding: "50px 20px" }}>
              <div style={{ fontSize: 36, marginBottom: 12, animation: "pulse 1.5s infinite" }}>📦</div>
              <div style={{ color: "var(--dash-text)", fontSize: 15, fontWeight: 700 }}>Analisando inventário...</div>
              <div style={{ color: "var(--dash-text-muted)", fontSize: 12, marginTop: 6 }}>Extraindo ingredientes, quantidades e custos</div>
            </div>
          )}

          {/* Preview */}
          {importStockStep === "preview" && importStockData && (
            <>
              <div style={{ fontSize: 12, color: "var(--dash-text-muted)", marginBottom: 12 }}>
                {importStockData.items?.length} ingredientes encontrados. Revise antes de importar.
              </div>
              {importStockData.items?.map((item: any, i: number) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 10px",
                  borderRadius: 12, background: "var(--dash-card)", marginBottom: 4,
                }}>
                  <select value={item.category || "geral"} onChange={(e) => {
                    const u = { ...importStockData, items: [...importStockData.items] }; u.items[i] = { ...u.items[i], category: e.target.value }; setImportStockData(u);
                  }} style={{ padding: "4px 6px", borderRadius: 6, backgroundColor: "var(--dash-card-hover)", border: "none", color: "var(--dash-text)", fontSize: 10, outline: "none", width: 80, fontFamily: "inherit" }}>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                  </select>
                  <input value={item.name} onChange={(e) => {
                    const u = { ...importStockData, items: [...importStockData.items] }; u.items[i] = { ...u.items[i], name: e.target.value }; setImportStockData(u);
                  }} style={{ flex: 1, padding: "4px 8px", borderRadius: 6, background: "transparent", border: "none", color: "var(--dash-text)", fontSize: 12, fontWeight: 600, outline: "none", fontFamily: "inherit" }} />
                  <input type="number" step="0.01" value={item.quantity} onChange={(e) => {
                    const u = { ...importStockData, items: [...importStockData.items] }; u.items[i] = { ...u.items[i], quantity: parseFloat(e.target.value) || 0 }; setImportStockData(u);
                  }} style={{ width: 55, padding: "4px 6px", borderRadius: 6, background: "var(--dash-card-hover)", border: "none", color: "var(--dash-text)", fontSize: 11, outline: "none", textAlign: "right" as const }} />
                  <select value={item.unit_measure || "kg"} onChange={(e) => {
                    const u = { ...importStockData, items: [...importStockData.items] }; u.items[i] = { ...u.items[i], unit_measure: e.target.value }; setImportStockData(u);
                  }} style={{ padding: "4px 4px", borderRadius: 6, backgroundColor: "var(--dash-card-hover)", border: "none", color: "var(--dash-text)", fontSize: 10, outline: "none", width: 40, fontFamily: "inherit" }}>
                    {UNITS.map(u => <option key={u.value} value={u.value}>{u.value}</option>)}
                  </select>
                  <input type="number" step="0.01" value={item.cost_per_unit} onChange={(e) => {
                    const u = { ...importStockData, items: [...importStockData.items] }; u.items[i] = { ...u.items[i], cost_per_unit: parseFloat(e.target.value) || 0 }; setImportStockData(u);
                  }} placeholder="R$/un" style={{ width: 60, padding: "4px 6px", borderRadius: 6, background: "var(--dash-card-hover)", border: "none", color: "var(--dash-accent)", fontSize: 11, fontWeight: 600, outline: "none", textAlign: "right" as const }} />
                  <button onClick={() => {
                    const newItems = importStockData.items.filter((_: any, idx: number) => idx !== i);
                    setImportStockData({ ...importStockData, items: newItems });
                  }} style={{
                    width: 24, height: 24, borderRadius: 6, border: "none", cursor: "pointer",
                    background: "rgba(220,38,38,0.10)", color: "#ffffff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, transition: "all 0.2s",
                  }}>✕</button>
                </div>
              ))}
              <button onClick={handleConfirmStockImport} disabled={importingStock} style={{
                width: "100%", padding: 14, borderRadius: 14, marginTop: 14,
                background: "var(--dash-accent-soft)", border: "none", color: "var(--dash-accent)",
                fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
                boxShadow: "0 1px 0 rgba(0,255,174,0.12) inset, 0 -1px 0 rgba(0,0,0,0.2) inset",
                opacity: importingStock ? 0.5 : 1,
              }}>
                {importingStock ? "Salvando..." : `✅ Importar ${importStockData.items?.length} ingredientes`}
              </button>
            </>
          )}

          {/* Done */}
          {importStockStep === "done" && (
            <div style={{ textAlign: "center", padding: "50px 20px" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
              <div style={{ color: "var(--dash-text)", fontSize: 16, fontWeight: 800 }}>Estoque importado!</div>
              <div style={{ color: "var(--dash-text-muted)", fontSize: 12, marginTop: 6 }}>Ingredientes adicionados ao inventário.</div>
              <button onClick={() => { setShowImportStock(false); setImportStockStep("upload"); setImportStockData(null); setStockText(""); loadData(); }} style={{
                marginTop: 16, padding: "10px 20px", borderRadius: 12,
                background: "var(--dash-accent-soft)", border: "none", color: "var(--dash-accent)",
                fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              }}>Fechar</button>
            </div>
          )}
        </div>
      )}

      {/* ── NORMAL CONTENT (hidden during import) ── */}
      {!showImportStock && <>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
        <div style={{ padding: 14, borderRadius: 14, background: "var(--dash-card)", textAlign: "center", boxShadow: "var(--dash-shadow)" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: "var(--dash-text)" }}>{items.length}</div>
          <div style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>Ingredientes</div>
        </div>
        <div style={{ padding: 14, borderRadius: 14, background: totalAlerts > 0 ? "var(--dash-danger-soft)" : "var(--dash-card)", textAlign: "center", boxShadow: "var(--dash-shadow)" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: totalAlerts > 0 ? "var(--dash-danger)" : "var(--dash-text)" }}>{totalAlerts}</div>
          <div style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>Alertas</div>
          {expiryItems.filter(e => e.expiryStatus.priority === 0).length > 0 && (
            <div style={{ fontSize: 9, color: "var(--dash-danger)", fontWeight: 700, marginTop: 2 }}>
              {expiryItems.filter(e => e.expiryStatus.priority === 0).length} vencido(s)!
            </div>
          )}
        </div>
        <div style={{ padding: 14, borderRadius: 14, background: "var(--dash-card)", textAlign: "center", boxShadow: "var(--dash-shadow)" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--dash-text)" }}>{fmtBRL(Math.round(totalStockValue))}</div>
          <div style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>Valor em estoque</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "var(--dash-card-hover)", borderRadius: 12, padding: 4 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)} style={{
            flex: 1, padding: "8px 10px", borderRadius: 10, border: "none", cursor: "pointer",
            background: tab === t.key ? "var(--dash-accent-soft)" : "transparent",
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
              style={{ flex: 1, padding: "8px 12px", borderRadius: 10, background: "var(--dash-card-hover)", border: "1px solid var(--dash-border)", color: "var(--dash-text)", fontSize: 13, outline: "none", transition: "border-color 0.2s" }}
            />
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
              style={{ padding: "8px 10px", borderRadius: 10, backgroundColor: "var(--dash-card-hover)", border: "1px solid var(--dash-border)", color: "var(--dash-text)", fontSize: 12, outline: "none" }}>
              <option value="all">Todas</option>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
            </select>
            <button onClick={() => { resetForm(); setShowForm(true); }} style={{
              padding: "8px 14px", borderRadius: 10, border: "none", cursor: "pointer",
              background: "var(--dash-accent-soft)", color: "var(--dash-accent)", fontSize: 12, fontWeight: 700,
              boxShadow: "0 1px 0 rgba(0,255,174,0.12) inset, 0 -1px 0 rgba(0,0,0,0.2) inset", whiteSpace: "nowrap",
              fontFamily: "inherit",
            }}>+ Adicionar</button>
            <button onClick={() => { setShowImportStock(true); setImportStockStep("upload"); }} style={{
              padding: "8px 14px", borderRadius: 10, border: "none", cursor: "pointer",
              background: "var(--dash-card-hover)", color: "var(--dash-text-muted)", fontSize: 12,
              boxShadow: "var(--dash-shadow)",
              whiteSpace: "nowrap", fontFamily: "inherit",
            }}>📥 Importar</button>
          </div>

          {/* Inline form */}
          {showForm && (
            <div style={{ padding: 16, borderRadius: 14, background: "var(--dash-card)", marginBottom: 16, display: "flex", flexDirection: "column", gap: 10, boxShadow: "var(--dash-shadow)" }}>
              <input
                placeholder="Nome do ingrediente"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                autoFocus
                style={{ ...inputStyle, fontSize: 14 }}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <select value={formCategory} onChange={e => setFormCategory(e.target.value)} style={{ ...inputStyle, background: undefined as any, backgroundColor: "var(--dash-card-hover)" }}>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                </select>
                <select value={formUnit} onChange={e => setFormUnit(e.target.value)} style={{ ...inputStyle, background: undefined as any, backgroundColor: "var(--dash-card-hover)" }}>
                  {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <div>
                  <label style={{ fontSize: 10, color: "var(--dash-text-muted)", display: "block", marginBottom: 4 }}>Estoque atual</label>
                  <input type="number" step="0.01" placeholder="0" value={formStock} onChange={e => setFormStock(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 10, background: "var(--dash-card-hover)", border: "1px solid var(--dash-border)", color: "var(--dash-text)", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "var(--dash-text-muted)", display: "block", marginBottom: 4 }}>Estoque mínimo</label>
                  <input type="number" step="0.01" placeholder="0" value={formMinStock} onChange={e => setFormMinStock(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 10, background: "var(--dash-card-hover)", border: "1px solid var(--dash-border)", color: "var(--dash-text)", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "var(--dash-text-muted)", display: "block", marginBottom: 4 }}>Custo/{formUnit} (R$)</label>
                  <input type="number" step="0.01" placeholder="0.00" value={formCost} onChange={e => setFormCost(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 10, background: "var(--dash-card-hover)", border: "1px solid var(--dash-border)", color: "var(--dash-text)", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
              <input placeholder="Fornecedor (opcional)" value={formSupplier} onChange={e => setFormSupplier(e.target.value)} style={inputStyle} />
              {isBusiness && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <label style={{ fontSize: 10, color: "var(--dash-text-muted)", display: "block", marginBottom: 4 }}>Validade</label>
                    <input
                      type="date"
                      value={formExpiry}
                      onChange={(e) => setFormExpiry(e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 10, background: "var(--dash-card-hover)", border: "1px solid var(--dash-border)", color: "var(--dash-text)", fontSize: 12, outline: "none", boxSizing: "border-box" as const }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: "var(--dash-text-muted)", display: "block", marginBottom: 4 }}>Alertar X dias antes</label>
                    <input
                      type="number"
                      value={formExpiryAlert}
                      onChange={(e) => setFormExpiryAlert(e.target.value)}
                      placeholder="7"
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 10, background: "var(--dash-card-hover)", border: "1px solid var(--dash-border)", color: "var(--dash-text)", fontSize: 12, outline: "none", boxSizing: "border-box" as const }}
                    />
                  </div>
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={resetForm} style={{ flex: 1, padding: 10, borderRadius: 12, background: "var(--dash-card-hover)", border: "none", color: "var(--dash-text-muted)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
                <button onClick={handleSave} style={{ flex: 1, padding: 10, borderRadius: 12, background: "var(--dash-accent-soft)", border: "none", color: "var(--dash-accent)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 1px 0 rgba(0,255,174,0.08) inset, 0 -1px 0 rgba(0,0,0,0.15) inset" }}>
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
                      background: isLow ? "var(--dash-danger-soft)" : "var(--dash-card)",
                      boxShadow: isLow
                        ? "0 1px 0 rgba(248,113,113,0.06) inset, 0 -1px 0 rgba(0,0,0,0.15) inset"
                        : "0 1px 0 rgba(255,255,255,0.02) inset, 0 -1px 0 rgba(0,0,0,0.15) inset",
                    }}>
                      <span style={{ fontSize: 20 }}>{catInfo?.icon || "📋"}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center" }}>
                        <div style={{ color: "var(--dash-text)", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                        {(() => {
                          const expiry = getExpiryStatus(item);
                          if (!expiry.label) return null;
                          return (
                            <span style={{
                              padding: "2px 8px", borderRadius: 6, fontSize: 9, fontWeight: 700,
                              background: `${expiry.color}15`, color: expiry.color,
                              marginLeft: 6, whiteSpace: "nowrap" as const,
                            }}>{expiry.icon} {expiry.label}</span>
                          );
                        })()}
                      </div>
                        <div style={{ color: "var(--dash-text-muted)", fontSize: 11, marginTop: 2 }}>
                          {item.current_stock} {item.unit_measure}
                          {item.cost_per_unit > 0 && ` · ${fmtBRL(item.cost_per_unit)}/${item.unit_measure}`}
                          {item.supplier && ` · ${item.supplier}`}
                        </div>
                        {isLow && (
                          <div style={{ color: "var(--dash-danger)", fontSize: 10, fontWeight: 700, marginTop: 2 }}>
                            ⚠️ Estoque baixo (mín: {item.min_stock} {item.unit_measure})
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        <button onClick={() => { setShowMovement(showMovement === item.id ? null : item.id); setMovType("purchase"); setMovQty(""); setMovCost(""); setMovNotes(""); }} style={{
                          padding: "4px 8px", borderRadius: 6, background: "var(--dash-accent-soft)", border: "none",
                          color: "var(--dash-accent)", fontSize: 11, cursor: "pointer", fontWeight: 700, fontFamily: "inherit",
                        }}>±</button>
                        <button onClick={() => startEdit(item)} style={{
                          padding: "4px 8px", borderRadius: 6, background: "var(--dash-card-hover)", border: "none",
                          color: "var(--dash-text-muted)", fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                        }}>✏️</button>
                        <button onClick={() => handleDelete(item.id)} style={{
                          width: 24, height: 24, borderRadius: 6, border: "none", cursor: "pointer",
                          background: "rgba(220,38,38,0.10)", color: "#ffffff",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, transition: "all 0.2s",
                        }}>✕</button>
                      </div>
                    </div>

                    {/* Movement panel — expanded below item */}
                    {showMovement === item.id && (
                      <div style={{ padding: 14, borderRadius: "0 0 14px 14px", background: "var(--dash-card-hover)", marginTop: -4, display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--dash-text)" }}>Movimentação: {item.name}</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {[
                            { value: "purchase", label: "Compra", color: "var(--dash-accent)" },
                            { value: "usage", label: "Uso", color: "var(--dash-warning)" },
                            { value: "waste", label: "Perda", color: "var(--dash-danger)" },
                            { value: "adjustment", label: "Ajuste", color: "var(--dash-text-muted)" },
                          ].map(t => (
                            <button key={t.value} onClick={() => setMovType(t.value)} style={{
                              padding: "4px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                              background: movType === t.value ? "var(--dash-card-hover)" : "transparent",
                              color: movType === t.value ? t.color : "var(--dash-text-muted)",
                              fontSize: 11, fontWeight: 600, fontFamily: "inherit",
                            }}>{t.label}</button>
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <input type="number" step="0.01" placeholder={`Qtd (${item.unit_measure})`} value={movQty} onChange={e => setMovQty(e.target.value)}
                            style={{ flex: 1, padding: "8px 10px", borderRadius: 10, background: "var(--dash-card-hover)", border: "1px solid var(--dash-border)", color: "var(--dash-text)", fontSize: 13, outline: "none" }} />
                          {movType === "purchase" && (
                            <input type="number" step="0.01" placeholder="Custo total (R$)" value={movCost} onChange={e => setMovCost(e.target.value)}
                              style={{ flex: 1, padding: "8px 10px", borderRadius: 10, background: "var(--dash-card-hover)", border: "1px solid var(--dash-border)", color: "var(--dash-text)", fontSize: 13, outline: "none" }} />
                          )}
                        </div>
                        <input placeholder="Observação (opcional)" value={movNotes} onChange={e => setMovNotes(e.target.value)}
                          style={{ padding: "8px 10px", borderRadius: 10, background: "var(--dash-card-hover)", border: "1px solid var(--dash-border)", color: "var(--dash-text)", fontSize: 12, outline: "none" }} />
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => { setShowMovement(null); setMovQty(""); setMovCost(""); setMovNotes(""); }} style={{ flex: 1, padding: 8, borderRadius: 10, background: "var(--dash-card-hover)", border: "none", color: "var(--dash-text-muted)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
                          <button onClick={() => handleMovement(item.id)} style={{ flex: 1, padding: 8, borderRadius: 10, background: "var(--dash-accent-soft)", border: "none", color: "var(--dash-accent)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 1px 0 rgba(0,255,174,0.08) inset, 0 -1px 0 rgba(0,0,0,0.15) inset" }}>Registrar</button>
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
          {/* Seção Validade */}
          {expiryItems.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dash-text)", marginBottom: 10 }}>
                🗓️ Validade ({expiryItems.length})
              </div>
              {expiryItems.map(item => {
                const catInfo = CATEGORIES.find(c => c.value === item.category);
                return (
                  <div key={item.id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "12px 14px", borderRadius: 14, marginBottom: 6,
                    background: item.expiryStatus.priority === 0 ? "var(--dash-danger-soft)"
                      : item.expiryStatus.priority === 1 ? "var(--dash-danger-soft)"
                      : "var(--dash-warning-soft)",
                    boxShadow: `0 1px 0 ${item.expiryStatus.color}10 inset, 0 -1px 0 rgba(0,0,0,0.15) inset`,
                  }}>
                    <span style={{ fontSize: 20 }}>{catInfo?.icon || "📋"}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "var(--dash-text)", fontSize: 13, fontWeight: 600 }}>{item.name}</div>
                      <div style={{ color: item.expiryStatus.color, fontSize: 12, fontWeight: 700, marginTop: 2 }}>
                        {item.expiryStatus.icon} {item.expiryStatus.label}
                      </div>
                      <div style={{ color: "var(--dash-text-muted)", fontSize: 10, marginTop: 2 }}>
                        Validade: {new Date(item.expiry_date).toLocaleDateString("pt-BR")}
                        {item.current_stock > 0 && ` · ${item.current_stock} ${item.unit_measure} em estoque`}
                      </div>
                    </div>
                    {item.expiryStatus.priority === 0 && (
                      <button onClick={() => handleDelete(item.id)} style={{
                        padding: "6px 12px", borderRadius: 8,
                        background: "var(--dash-danger-soft)", border: "none",
                        color: "var(--dash-danger)", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                      }}>Descartar</button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Separador */}
          {expiryItems.length > 0 && lowStockItems.length > 0 && (
            <div style={{ height: 1, background: "var(--dash-separator)", margin: "16px 0" }} />
          )}

          {/* Seção Estoque Baixo */}
          {lowStockItems.length > 0 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dash-text)", marginBottom: 10 }}>
                📦 Estoque baixo ({lowStockItems.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {lowStockItems.map(item => {
                  const catInfo = CATEGORIES.find(c => c.value === item.category);
                  return (
                    <div key={item.id} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "14px 16px", borderRadius: 14,
                      background: "var(--dash-danger-soft)",
                      boxShadow: "0 1px 0 rgba(248,113,113,0.06) inset, 0 -1px 0 rgba(0,0,0,0.15) inset",
                    }}>
                      <span style={{ fontSize: 20 }}>{catInfo?.icon || "📋"}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: "var(--dash-text)", fontSize: 14, fontWeight: 600 }}>{item.name}</div>
                        <div style={{ color: "var(--dash-danger)", fontSize: 12, marginTop: 2 }}>
                          Atual: {item.current_stock} {item.unit_measure} · Mínimo: {item.min_stock} {item.unit_measure}
                        </div>
                        {item.supplier && (
                          <div style={{ color: "var(--dash-text-muted)", fontSize: 11, marginTop: 2 }}>Fornecedor: {item.supplier}</div>
                        )}
                      </div>
                      <button onClick={() => { setShowMovement(item.id); setMovType("purchase"); setTab("lista"); }} style={{
                        padding: "6px 12px", borderRadius: 8, background: "var(--dash-accent-soft)", border: "none",
                        color: "var(--dash-accent)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                      }}>Repor</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tudo ok */}
          {expiryItems.length === 0 && lowStockItems.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: "var(--dash-text-muted)" }}>
              ✅ Tudo em ordem! Nenhum alerta no momento.
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
                  padding: "10px 14px", borderRadius: 12, background: "var(--dash-card)",
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

      {/* ── TAB PREVISÃO ── */}
      {tab === "previsao" && (
        <div>
          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
            <div style={{ padding: 14, borderRadius: 14, background: "var(--dash-accent-soft)", boxShadow: "0 1px 0 rgba(0,255,174,0.08) inset, 0 -1px 0 rgba(0,0,0,0.15) inset", textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--dash-accent)" }}>{fmtBRL(totalPotentialRevenue)}</div>
              <div style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>Faturamento potencial</div>
            </div>
            <div style={{ padding: 14, borderRadius: 14, background: "var(--dash-accent-soft)", boxShadow: "var(--dash-shadow)", textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--dash-accent)" }}>{fmtBRL(totalPotentialProfit)}</div>
              <div style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>Lucro bruto potencial</div>
            </div>
          </div>

          {productsWithoutRecipe > 0 && (
            <div style={{ padding: 10, borderRadius: 10, background: "var(--dash-warning-soft)", marginBottom: 16, fontSize: 11, color: "var(--dash-warning)" }}>
              ⚠️ {productsWithoutRecipe} produto{productsWithoutRecipe > 1 ? "s" : ""} sem ficha técnica — adicione ingredientes no Cardápio pra previsão completa.
            </div>
          )}

          {/* Capacidade por produto */}
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dash-text)", marginBottom: 10 }}>Capacidade por produto</div>

          {productCapacity.length === 0 ? (
            <div style={{ textAlign: "center", padding: 30, color: "var(--dash-text-muted)", fontSize: 12 }}>
              Nenhum produto com ficha técnica. Vincule ingredientes aos produtos no Cardápio.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {productCapacity.map(p => (
                <div key={p.productId} style={{
                  padding: "12px 14px", borderRadius: 14, background: "var(--dash-card)",
                  boxShadow: "var(--dash-shadow)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ color: "var(--dash-text)", fontSize: 13, fontWeight: 700 }}>{p.productName}</div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "var(--dash-accent)" }}>{p.capacity} un</div>
                  </div>
                  <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--dash-text-muted)" }}>
                    <span>Preço: {fmtBRL(p.basePrice)}</span>
                    <span>CMV: {fmtBRL(p.cmv)}</span>
                    <span style={{ color: parseFloat(p.marginPercent) >= 60 ? "var(--dash-accent)" : parseFloat(p.marginPercent) >= 30 ? "var(--dash-warning)" : "var(--dash-danger)" }}>
                      Margem: {p.marginPercent}%
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: "var(--dash-text-muted)", marginTop: 4 }}>
                    Faturamento: {fmtBRL(p.potentialRevenue)} · Lucro: {fmtBRL(p.potentialProfit)}
                  </div>
                  {p.bottleneck && (
                    <div style={{ fontSize: 10, color: "var(--dash-warning)", marginTop: 3 }}>
                      ⚠️ Gargalo: {p.bottleneck} (limita produção)
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Previsão de ruptura */}
          {dailyConsumption.filter(d => d.dailyUsage > 0).length > 0 && (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dash-text)", marginBottom: 10 }}>Previsão de ruptura</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 20 }}>
                {dailyConsumption.filter(d => d.dailyUsage > 0).map((d, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                    borderRadius: 10, background: d.daysRemaining <= 3 ? "var(--dash-danger-soft)" : d.daysRemaining <= 7 ? "var(--dash-warning-soft)" : "var(--dash-card)",
                  }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 12, color: "var(--dash-text)", fontWeight: 600 }}>{d.name}</span>
                      <span style={{ fontSize: 10, color: "var(--dash-text-muted)", marginLeft: 6 }}>
                        {d.currentStock.toFixed(1)} {d.unitMeasure} · ~{d.dailyUsage.toFixed(2)}/{d.unitMeasure}/dia
                      </span>
                    </div>
                    <div style={{
                      padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                      background: d.daysRemaining <= 3 ? "var(--dash-danger-soft)" : d.daysRemaining <= 7 ? "var(--dash-warning-soft)" : "var(--dash-accent-soft)",
                      color: d.daysRemaining <= 3 ? "var(--dash-danger)" : d.daysRemaining <= 7 ? "var(--dash-warning)" : "var(--dash-accent)",
                    }}>
                      {d.daysRemaining >= 999 ? "∞" : `${d.daysRemaining}d`}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Sugestão IA de compras */}
          <div style={{ padding: 16, borderRadius: 14, background: "var(--dash-card)", boxShadow: "var(--dash-shadow)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dash-text)", marginBottom: 4 }}>Sugestão de compras com IA</div>
            <div style={{ fontSize: 11, color: "var(--dash-text-muted)", marginBottom: 14 }}>
              Baseada no estoque atual, consumo médio e margens.
            </div>
            {!purchaseAI ? (
              <button onClick={handlePurchaseAI} disabled={generatingPurchaseAI} style={{
                width: "100%", padding: 14, borderRadius: 14, border: "none", cursor: "pointer",
                background: "var(--dash-accent-soft)", color: "var(--dash-accent)", fontSize: 14, fontWeight: 800,
                boxShadow: "0 1px 0 rgba(0,255,174,0.12) inset, 0 -1px 0 rgba(0,0,0,0.2) inset",
                opacity: generatingPurchaseAI ? 0.5 : 1, fontFamily: "inherit",
              }}>
                {generatingPurchaseAI ? "Analisando..." : "✨ Gerar sugestão de compras"}
              </button>
            ) : (
              <>
                <div style={{ whiteSpace: "pre-wrap", fontSize: 13, color: "var(--dash-text-secondary)", lineHeight: 1.7 }}>
                  {purchaseAI}
                </div>
                <button onClick={() => setPurchaseAI(null)} style={{
                  marginTop: 10, padding: "6px 14px", borderRadius: 8, background: "var(--dash-card-hover)",
                  border: "none", color: "var(--dash-text-muted)", fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                }}>🔄 Gerar novamente</button>
              </>
            )}
          </div>
        </div>
      )}

      </>}
    </div>
  );
}
