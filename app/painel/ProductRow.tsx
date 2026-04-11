"use client";

import { useState, useRef, useTransition, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateProduct, deleteProduct, updateProductStock, updateProductNutrition, updateProductVariations } from "./actions";
import { useGenerateProductDescription } from "@/lib/hooks/useGenerateProductDescription";
import { uploadMedia } from "@/lib/upload";

type Product = {
  id: string;
  name: string;
  description?: string | null;
  description_source?: "MANUAL" | "AI_GENERATED" | "HYBRID" | null;
  base_price?: number | null;
  price_type?: string | null;
  thumbnail_url?: string | null;
  video_url?: string | null;
  stock?: number | null;
  stock_minimum?: number | null;
  unlimited?: boolean | null;
  sku?: string | null;
  allergens?: string[] | null;
  nutrition?: { calories: number | null; protein: number | null; fat: number | null; carbs: number | null } | null;
  preparation_time?: number | null;
  is_age_restricted?: boolean | null;
  is_alcoholic?: boolean | null;
  is_active?: boolean | null;
};


function getSectionConfig(sectionValue: string | undefined, customSections?: Array<{ name: string; allows_video: boolean; allows_alcoholic_toggle: boolean }>) {
  const defaults: Record<string, { allows_video: boolean; allows_alcoholic: boolean }> = {
    pratos: { allows_video: true, allows_alcoholic: false },
    drinks: { allows_video: true, allows_alcoholic: true },
    bebidas: { allows_video: false, allows_alcoholic: true },
  };
  if (!sectionValue) return { allows_video: true, allows_alcoholic: false };
  if (defaults[sectionValue]) return defaults[sectionValue];
  const custom = customSections?.find(cs => cs.name.toLowerCase().replace(/\s+/g, "_") === sectionValue);
  if (custom) return { allows_video: custom.allows_video, allows_alcoholic: custom.allows_alcoholic_toggle };
  return { allows_video: true, allows_alcoholic: false };
}

function StockBadge({ product }: { product: Product }) {
  if (product.unlimited !== false) return null;
  const stock = product.stock ?? 0;
  const min = product.stock_minimum ?? 10;
  if (stock === 0) return <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 6, background: "rgba(248,113,113,0.15)", color: "#f87171", fontWeight: 700 }}>Sem estoque</span>;
  if (stock <= min) return <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 6, background: "rgba(251,191,36,0.15)", color: "#fbbf24", fontWeight: 700 }}>{stock} restantes</span>;
  return <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 6, background: "rgba(0,255,174,0.10)", color: "#00ffae", fontWeight: 700 }}>{stock} em estoque</span>;
}

