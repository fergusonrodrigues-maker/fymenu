"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AIButton from "@/components/AIButton";
import AILoader from "@/components/AILoader";

interface ImportVariation {
  name: string;
  price: number | null;
  position: number;
}

interface ImportProduct {
  name: string;
  description: string | null;
  price_type: "fixed" | "variable";
  base_price: number | null;
  variations: ImportVariation[];
  has_pending_media: boolean;
  status: "active" | "draft";
  position: number;
  import_confidence: number;
  raw_price_text: string | null;
  _selected: boolean;
  _edited: boolean;
}

interface ImportCategory {
  name: string;
  type: string;
  position: number;
  products: ImportProduct[];
}

interface ImportData {
  unit_name: string | null;
  source_type: string;
  currency: string;
  notes: string[];
  categories: ImportCategory[];
}

function formatPrice(val: number | null): string {
  if (val === null) return "";
  return val.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

function parsePrice(str: string): number | null {
  const clean = str.replace(/[^\d,.-]/g, "").replace(",", ".");
  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
}

function ConfidenceBadge({ conf }: { conf: number }) {
  const pct = Math.round(conf * 100);
  const color = conf >= 0.9 ? "#00ffae" : conf >= 0.7 ? "#fbbf24" : "#f87171";
  const bg = conf >= 0.9 ? "rgba(0,255,174,0.12)" : conf >= 0.7 ? "rgba(251,191,36,0.12)" : "rgba(248,113,113,0.12)";
  return <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: bg, color, fontWeight: 700 }}>{pct}%</span>;
}

const ACCEPTED_TYPES = ".doc,.docx,.xls,.xlsx,.txt,.csv,.jpg,.jpeg,.png,.webp";

const inp: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.05)",
  color: "#fff", fontSize: 14, boxSizing: "border-box",
  outline: "none", fontFamily: "inherit",
};

