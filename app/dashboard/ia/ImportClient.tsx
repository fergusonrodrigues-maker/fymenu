"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  // UI state
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(val: number | null): string {
  if (val === null) return "";
  return val.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

function parsePrice(str: string): number | null {
  const clean = str.replace(/[^\d,.-]/g, "").replace(",", ".");
  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
}

function confidenceBadge(conf: number) {
  if (conf >= 0.9)
    return (
      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
        {Math.round(conf * 100)}%
      </span>
    );
  if (conf >= 0.7)
    return (
      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
        {Math.round(conf * 100)}%
      </span>
    );
  return (
    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
      {Math.round(conf * 100)}%
    </span>
  );
}

const ACCEPTED_TYPES =
  ".doc,.docx,.xls,.xlsx,.txt,.csv,.jpg,.jpeg,.png,.webp";

// ─── Component ────────────────────────────────────────────────────────────────

export default function ImportClient({
  unitId,
  unitName,
}: {
  unitId: string;
  unitName: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const [step, setStep] = useState<"upload" | "preview" | "saving" | "done">(
    "upload"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importData, setImportData] = useState<ImportData | null>(null);
  const [rawText, setRawText] = useState("");
  const [inputMode, setInputMode] = useState<"file" | "text">("file");
  const [savedCount, setSavedCount] = useState(0);
  const [isPending, startTransition] = useTransition();

  // ─── Upload & Parse ──────────────────────────────────────────────────────

  async function handleImport() {
    setError(null);
    setLoading(true);

    try {
      let body: string;
      let headers: Record<string, string> = { "Content-Type": "application/json" };

      if (inputMode === "file") {
        if (selectedFiles.length === 0) throw new Error("Selecione ao menos um arquivo.");
        // Converte arquivos para base64
        const toBase64 = (f: File): Promise<string> =>
          new Promise((res, rej) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              res(result.split(',')[1] ?? '');
            };
            reader.onerror = rej;
            reader.readAsDataURL(f);
          });
        const filesData = await Promise.all(
          selectedFiles.map(async (f) => ({
            name: f.name,
            type: f.type,
            data: await toBase64(f),
          }))
        );
        body = JSON.stringify({ files: filesData });
      } else {
        if (!rawText.trim()) throw new Error("Cole o texto do cardápio.");
        body = JSON.stringify({ text: rawText.trim() });
      }

      const res = await fetch("/api/ia/import", {
        method: "POST",
        headers,
        body,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao processar.");

      // Adiciona _selected e _edited em cada produto
      const data: ImportData = {
        ...json.data,
        categories: json.data.categories.map(
          (cat: ImportCategory, ci: number) => ({
            ...cat,
            position: ci,
            products: cat.products.map(
              (p: ImportProduct, pi: number) => ({
                ...p,
                position: pi,
                _selected: true,
                _edited: false,
              })
            ),
          })
        ),
      };

      setImportData(data);
      setStep("preview");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  // ─── Edit helpers ────────────────────────────────────────────────────────

  function updateProduct(
    ci: number,
    pi: number,
    patch: Partial<ImportProduct>
  ) {
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
      return {
        ...prev,
        categories: prev.categories.map((cat) => ({
          ...cat,
          products: cat.products.map((p) => ({ ...p, _selected: selected })),
        })),
      };
    });
  }

  // ─── Save to Supabase ────────────────────────────────────────────────────

  async function handleSave() {
    if (!importData) return;
    setStep("saving");
    setError(null);

    let count = 0;

    try {
      for (const cat of importData.categories) {
        const selectedProducts = cat.products.filter((p) => p._selected);
        if (selectedProducts.length === 0) continue;

        // Cria ou reutiliza categoria
        const { data: existingCat } = await supabase
          .from("categories")
          .select("id")
          .eq("unit_id", unitId)
          .ilike("name", cat.name)
          .single();

        let categoryId: string;

        if (existingCat) {
          categoryId = existingCat.id;
        } else {
          const { data: newCat, error: catErr } = await supabase
            .from("categories")
            .insert({
              unit_id: unitId,
              name: cat.name,
              order_index: cat.position,
            })
            .select("id")
            .single();

          if (catErr) throw catErr;
          categoryId = newCat.id;
        }

        for (const product of selectedProducts) {
          const { data: newProd, error: prodErr } = await supabase
            .from("products")
            .insert({
              category_id: categoryId,
              name: product.name,
              description: product.description,
              price_type: product.price_type,
              base_price:
                product.price_type === "fixed" ? product.base_price : null,
              order_index: product.position,
            })
            .select("id")
            .single();

          if (prodErr) throw prodErr;

          if (
            product.price_type === "variable" &&
            product.variations.length > 0
          ) {
            const vars = product.variations.map((v, vi) => ({
              product_id: newProd.id,
              name: v.name,
              price: v.price,
              order_index: vi,
            }));

            const { error: varErr } = await supabase
              .from("product_variations")
              .insert(vars);

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

  // ─── Count helpers ───────────────────────────────────────────────────────

  const totalProducts =
    importData?.categories.reduce((s, c) => s + c.products.length, 0) ?? 0;
  const selectedProducts =
    importData?.categories.reduce(
      (s, c) => s + c.products.filter((p) => p._selected).length,
      0
    ) ?? 0;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard/cardapio")}
          className="text-gray-500 hover:text-gray-800 transition"
        >
          ←
        </button>
        <div>
          <h1 className="text-base font-semibold text-gray-900">
            Importar cardápio com IA
          </h1>
          <p className="text-xs text-gray-500">{unitName}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* ── STEP: Upload ── */}
        {step === "upload" && (
          <div className="space-y-6">
            {/* Tabs */}
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
              <button
                onClick={() => setInputMode("file")}
                className={`flex-1 text-sm py-2 rounded-lg font-medium transition ${
                  inputMode === "file"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500"
                }`}
              >
                📎 Arquivo
              </button>
              <button
                onClick={() => setInputMode("text")}
                className={`flex-1 text-sm py-2 rounded-lg font-medium transition ${
                  inputMode === "text"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500"
                }`}
              >
                ✏️ Colar texto
              </button>
            </div>

            {inputMode === "file" ? (
              <div className="space-y-3">
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-2xl p-10 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition"
                >
                  <div className="text-4xl mb-3">📸</div>
                  <p className="text-sm font-medium text-gray-700">
                    Clique para selecionar
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Até 10 fotos · print, screenshot, Word, Excel, TXT
                  </p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept={ACCEPTED_TYPES}
                    multiple
                    onChange={(e) => {
                      const newFiles = Array.from(e.target.files ?? []);
                      e.target.value = '';
                      if (newFiles.length === 0) return;
                      setError(null);
                      setSelectedFiles((prev) => {
                        const merged = [...prev, ...newFiles];
                        const seen = new Set<string>();
                        const deduped: File[] = [];
                        for (const f of merged) {
                          const key = f.name + '-' + f.size;
                          if (!seen.has(key)) { seen.add(key); deduped.push(f); }
                        }
                        return deduped.slice(0, 10);
                      });
                    }}
                    className="hidden"
                  />
                </div>

                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500 font-medium">
                        {selectedFiles.length}/10 arquivo{selectedFiles.length > 1 ? "s" : ""}
                      </p>
                      <button
                        onClick={() => { setSelectedFiles([]); if (fileRef.current) fileRef.current.value = ""; }}
                        className="text-xs text-gray-400 hover:text-red-500 transition"
                      >
                        Limpar tudo
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedFiles.map((f, i) => {
                        const isImage = f.type.startsWith("image/");
                        const previewUrl = isImage ? URL.createObjectURL(f) : null;
                        return (
                          <div key={i} className="relative group">
                            {previewUrl ? (
                              <img
                                src={previewUrl}
                                alt={f.name}
                                className="w-20 h-20 object-cover rounded-xl border border-gray-200"
                              />
                            ) : (
                              <div className="w-20 h-20 bg-gray-100 rounded-xl border border-gray-200 flex flex-col items-center justify-center gap-1">
                                <span className="text-2xl">📄</span>
                                <span className="text-[10px] text-gray-500 px-1 text-center">
                                  {f.name.split(".").pop()?.toUpperCase()}
                                </span>
                              </div>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedFiles((prev) => prev.filter((_, j) => j !== i)); }}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs hidden group-hover:flex items-center justify-center font-bold"
                            >×</button>
                            <p className="text-[10px] text-gray-400 mt-1 w-20 truncate text-center">{f.name}</p>
                          </div>
                        );
                      })}
                      {selectedFiles.length < 10 && (
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition"
                        >
                          <span className="text-2xl leading-none">+</span>
                          <span className="text-[10px] mt-1">Adicionar</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Cole aqui o texto do seu cardápio..."
                rows={10}
                className="w-full border border-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              />
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={handleImport}
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-2xl transition disabled:opacity-50"
            >
              {loading ? "Analisando com IA..." : "Analisar cardápio ✨"}
            </button>

            <p className="text-center text-xs text-gray-400">
              Custo estimado: menos de R$0,01 por importação
            </p>
          </div>
        )}

        {/* ── STEP: Preview ── */}
        {step === "preview" && importData && (
          <div className="space-y-4">
            {/* Summary bar */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-indigo-800">
                  {totalProducts} produtos encontrados
                </p>
                <p className="text-xs text-indigo-600">
                  {selectedProducts} selecionados para importar
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleAll(true)}
                  className="text-xs bg-white border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-lg"
                >
                  Todos
                </button>
                <button
                  onClick={() => toggleAll(false)}
                  className="text-xs bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg"
                >
                  Nenhum
                </button>
              </div>
            </div>

            {importData.notes.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-3">
                {importData.notes.map((n, i) => (
                  <p key={i} className="text-xs text-yellow-700">
                    ⚠️ {n}
                  </p>
                ))}
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Categories & Products */}
            {importData.categories.map((cat, ci) => (
              <div key={ci} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <span className="text-sm font-semibold text-gray-800">
                    {cat.name}
                  </span>
                  <span className="text-xs text-gray-400 ml-2">
                    {cat.products.length} itens
                  </span>
                </div>

                <div className="divide-y divide-gray-50">
                  {cat.products.map((prod, pi) => (
                    <div
                      key={pi}
                      className={`p-4 transition ${
                        !prod._selected ? "opacity-50" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={prod._selected}
                          onChange={(e) =>
                            updateProduct(ci, pi, {
                              _selected: e.target.checked,
                            })
                          }
                          className="mt-1 w-4 h-4 accent-indigo-600"
                        />

                        <div className="flex-1 space-y-2">
                          {/* Nome + confidence */}
                          <div className="flex items-center gap-2">
                            <input
                              value={prod.name}
                              onChange={(e) =>
                                updateProduct(ci, pi, { name: e.target.value })
                              }
                              className="flex-1 text-sm font-medium text-gray-900 bg-transparent border-b border-transparent focus:border-indigo-300 focus:outline-none"
                            />
                            {confidenceBadge(prod.import_confidence)}
                          </div>

                          {/* Descrição */}
                          <input
                            value={prod.description ?? ""}
                            onChange={(e) =>
                              updateProduct(ci, pi, {
                                description: e.target.value || null,
                              })
                            }
                            placeholder="Descrição (opcional)"
                            className="w-full text-xs text-gray-500 bg-transparent border-b border-transparent focus:border-indigo-300 focus:outline-none"
                          />

                          {/* Preço */}
                          {prod.price_type === "fixed" ? (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-400">R$</span>
                              <input
                                value={
                                  prod.base_price !== null
                                    ? formatPrice(prod.base_price)
                                    : ""
                                }
                                onChange={(e) =>
                                  updateProduct(ci, pi, {
                                    base_price: parsePrice(e.target.value),
                                  })
                                }
                                placeholder="0,00"
                                className="w-24 text-sm font-semibold text-gray-800 bg-transparent border-b border-transparent focus:border-indigo-300 focus:outline-none"
                              />
                              {prod.raw_price_text &&
                                prod.base_price === null && (
                                  <span className="text-xs text-orange-500">
                                    ({prod.raw_price_text})
                                  </span>
                                )}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {prod.variations.map((v, vi) => (
                                <div
                                  key={vi}
                                  className="flex items-center gap-2"
                                >
                                  <span className="text-xs text-gray-500 w-24 truncate">
                                    {v.name}
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    R$
                                  </span>
                                  <input
                                    value={
                                      v.price !== null
                                        ? formatPrice(v.price)
                                        : ""
                                    }
                                    onChange={(e) => {
                                      const vars = [...prod.variations];
                                      vars[vi] = {
                                        ...vars[vi],
                                        price: parsePrice(e.target.value),
                                      };
                                      updateProduct(ci, pi, {
                                        variations: vars,
                                      });
                                    }}
                                    placeholder="0,00"
                                    className="w-20 text-xs font-semibold text-gray-800 bg-transparent border-b border-transparent focus:border-indigo-300 focus:outline-none"
                                  />
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

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep("upload")}
                className="flex-1 border border-gray-200 text-gray-600 font-medium py-3 rounded-2xl"
              >
                Voltar
              </button>
              <button
                onClick={handleSave}
                disabled={selectedProducts === 0}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-2xl transition disabled:opacity-50"
              >
                Importar {selectedProducts} produtos
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: Saving ── */}
        {step === "saving" && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-600 font-medium">
              Salvando no cardápio...
            </p>
          </div>
        )}

        {/* ── STEP: Done ── */}
        {step === "done" && (
          <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
            <div className="text-6xl">🎉</div>
            <div>
              <p className="text-xl font-bold text-gray-900">
                {savedCount} produtos importados!
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Acesse o cardápio para adicionar fotos e ajustar detalhes.
              </p>
            </div>
            <div className="flex gap-3 w-full max-w-xs">
              <button
                onClick={() => {
                  setStep("upload");
                  setImportData(null);
                  setRawText("");
                  setSelectedFiles([]);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className="flex-1 border border-gray-200 text-gray-600 font-medium py-3 rounded-2xl text-sm"
              >
                Nova importação
              </button>
              <button
                onClick={() => router.push("/dashboard/cardapio")}
                className="flex-1 bg-indigo-600 text-white font-semibold py-3 rounded-2xl text-sm"
              >
                Ver cardápio
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
