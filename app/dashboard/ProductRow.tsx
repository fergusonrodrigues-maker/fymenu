"use client";

import { useState, useRef, useTransition, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateProduct, deleteProduct, updateProductStock, updateProductNutrition, updateProductVariations } from "./actions";

type Product = {
  id: string;
  name: string;
  description?: string | null;
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
};

const BUCKET = "products";

function StockBadge({ product }: { product: Product }) {
  if (product.unlimited !== false) return null;
  const stock = product.stock ?? 0;
  const min = product.stock_minimum ?? 10;
  if (stock === 0) return <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 6, background: "rgba(248,113,113,0.15)", color: "#f87171", fontWeight: 700 }}>Sem estoque</span>;
  if (stock <= min) return <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 6, background: "rgba(251,191,36,0.15)", color: "#fbbf24", fontWeight: 700 }}>{stock} restantes</span>;
  return <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 6, background: "rgba(0,255,174,0.10)", color: "#00ffae", fontWeight: 700 }}>{stock} em estoque</span>;
}

export default function ProductRow({ product }: { product: Product }) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "estoque" | "nutricao">("info");
  const [thumbnailUrl, setThumbnailUrl] = useState(product.thumbnail_url ?? "");
  const [videoUrl, setVideoUrl] = useState(product.video_url ?? "");
  const [priceType, setPriceType] = useState(product.price_type ?? "fixed");
  const [variations, setVariations] = useState<{ id?: string; name: string; price: number }[]>([]);
  const [variationsLoaded, setVariationsLoaded] = useState(false);
  const [uploading, setUploading] = useState<"thumb" | "video" | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [unlimitedStock, setUnlimitedStock] = useState(product.unlimited !== false);
  const thumbRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

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
    const ext = file.name.split(".").pop();
    const path = `products/${product.id}/${type}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
    if (error) { setUploadError(`Erro ao enviar: ${error.message}`); setUploading(null); return null; }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    setUploading(null);
    return data.publicUrl;
  }

  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, marginBottom: 8, overflow: "hidden", background: "rgba(255,255,255,0.03)" }}>
      {/* Header row */}
      <div onClick={() => setExpanded(!expanded)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", cursor: "pointer" }}>
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
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 18 }}>{expanded ? "▲" : "▼"}</span>
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
            <form
              action={async (formData) => {
                formData.set("thumbnail_url", thumbnailUrl);
                formData.set("video_url", videoUrl);
                if (priceType === "variable") {
                  await updateProductVariations(product.id, variations);
                }
                startTransition(() => updateProduct(formData));
                setExpanded(false);
              }}
              style={{ padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}
            >
              <input type="hidden" name="id" value={product.id} />
              <input name="name" defaultValue={product.name} placeholder="Nome do produto" style={inputStyle} />
              <textarea name="description" defaultValue={product.description ?? ""} placeholder="Descrição (opcional)" rows={2} style={{ ...inputStyle, resize: "vertical" }} />
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
                  <input name="base_price" type="number" step="0.01" defaultValue={product.base_price ?? ""} placeholder="Preço (R$)" style={{ ...inputStyle, flex: 1 }} />
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
                        type="number"
                        placeholder="Preço"
                        value={v.price}
                        onChange={(e) => setVariations(variations.map((x, j) => j === i ? { ...x, price: parseFloat(e.target.value) || 0 } : x))}
                        style={{ ...inputStyle, flex: 1, fontSize: 13 }}
                        step="1"
                        min="0"
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
              <div>
                <label style={labelStyle}>Vídeo (opcional)</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {videoUrl ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>🎬 {videoUrl.split("/").pop()}</span>
                      <button type="button" onClick={() => setVideoUrl("")} style={removeBtnStyle}>×</button>
                    </div>
                  ) : null}
                  <button type="button" onClick={() => videoRef.current?.click()} disabled={uploading === "video"} style={uploadBtnStyle}>
                    {uploading === "video" ? "Enviando…" : videoUrl ? "Trocar vídeo" : "🎬 Escolher vídeo"}
                  </button>
                  <input ref={videoRef} type="file" accept="video/*" style={{ display: "none" }} onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; const url = await handleFileUpload(f, "video"); if (url) setVideoUrl(url); }} />
                </div>
              </div>

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
          )}

          {/* Tab: Estoque */}
          {activeTab === "estoque" && (
            <form
              action={async (formData) => {
                formData.set("unlimited", String(unlimitedStock));
                startTransition(() => updateProductStock(formData));
                setExpanded(false);
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
                setExpanded(false);
              }}
              style={{ padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}
            >
              <input type="hidden" name="id" value={product.id} />
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginBottom: 2 }}>Informações nutricionais por porção</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { name: "calories", label: "Calorias (kcal)", value: product.nutrition?.calories },
                  { name: "protein", label: "Proteína (g)", value: product.nutrition?.protein },
                  { name: "carbs", label: "Carboidratos (g)", value: product.nutrition?.carbs },
                  { name: "fat", label: "Gorduras (g)", value: product.nutrition?.fat },
                ].map((f) => (
                  <div key={f.name}>
                    <label style={labelStyle}>{f.label}</label>
                    <input name={f.name} type="number" step="0.1" min="0" defaultValue={f.value ?? ""} placeholder="—" style={inputStyle} />
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
  color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box",
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