export default function ImportClient({ unitId, unitName, embedded = false }: { unitId: string; unitName: string; embedded?: boolean }) {
  const router = useRouter();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [step, setStep] = useState<"upload" | "preview" | "saving" | "done">("upload");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importData, setImportData] = useState<ImportData | null>(null);
  const [rawText, setRawText] = useState("");
  const [inputMode, setInputMode] = useState<"file" | "text">("file");
  const [savedCount, setSavedCount] = useState(0);
  const [, startTransition] = useTransition();

  async function handleImport() {
    setError(null);
    setLoading(true);
    try {
      let body: string;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (inputMode === "file") {
        if (selectedFiles.length === 0) throw new Error("Selecione ao menos um arquivo.");
        const toBase64 = (f: File): Promise<string> =>
          new Promise((res, rej) => {
            const reader = new FileReader();
            reader.onload = () => { const result = reader.result as string; res(result.split(",")[1] ?? ""); };
            reader.onerror = rej;
            reader.readAsDataURL(f);
          });
        const filesData = await Promise.all(selectedFiles.map(async (f) => ({ name: f.name, type: f.type, data: await toBase64(f) })));
        body = JSON.stringify({ files: filesData });
      } else {
        if (!rawText.trim()) throw new Error("Cole o texto do cardápio.");
        body = JSON.stringify({ text: rawText.trim() });
      }
      const res = await fetch("/api/ia/import", { method: "POST", headers, body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao processar.");
      const data: ImportData = {
        ...json.data,
        categories: json.data.categories.map((cat: ImportCategory, ci: number) => ({
          ...cat, position: ci,
          products: cat.products.map((p: ImportProduct, pi: number) => ({ ...p, position: pi, _selected: true, _edited: false })),
        })),
      };
      setImportData(data);
      setStep("preview");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  function updateProduct(ci: number, pi: number, patch: Partial<ImportProduct>) {
    setImportData((prev) => {
      if (!prev) return prev;
      const cats = [...prev.categories];
      const prods = [...cats[ci].products];
      prods[pi] = { ...prods[pi], ...patch, _edited: true };
      cats[ci] = { ...cats[ci], products: prods };
      return { ...prev, categories: cats };
    });
  }

  function toggleAll(selected: boolean) {
    setImportData((prev) => {
      if (!prev) return prev;
      return { ...prev, categories: prev.categories.map((cat) => ({ ...cat, products: cat.products.map((p) => ({ ...p, _selected: selected })) })) };
    });
  }

  async function handleSave() {
    if (!importData) return;
    setStep("saving");
    setError(null);
    let count = 0;
    try {
      for (const cat of importData.categories) {
        const selectedProds = cat.products.filter((p) => p._selected);
        if (selectedProds.length === 0) continue;
        const { data: existingCat } = await supabase.from("categories").select("id").eq("unit_id", unitId).ilike("name", cat.name).single();
        let categoryId: string;
        if (existingCat) {
          categoryId = existingCat.id;
        } else {
          const { data: newCat, error: catErr } = await supabase.from("categories").insert({ unit_id: unitId, name: cat.name, order_index: cat.position }).select("id").single();
          if (catErr) throw catErr;
          categoryId = newCat.id;
        }
        for (const product of selectedProds) {
          const { data: newProd, error: prodErr } = await supabase.from("products").insert({ category_id: categoryId, name: product.name, description: product.description, price_type: product.price_type, base_price: product.price_type === "fixed" ? product.base_price : null, order_index: product.position }).select("id").single();
          if (prodErr) throw prodErr;
          if (product.price_type === "variable" && product.variations.length > 0) {
            const vars = product.variations.map((v, vi) => ({ product_id: newProd.id, name: v.name, price: v.price, order_index: vi }));
            const { error: varErr } = await supabase.from("product_variations").insert(vars);
            if (varErr) throw varErr;
          }
          count++;
        }
      }
      setSavedCount(count);
      setStep("done");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
      setStep("preview");
    }
  }

  const totalProducts = importData?.categories.reduce((s, c) => s + c.products.length, 0) ?? 0;
  const selectedProducts = importData?.categories.reduce((s, c) => s + c.products.filter((p) => p._selected).length, 0) ?? 0;

  return (
    <div style={{
      minHeight: embedded ? "auto" : "100vh",
      background: embedded ? "transparent" : "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,255,174,0.07) 0%, transparent 60%), #0a0a0a",
      fontFamily: "'Montserrat', -apple-system, 'SF Pro Display', BlinkMacSystemFont, sans-serif",
      color: "#fff",
    }}>
      {!embedded && (
        <style>{`* { box-sizing: border-box; } input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.25); } option { background: #1a1a1a; }`}</style>
      )}
      <style>{`
        .folder-icon {
          position: relative;
          width: 80px;
          height: 56px;
          cursor: pointer;
          perspective: 1500px;
          transform-origin: bottom;
          margin: 0 auto 12px;
        }
        .folder-back {
          position: absolute;
          width: 100%;
          height: 100%;
          background: #d97706;
          border-radius: 12px;
          border-top-left-radius: 0;
          transition: all 0.3s ease;
        }
        .folder-back::after {
          content: "";
          position: absolute;
          bottom: 99%;
          left: 0;
          width: 28px;
          height: 8px;
          background: #d97706;
          border-radius: 8px 8px 0 0;
        }
        .folder-back::before {
          content: "";
          position: absolute;
          top: -7px;
          left: 27px;
          width: 8px;
          height: 8px;
          background: #d97706;
          clip-path: polygon(0 35%, 0% 100%, 50% 100%);
        }
        .folder-paper {
          position: absolute;
          inset: 3px;
          border-radius: 10px;
          transition: all 0.3s ease;
          transform-origin: bottom;
        }
        .folder-paper-1 { background: #a1a1aa; }
        .folder-paper-2 { background: #d4d4d8; }
        .folder-paper-3 { background: #e4e4e7; }
        .folder-front {
          position: absolute;
          bottom: 0;
          width: 100%;
          height: 52px;
          border-radius: 12px;
          border-top-right-radius: 0;
          background: linear-gradient(to top, #d97706, #f59e0b);
          transition: all 0.3s ease;
          transform-origin: bottom;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding-bottom: 8px;
        }
        .folder-front::after {
          content: "";
          position: absolute;
          bottom: 99%;
          right: 0;
          width: 52px;
          height: 8px;
          background: #f59e0b;
          border-radius: 8px 8px 0 0;
        }
        .folder-front::before {
          content: "";
          position: absolute;
          top: -5px;
          right: 50px;
          width: 7px;
          height: 7px;
          background: #f59e0b;
          clip-path: polygon(100% 14%, 50% 100%, 100% 100%);
        }
        .folder-icon:hover .folder-front {
          transform: rotateX(-46deg) translateY(1px);
          box-shadow: inset 0 20px 40px #fbbf24, inset 0 -20px 40px #d97706;
        }
        .folder-icon:hover .folder-back {
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
        }
        .folder-icon:hover .folder-paper-1 {
          transform: rotateX(-20deg);
        }
        .folder-icon:hover .folder-paper-2 {
          transform: rotateX(-30deg);
        }
        .folder-icon:hover .folder-paper-3 {
          transform: rotateX(-38deg);
        }
        .folder-icon:active {
          transform: scale(0.95);
        }
      `}</style>

      {!embedded && (
        <>
          {/* Header */}
          <div style={{ padding: "56px 24px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <a href="/painel" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: 18 }}>←</a>
            <div>
              <div style={{ color: "#fff", fontSize: 18, fontWeight: 800, letterSpacing: "-0.5px" }}>Importar cardápio com IA</div>
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>{unitName}</div>
            </div>
          </div>
        </>
      )}

      <div style={{ maxWidth: embedded ? "100%" : 640, margin: "0 auto", padding: embedded ? "8px 0 0" : "24px 16px 80px" }}>

        {/* STEP: Upload */}
        {step === "upload" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Tabs */}
            <div style={{ display: "flex", gap: 0, padding: 3, background: "rgba(255,255,255,0.04)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", position: "relative" }}>
              <div style={{
                position: "absolute",
                top: 3,
                height: "calc(100% - 6px)",
                width: "calc(50% - 3px)",
                borderRadius: 10,
                transition: "left 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
                zIndex: 0,
                boxShadow: "0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.15)",
                left: inputMode === "file" ? 3 : "50%",
                background: "linear-gradient(145deg, #7c3aed 0%, #5b21b6 50%, #4c1d95 100%)",
              }} />
              {(["file", "text"] as const).map((mode) => (
                <button key={mode} onClick={() => setInputMode(mode)} style={{
                  flex: 1, padding: "9px 0", borderRadius: 10, border: "none", fontSize: 13, fontWeight: 600,
                  cursor: "pointer", position: "relative", zIndex: 1, transition: "color 0.3s ease",
                  background: "transparent",
                  color: inputMode === mode ? "#fff" : "rgba(255,255,255,0.4)",
                }}>
                  {mode === "file" ? "📎 Arquivo" : "✏️ Colar texto"}
                </button>
              ))}
            </div>

            {inputMode === "file" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div onClick={() => fileRef.current?.click()} style={{ borderRadius: 20, border: "2px dashed rgba(255,255,255,0.12)", padding: "40px 20px", textAlign: "center", cursor: "pointer", minHeight: 200 }}>
                  <div className="folder-icon">
                    <div className="folder-back"></div>
                    <div className="folder-paper folder-paper-1"></div>
                    <div className="folder-paper folder-paper-2"></div>
                    <div className="folder-paper folder-paper-3"></div>
                    <div className="folder-front"></div>
                  </div>
                  <div style={{ color: "#fff", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Clique para selecionar</div>
                  <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>Até 15 fotos · print, screenshot, Word, Excel, TXT</div>
                  <input ref={fileRef} type="file" accept={ACCEPTED_TYPES} multiple onChange={(e) => {
                    const newFiles = Array.from(e.target.files ?? []);
                    e.target.value = "";
                    if (newFiles.length === 0) return;
                    setError(null);
                    setSelectedFiles((prev) => {
                      const merged = [...prev, ...newFiles];
                      const seen = new Set<string>();
                      const deduped: File[] = [];
                      for (const f of merged) { const key = f.name + "-" + f.size; if (!seen.has(key)) { seen.add(key); deduped.push(f); } }
                      return deduped.slice(0, 15);
                    });
                  }} style={{ display: "none" }} />
                </div>
                {selectedFiles.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>{selectedFiles.length}/15 arquivo{selectedFiles.length > 1 ? "s" : ""}</span>
                      <button onClick={() => { setSelectedFiles([]); if (fileRef.current) fileRef.current.value = ""; }} style={{ background: "none", border: "none", color: "#f87171", fontSize: 12, cursor: "pointer" }}>Limpar tudo</button>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {selectedFiles.map((f, i) => {
                        const isImage = f.type.startsWith("image/");
                        const previewUrl = isImage ? URL.createObjectURL(f) : null;
                        return (
                          <div key={i} style={{ position: "relative" }}>
                            {previewUrl ? (
                              <img src={previewUrl} alt={f.name} style={{ width: 76, height: 76, objectFit: "cover", borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)" }} />
                            ) : (
                              <div style={{ width: 76, height: 76, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
                                <span style={{ fontSize: 24 }}>📄</span>
                                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.35)" }}>{f.name.split(".").pop()?.toUpperCase()}</span>
                              </div>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); setSelectedFiles((prev) => prev.filter((_, j) => j !== i)); }} style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "#ef4444", border: "none", color: "#fff", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>×</button>
                          </div>
                        );
                      })}
                      {selectedFiles.length < 10 && (
                        <button type="button" onClick={() => fileRef.current?.click()} style={{ width: 76, height: 76, borderRadius: 12, border: "2px dashed rgba(255,255,255,0.15)", background: "transparent", color: "rgba(255,255,255,0.35)", fontSize: 24, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <textarea value={rawText} onChange={(e) => setRawText(e.target.value)} placeholder="Cole aqui o texto do seu cardápio..." rows={10} style={{ ...inp, resize: "vertical", minHeight: 200 }} />
            )}

            {error && <div style={{ borderRadius: 12, padding: "12px 14px", background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.2)", color: "#f87171", fontSize: 13 }}>{error}</div>}

            <div style={{ display: "flex", justifyContent: "center" }}>
              <button
                type="button"
                onClick={handleImport}
                disabled={loading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "12px 32px",
                  border: "none",
                  borderRadius: 12,
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#e8dff5",
                  fontFamily: "inherit",
                  background: loading
                    ? "rgba(124,58,237,0.3)"
                    : "linear-gradient(145deg, #7c3aed 0%, #5b21b6 40%, #4c1d95 100%)",
                  boxShadow: loading
                    ? "none"
                    : "0 4px 14px rgba(124,58,237,0.3), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -2px 0 rgba(0,0,0,0.2)",
                  transition: "all 0.2s ease",
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? "⏳ Analisando..." : "✨ Analisar cardápio"}
              </button>
            </div>
          </div>
        )}

        {/* STEP: Preview */}
        {step === "preview" && importData && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ borderRadius: 16, padding: "16px 18px", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ color: "#a5b4fc", fontSize: 14, fontWeight: 700 }}>{totalProducts} produtos encontrados</div>
                <div style={{ color: "rgba(165,180,252,0.6)", fontSize: 12, marginTop: 2 }}>{selectedProducts} selecionados para importar</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => toggleAll(true)} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(99,102,241,0.3)", background: "rgba(99,102,241,0.1)", color: "#a5b4fc", fontSize: 12, cursor: "pointer" }}>Todos</button>
                <button onClick={() => toggleAll(false)} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer" }}>Nenhum</button>
              </div>
            </div>

            {importData.notes.length > 0 && (
              <div style={{ borderRadius: 12, padding: "12px 14px", background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)" }}>
                {importData.notes.map((n, i) => <div key={i} style={{ color: "#fbbf24", fontSize: 12 }}>⚠️ {n}</div>)}
              </div>
            )}

            {error && <div style={{ borderRadius: 12, padding: "12px 14px", background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.2)", color: "#f87171", fontSize: 13 }}>{error}</div>}

            {importData.categories.map((cat, ci) => (
              <div key={ci} style={{ borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "#fff", fontSize: 14, fontWeight: 800 }}>{cat.name}</span>
                  <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>{cat.products.length} itens</span>
                </div>
                <div>
                  {cat.products.map((prod, pi) => (
                    <div key={pi} style={{ padding: "14px 16px", borderBottom: pi < cat.products.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", opacity: prod._selected ? 1 : 0.4 }}>
                      <div style={{ display: "flex", gap: 12 }}>
                        <input type="checkbox" checked={prod._selected} onChange={(e) => updateProduct(ci, pi, { _selected: e.target.checked })} style={{ marginTop: 2, accentColor: "#6366f1", width: 16, height: 16 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            <input value={prod.name} onChange={(e) => updateProduct(ci, pi, { name: e.target.value })} style={{ flex: 1, background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontSize: 14, fontWeight: 600, padding: "2px 0", outline: "none", fontFamily: "inherit" }} />
                            <ConfidenceBadge conf={prod.import_confidence} />
                          </div>
                          <input value={prod.description ?? ""} onChange={(e) => updateProduct(ci, pi, { description: e.target.value || null })} placeholder="Descrição (opcional)" style={{ width: "100%", background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)", fontSize: 12, padding: "2px 0", outline: "none", fontFamily: "inherit", marginBottom: 6 }} />
                          {prod.price_type === "fixed" ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>R$</span>
                              <input value={prod.base_price !== null ? formatPrice(prod.base_price) : ""} onChange={(e) => updateProduct(ci, pi, { base_price: parsePrice(e.target.value) })} placeholder="0,00" style={{ width: 80, background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.08)", color: "#00ffae", fontSize: 14, fontWeight: 700, padding: "2px 0", outline: "none", fontFamily: "inherit" }} />
                            </div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              {prod.variations.map((v, vi) => (
                                <div key={vi} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, width: 80, overflow: "hidden", textOverflow: "ellipsis" }}>{v.name}</span>
                                  <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>R$</span>
                                  <input value={v.price !== null ? formatPrice(v.price) : ""} onChange={(e) => { const vars = [...prod.variations]; vars[vi] = { ...vars[vi], price: parsePrice(e.target.value) }; updateProduct(ci, pi, { variations: vars }); }} placeholder="0,00" style={{ width: 70, background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.08)", color: "#00ffae", fontSize: 13, fontWeight: 700, padding: "2px 0", outline: "none", fontFamily: "inherit" }} />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div style={{ display: "flex", gap: 10, paddingTop: 8 }}>
              <button onClick={() => setStep("upload")} style={{ flex: 1, padding: "14px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "transparent", color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Voltar</button>
              <button onClick={handleSave} disabled={selectedProducts === 0} style={{ flex: 1, padding: "14px", borderRadius: 14, border: "none", background: selectedProducts === 0 ? "rgba(99,102,241,0.2)" : "linear-gradient(135deg, #6366f1, #4f46e5)", color: selectedProducts === 0 ? "rgba(255,255,255,0.3)" : "#fff", fontSize: 14, fontWeight: 700, cursor: selectedProducts === 0 ? "not-allowed" : "pointer" }}>
                Importar {selectedProducts} produtos
              </button>
            </div>
          </div>
        )}

        {/* STEP: Saving */}
        {step === "saving" && (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
            <AILoader isLoading={true} message="Salvando no cardápio..." size="md" />
          </div>
        )}

        {/* STEP: Done */}
        {step === "done" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: 20, textAlign: "center" }}>
            <div style={{ fontSize: 60 }}>🎉</div>
            <div>
              <div style={{ color: "#fff", fontSize: 22, fontWeight: 800 }}>{savedCount} produtos importados!</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginTop: 6 }}>Acesse o cardápio para adicionar fotos e ajustar detalhes.</div>
            </div>
            <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 320 }}>
              <button onClick={() => { setStep("upload"); setImportData(null); setRawText(""); setSelectedFiles([]); if (fileRef.current) fileRef.current.value = ""; }} style={{ flex: 1, padding: "14px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)", background: "transparent", color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Nova importação
              </button>
              <button onClick={() => { if (embedded) { setStep("upload"); setImportData(null); setRawText(""); setSelectedFiles([]); if (fileRef.current) fileRef.current.value = ""; window.location.reload(); } else { router.push("/painel"); } }} style={{ flex: 1, padding: "14px", borderRadius: 14, border: "none", background: "linear-gradient(135deg, #6366f1, #4f46e5)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                {embedded ? "Concluído" : "Ver cardápio"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