function RecipeSection({ productId, unitId, basePrice }: { productId: string; unitId: string; basePrice: number }) {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedItem, setSelectedItem] = useState("");
  const [quantity, setQuantity] = useState("");

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const [{ data: rec }, { data: inv }] = await Promise.all([
        supabase.from("product_recipes").select("*, inventory_items(id, name, unit_measure, cost_per_unit, category)").eq("product_id", productId),
        supabase.from("inventory_items").select("id, name, unit_measure, cost_per_unit, category").eq("unit_id", unitId).eq("is_active", true).order("name"),
      ]);
      if (rec) setRecipes(rec);
      if (inv) setInventoryItems(inv);
      setLoading(false);
    }
    load();
  }, [productId, unitId]);

  const cmv = recipes.reduce((total, r) => {
    const costPerUnit = r.inventory_items?.cost_per_unit || 0;
    return total + (r.quantity * costPerUnit);
  }, 0);

  const margin = basePrice > 0 ? basePrice - cmv : 0;
  const marginPercent = basePrice > 0 ? ((margin / basePrice) * 100).toFixed(1) : "0";

  async function handleAddRecipe() {
    if (!selectedItem || !quantity) return;
    const { error } = await supabase.from("product_recipes").insert({
      product_id: productId,
      inventory_item_id: selectedItem,
      quantity: parseFloat(quantity),
    });
    if (error) {
      if (error.code === "23505") alert("Ingrediente já adicionado a este produto.");
      else console.error(error);
      return;
    }
    const { data } = await supabase.from("product_recipes").select("*, inventory_items(id, name, unit_measure, cost_per_unit, category)").eq("product_id", productId);
    if (data) setRecipes(data);
    setSelectedItem(""); setQuantity(""); setShowAdd(false);
  }

  async function handleRemoveRecipe(recipeId: string) {
    await supabase.from("product_recipes").delete().eq("id", recipeId);
    setRecipes(prev => prev.filter(r => r.id !== recipeId));
  }

  async function handleUpdateQuantity(recipeId: string, newQty: string) {
    const qty = parseFloat(newQty);
    if (isNaN(qty) || qty <= 0) return;
    await supabase.from("product_recipes").update({ quantity: qty }).eq("id", recipeId);
    setRecipes(prev => prev.map(r => r.id === recipeId ? { ...r, quantity: qty } : r));
  }

  function fmtBRL(v: number) { return `R$ ${(v / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`; }

  if (loading) return <div style={{ color: "var(--dash-text-muted)", fontSize: 12, padding: "10px 0" }}>Carregando ficha técnica...</div>;

  const usedIds = recipes.map(r => r.inventory_item_id);
  const available = inventoryItems.filter(i => !usedIds.includes(i.id));

  return (
    <div style={{ marginTop: 16, padding: 14, borderRadius: 14, background: "rgba(255,255,255,0.02)", boxShadow: "0 1px 0 rgba(255,255,255,0.02) inset, 0 -1px 0 rgba(0,0,0,0.1) inset" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--dash-text)" }}>📋 Ficha Técnica</div>
        <button onClick={() => setShowAdd(!showAdd)} style={{
          padding: "4px 10px", borderRadius: 8, border: "none", cursor: "pointer",
          background: "rgba(0,255,174,0.08)", color: "var(--dash-accent)", fontSize: 10, fontWeight: 600,
        }}>+ Ingrediente</button>
      </div>

      {recipes.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 12 }}>
          <div style={{ padding: "8px 10px", borderRadius: 10, background: "rgba(248,113,113,0.06)", textAlign: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#f87171" }}>{fmtBRL(Math.round(cmv))}</div>
            <div style={{ fontSize: 9, color: "var(--dash-text-muted)" }}>CMV</div>
          </div>
          <div style={{ padding: "8px 10px", borderRadius: 10, background: "rgba(0,255,174,0.06)", textAlign: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--dash-accent)" }}>{fmtBRL(Math.round(margin))}</div>
            <div style={{ fontSize: 9, color: "var(--dash-text-muted)" }}>Margem</div>
          </div>
          <div style={{ padding: "8px 10px", borderRadius: 10, background: "rgba(255,255,255,0.04)", textAlign: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: parseFloat(marginPercent) >= 60 ? "var(--dash-accent)" : parseFloat(marginPercent) >= 30 ? "#fbbf24" : "#f87171" }}>
              {marginPercent}%
            </div>
            <div style={{ fontSize: 9, color: "var(--dash-text-muted)" }}>Margem %</div>
          </div>
        </div>
      )}

      {showAdd && (
        <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
          <select value={selectedItem} onChange={e => setSelectedItem(e.target.value)}
            style={{ flex: 2, minWidth: 120, padding: "8px 10px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "none", color: "var(--dash-text)", fontSize: 12, outline: "none" }}>
            <option value="">Selecionar ingrediente...</option>
            {available.map(i => (
              <option key={i.id} value={i.id}>{i.name} ({i.unit_measure})</option>
            ))}
          </select>
          <input type="number" step="0.001" placeholder="Qtd" value={quantity} onChange={e => setQuantity(e.target.value)}
            style={{ width: 70, padding: "8px 10px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "none", color: "var(--dash-text)", fontSize: 12, outline: "none" }} />
          <button onClick={handleAddRecipe} disabled={!selectedItem || !quantity} style={{
            padding: "8px 12px", borderRadius: 10, border: "none", cursor: "pointer",
            background: "rgba(0,255,174,0.1)", color: "var(--dash-accent)", fontSize: 11, fontWeight: 700,
            opacity: !selectedItem || !quantity ? 0.4 : 1,
          }}>✓</button>
          <button onClick={() => setShowAdd(false)} style={{
            padding: "8px 10px", borderRadius: 10, border: "none", cursor: "pointer",
            background: "rgba(255,255,255,0.04)", color: "var(--dash-text-muted)", fontSize: 11,
          }}>✕</button>
        </div>
      )}

      {inventoryItems.length === 0 && (
        <div style={{ fontSize: 11, color: "var(--dash-text-muted)", padding: "8px 0" }}>
          Nenhum ingrediente cadastrado. Adicione ingredientes no módulo de Estoque primeiro.
        </div>
      )}

      {recipes.length === 0 && inventoryItems.length > 0 ? (
        <div style={{ fontSize: 11, color: "var(--dash-text-muted)", padding: "8px 0" }}>
          Nenhum ingrediente vinculado. Adicione pra calcular o CMV automaticamente.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {recipes.map(r => {
            const item = r.inventory_items;
            const itemCost = (r.quantity * (item?.cost_per_unit || 0));
            return (
              <div key={r.id} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
                borderRadius: 10, background: "rgba(255,255,255,0.02)",
              }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 12, color: "var(--dash-text)", fontWeight: 600 }}>{item?.name || "?"}</span>
                </div>
                <input
                  type="number" step="0.001"
                  defaultValue={r.quantity}
                  onBlur={(e) => handleUpdateQuantity(r.id, e.target.value)}
                  style={{ width: 60, padding: "3px 6px", borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "none", color: "var(--dash-text)", fontSize: 11, outline: "none", textAlign: "center" }}
                />
                <span style={{ fontSize: 10, color: "var(--dash-text-muted)", width: 24 }}>{item?.unit_measure}</span>
                <span style={{ fontSize: 11, color: "#f87171", fontWeight: 600, width: 60, textAlign: "right" }}>{fmtBRL(Math.round(itemCost))}</span>
                <button onClick={() => handleRemoveRecipe(r.id)} style={{
                  background: "transparent", border: "none", color: "rgba(255,255,255,0.15)", fontSize: 12, cursor: "pointer",
                }}>✕</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ProductRow({
  product,
  expanded,
  onToggle,
  onClose,
  section,
  customSections,
  unitId,
  hasRecipeFeature,
}: {
  product: Product;
  expanded: boolean;
  onToggle: () => void;
  onClose: () => void;
  section?: string;
  customSections?: Array<{ id: string; name: string; allows_video: boolean; allows_alcoholic_toggle: boolean }>;
  unitId?: string;
  hasRecipeFeature?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"info" | "estoque" | "nutricao">("info");
  const [thumbnailUrl, setThumbnailUrl] = useState(product.thumbnail_url ?? "");
  const [videoUrl, setVideoUrl] = useState(product.video_url ?? "");
  const [priceType, setPriceType] = useState(product.price_type ?? "fixed");
  const [variations, setVariations] = useState<{ id?: string; name: string; price: number }[]>([]);
  const [variationsLoaded, setVariationsLoaded] = useState(false);
  const [description, setDescription] = useState(product.description ?? "");
  const [descriptionSource, setDescriptionSource] = useState<"MANUAL" | "AI_GENERATED" | "HYBRID">(product.description_source ?? "MANUAL");
  const [productName, setProductName] = useState(product.name);

  const { generate: generateDescription, loading: loadingAI } = useGenerateProductDescription({
    onSuccess: (desc, source) => {
      setDescription(desc);
      setDescriptionSource(source);
    },
    onError: (err) => console.error("Error generating description:", err),
  });
  const [isAlcoholic, setIsAlcoholic] = useState(product.is_alcoholic ?? false);
  const [isActive, setIsActive] = useState(product.is_active !== false);
  const sectionConfig = getSectionConfig(section, customSections);
  const [uploading, setUploading] = useState<"thumb" | "video" | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [unlimitedStock, setUnlimitedStock] = useState(product.unlimited !== false);
  const thumbRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [nutValues, setNutValues] = useState({
    calories: String(product.nutrition?.calories ?? ""),
    protein: String(product.nutrition?.protein ?? ""),
    carbs: String(product.nutrition?.carbs ?? ""),
    fat: String(product.nutrition?.fat ?? ""),
  });
  const [nutLoading, setNutLoading] = useState(false);

  const supabase = createClient();

  // Load variations when expanded and price type is variable
  useEffect(() => {
    if (!expanded || priceType !== "variable" || variationsLoaded) return;
    supabase
      .from("product_variations")
      .select("id, name, price, order_index")
      .eq("product_id", product.id)
      .order("order_index", { ascending: true })
      .then(({ data }) => {
        if (data) setVariations(data.map((v) => ({ id: v.id, name: v.name, price: v.price })));
        setVariationsLoaded(true);
      });
  }, [expanded, priceType, variationsLoaded, product.id]);

  async function handleFileUpload(file: File, type: "thumb" | "video"): Promise<string | null> {
    setUploading(type);
    setUploadError(null);
    const url = await uploadMedia(file, product.id, type);
    if (!url) { setUploadError("Erro ao enviar arquivo. Tente novamente."); }
    setUploading(null);
    return url;
  }

  return (
    <div className="modal-neon-card" style={{ borderRadius: 12, marginBottom: 8, overflow: "hidden", background: "rgba(255,255,255,0.03)" }}>
      {/* Header row */}
      <div onClick={onToggle} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer" }}>
        <div style={{ width: 44, height: 44, borderRadius: 8, background: "rgba(255,255,255,0.06)", flexShrink: 0, overflow: "hidden" }}>
          {thumbnailUrl && <img src={thumbnailUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{product.name}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
            {product.price_type === "variable" ? "Preço variável" : product.base_price ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(product.base_price / 100) : "Sem preço"}
            <StockBadge product={product} />
          </div>
        </div>
        <label className="switch-toggle" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isActive}
            onChange={async (e) => {
              const newActive = e.target.checked;
              setIsActive(newActive);
              const { error } = await supabase
                .from("products")
                .update({ is_active: newActive })
                .eq("id", product.id);
              if (error) {
                console.error("Toggle active error:", error);
                setIsActive(!newActive);
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
        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 14, flexShrink: 0 }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {/* Expanded */}
      {expanded && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 0, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {(["info", "estoque", "nutricao"] as const).map((t) => (
              <button key={t} onClick={() => setActiveTab(t)} style={{ flex: 1, padding: "10px 0", background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: activeTab === t ? 700 : 500, color: activeTab === t ? "#00ffae" : "rgba(255,255,255,0.4)", borderBottom: activeTab === t ? "2px solid #00ffae" : "2px solid transparent" }}>
                {t === "info" ? "Info" : t === "estoque" ? "Estoque" : "Nutrição"}
              </button>
            ))}
          </div>

          {/* Tab: Info */}
          {activeTab === "info" && (
            <>
            <form
              action={async (formData) => {
                formData.set("thumbnail_url", thumbnailUrl);
                formData.set("video_url", videoUrl);
                formData.set("is_alcoholic", isAlcoholic ? "on" : "off");
                // Always sync variations: passes [] when fixed to delete stale variation rows
                await updateProductVariations(product.id, priceType === "variable" ? variations : []);
                startTransition(() => updateProduct(formData));
                onClose();
              }}
              style={{ padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}
            >
              <input type="hidden" name="id" value={product.id} />
              <input name="name" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Nome do produto" style={inputStyle} />
              <input type="hidden" name="description_source" value={descriptionSource} />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <textarea
                  name="description"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setDescriptionSource("MANUAL");
                  }}
                  placeholder="Descrição (opcional)"
                  rows={3}
                  maxLength={150}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {descriptionSource && (
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)" }}>
                        {descriptionSource === "AI_GENERATED" ? "✨ IA" : descriptionSource === "HYBRID" ? "🔄 Híbrida" : "✏️ Manual"}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{description.length}/150</span>
                </div>
                <button
                  type="button"
                  onClick={() => generateDescription(thumbnailUrl, productName, "Geral", descriptionSource === "MANUAL" ? description : undefined)}
                  disabled={loadingAI || !thumbnailUrl}
                  style={{
                    padding: "8px 0",
                    background: loadingAI || !thumbnailUrl ? "rgba(255,255,255,0.04)" : "rgba(139,92,246,0.15)",
                    color: loadingAI || !thumbnailUrl ? "rgba(255,255,255,0.25)" : "#a78bfa",
                    border: `1px solid ${loadingAI || !thumbnailUrl ? "rgba(255,255,255,0.08)" : "rgba(139,92,246,0.3)"}`,
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: loadingAI || !thumbnailUrl ? "not-allowed" : "pointer",
                  }}
                >
                  {loadingAI ? "Gerando..." : "✨ Gerar descrição com IA"}
                </button>
                {!thumbnailUrl && (
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", margin: 0 }}>Adicione uma foto para gerar descrição com IA</p>
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <select
                  name="price_type"
                  value={priceType}
                  onChange={(e) => { setPriceType(e.target.value); setVariationsLoaded(false); }}
                  style={{ ...inputStyle, flex: 1 }}
                >
                  <option value="fixed">Preço fixo</option>
                  <option value="variable">Preço variável</option>
                </select>
                {priceType === "fixed" && (
                  <input name="base_price" type="text" inputMode="decimal" defaultValue={product.base_price != null ? (product.base_price / 100).toFixed(2).replace(".", ",") : ""} placeholder="R$ 0,00" style={{ ...inputStyle, flex: 1 }} />
                )}
              </div>

              {/* Variations section */}
              {priceType === "variable" && (
                <div style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: 2 }}>Variações de preço</div>
                  {variations.map((v, i) => (
                    <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input
                        placeholder="Nome (ex: P, M, G)"
                        value={v.name}
                        onChange={(e) => setVariations(variations.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                        style={{ ...inputStyle, flex: 2, fontSize: 13 }}
                      />
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="R$ 0,00"
                        value={v.price ? (v.price / 100).toFixed(2).replace(".", ",") : ""}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^\d,]/g, "");
                          const normalized = raw.replace(",", ".");
                          const cents = Math.round(parseFloat(normalized) * 100) || 0;
                          setVariations(variations.map((x, j) => j === i ? { ...x, price: cents } : x));
                        }}
                        style={{ ...inputStyle, flex: 1, fontSize: 13 }}
                      />
                      <button
                        type="button"
                        onClick={() => setVariations(variations.filter((_, j) => j !== i))}
                        style={{ padding: "8px 10px", background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 700, flexShrink: 0 }}
                      >✕</button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setVariations([...variations, { name: "", price: 0 }])}
                    style={{ padding: "8px 0", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                  >+ Adicionar variação</button>
                  {variations.length === 0 && (
                    <p style={{ fontSize: 11, color: "#fbbf24", margin: 0 }}>⚠️ Adicione pelo menos uma variação</p>
                  )}
                </div>
              )}

              {/* Thumbnail */}
              <div>
                <label style={labelStyle}>Foto do produto</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {thumbnailUrl ? (
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <img src={thumbnailUrl} alt="thumb" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8 }} />
                      <button type="button" onClick={() => setThumbnailUrl("")} style={removeBtnStyle}>×</button>
                    </div>
                  ) : null}
                  <button type="button" onClick={() => thumbRef.current?.click()} disabled={uploading === "thumb"} style={uploadBtnStyle}>
                    {uploading === "thumb" ? "Enviando…" : thumbnailUrl ? "Trocar foto" : "📷 Escolher foto"}
                  </button>
                  <input ref={thumbRef} type="file" accept="image/*" style={{ display: "none" }} onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; const url = await handleFileUpload(f, "thumb"); if (url) setThumbnailUrl(url); }} />
                </div>
              </div>

              {/* Vídeo */}
              {sectionConfig.allows_video && (
                <div>
                  <label style={labelStyle}>Vídeo (opcional)</label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {videoUrl ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, position: "relative" }}>
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>🎬 {videoUrl.split("/").pop()}</span>
                        <button type="button" onClick={() => setVideoUrl("")} style={{
                          width: 22, height: 22, borderRadius: "50%",
                          background: "#ef4444", color: "#fff", border: "none",
                          fontSize: 13, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          lineHeight: 1, flexShrink: 0,
                        }}>×</button>
                      </div>
                    ) : null}
                    <button type="button" onClick={() => videoRef.current?.click()} disabled={uploading === "video"} style={uploadBtnStyle}>
                      {uploading === "video" ? "Enviando…" : videoUrl ? "Trocar vídeo" : "🎬 Escolher vídeo"}
                    </button>
                    <input ref={videoRef} type="file" accept="video/*" style={{ display: "none" }} onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; const url = await handleFileUpload(f, "video"); if (url) setVideoUrl(url); }} />
                  </div>
                </div>
              )}

              {/* Toggle alcoólico */}
              {sectionConfig.allows_alcoholic && (
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={isAlcoholic} onChange={e => setIsAlcoholic(e.target.checked)} style={{ accentColor: "#FF6B00" }} />
                  <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
                    {section === "drinks" ? "Drink alcoólico" : "Bebida alcoólica"}
                  </span>
                </label>
              )}

              {uploadError && <p style={{ color: "#f87171", fontSize: 12, margin: 0 }}>{uploadError}</p>}

              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button type="submit" disabled={isPending || uploading !== null} style={{ flex: 1, padding: "10px 0", background: "#10b981", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: isPending ? "not-allowed" : "pointer", opacity: isPending ? 0.6 : 1 }}>
                  {isPending ? "Salvando…" : "Salvar"}
                </button>
                <form action={deleteProduct}>
                  <input type="hidden" name="id" value={product.id} />
                  <button type="submit" style={{ padding: "10px 16px", background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Excluir</button>
                </form>
              </div>
            </form>
            <div style={{ padding: "0 16px 16px" }}>
              {hasRecipeFeature && unitId ? (
                <RecipeSection productId={product.id} unitId={unitId} basePrice={product.base_price || 0} />
              ) : (
                <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.02)", textAlign: "center" }}>
                  <span style={{ fontSize: 14 }}>🔒</span>
                  <div style={{ fontSize: 11, color: "var(--dash-text-muted)", marginTop: 4 }}>Ficha técnica disponível no plano Business</div>
                </div>
              )}
            </div>
            </>
          )}

          {/* Tab: Estoque */}
          {activeTab === "estoque" && (
            <form
              action={async (formData) => {
                formData.set("unlimited", String(unlimitedStock));
                startTransition(() => updateProductStock(formData));
                onClose();
              }}
              style={{ padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}
            >
              <input type="hidden" name="id" value={product.id} />
              <input name="sku" defaultValue={product.sku ?? ""} placeholder="SKU / Código interno (opcional)" style={inputStyle} />

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
                <div>
                  <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>Estoque ilimitado</div>
                  <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>Sem controle de quantidade</div>
                </div>
                <button type="button" onClick={() => setUnlimitedStock(!unlimitedStock)} style={{ width: 44, height: 26, borderRadius: 13, background: unlimitedStock ? "#00ffae" : "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                  <span style={{ display: "block", width: 20, height: 20, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: 3, transition: "transform 0.2s", transform: unlimitedStock ? "translateX(18px)" : "translateX(0)" }} />
                </button>
              </div>

              {!unlimitedStock && (
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Quantidade atual</label>
                    <input name="stock" type="number" min="0" defaultValue={product.stock ?? 0} style={inputStyle} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Alerta mínimo</label>
                    <input name="stock_minimum" type="number" min="0" defaultValue={product.stock_minimum ?? 10} style={inputStyle} />
                  </div>
                </div>
              )}

              <button type="submit" disabled={isPending} style={{ padding: "10px 0", background: "rgba(0,255,174,0.15)", color: "#00ffae", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: isPending ? "not-allowed" : "pointer", opacity: isPending ? 0.6 : 1 }}>
                {isPending ? "Salvando…" : "Salvar estoque"}
              </button>
            </form>
          )}

          {/* Tab: Nutrição */}
          {activeTab === "nutricao" && (
            <form
              action={async (formData) => {
                startTransition(() => updateProductNutrition(formData));
                onClose();
              }}
              style={{ padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}
            >
              <input type="hidden" name="id" value={product.id} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Informações nutricionais por porção</span>
                <button
                  type="button"
                  disabled={nutLoading}
                  onClick={async () => {
                    setNutLoading(true);
                    try {
                      const res = await fetch("/api/ia/nutrition", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name: product.name, description: product.description }),
                      });
                      const data = await res.json();
                      if (data.calories != null) {
                        setNutValues({
                          calories: String(data.calories),
                          protein: String(data.protein),
                          carbs: String(data.carbs),
                          fat: String(data.fat),
                        });
                      }
                    } finally {
                      setNutLoading(false);
                    }
                  }}
                  style={{ padding: "4px 10px", background: "rgba(139,92,246,0.15)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: nutLoading ? "not-allowed" : "pointer", opacity: nutLoading ? 0.6 : 1 }}
                >
                  {nutLoading ? "Calculando…" : "✨ Sugestão IA"}
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {(["calories", "protein", "carbs", "fat"] as const).map((key) => (
                  <div key={key}>
                    <label style={labelStyle}>{key === "calories" ? "Calorias (kcal)" : key === "protein" ? "Proteína (g)" : key === "carbs" ? "Carboidratos (g)" : "Gorduras (g)"}</label>
                    <input
                      name={key}
                      type="number"
                      step="0.1"
                      min="0"
                      value={nutValues[key]}
                      onChange={(e) => setNutValues((v) => ({ ...v, [key]: e.target.value }))}
                      placeholder="—"
                      style={inputStyle}
                    />
                  </div>
                ))}
              </div>
              <div>
                <label style={labelStyle}>Tempo de preparo (min)</label>
                <input name="preparation_time" type="number" min="0" defaultValue={product.preparation_time ?? 0} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Alérgenos (separados por vírgula)</label>
                <input name="allergens" defaultValue={(product.allergens ?? []).join(", ")} placeholder="Ex: glúten, lactose, amendoim" style={inputStyle} />
              </div>
              <button type="submit" disabled={isPending} style={{ padding: "10px 0", background: "rgba(0,255,174,0.15)", color: "#00ffae", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: isPending ? "not-allowed" : "pointer", opacity: isPending ? 0.6 : 1 }}>
                {isPending ? "Salvando…" : "Salvar ficha técnica"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%", padding: 10, borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.05)",
  color: "#fff", fontSize: 16, outline: "none", boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 6, fontWeight: 500,
};

const uploadBtnStyle: React.CSSProperties = {
  padding: "8px 14px", background: "rgba(255,255,255,0.08)", color: "#fff",
  border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 13,
  cursor: "pointer", whiteSpace: "nowrap",
};

const removeBtnStyle: React.CSSProperties = {
  position: "absolute" as const, top: -6, right: -6,
  width: 18, height: 18, borderRadius: "50%",
  background: "#ef4444", color: "#fff", border: "none",
  fontSize: 12, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
};
