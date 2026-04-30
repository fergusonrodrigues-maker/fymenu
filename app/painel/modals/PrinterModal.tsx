"use client";

import React, { useEffect, useState, useCallback } from "react";
import { AlertTriangle, Printer } from "lucide-react";
import { usePrinterConfig, type PrinterConfig } from "@/lib/hooks/usePrinterConfig";
import { createClient } from "@/lib/supabase/client";

interface PrinterModalProps {
  unitId: string;
  categories: Array<{ id: string; name: string }>;
}

interface CategoryMapping {
  id: string;
  category_id: string;
  printer_config_id: string;
}

const DEFAULT_COMANDA_CONFIG = {
  paperWidth: "80mm",
  showLogo: true,
  showOrderNumber: true,
  showDateTime: true,
  showTable: true,
  showWaiter: true,
  showCustomer: true,
  showItems: true,
  showPrices: true,
  showTotal: true,
  showNotes: true,
  footerText: "Obrigado pela preferência!",
};

export default function PrinterModal({ unitId, categories }: PrinterModalProps) {
  const {
    printers,
    fetchPrinters,
    createPrinter,
    deletePrinter,
    getPrinterCategories,
    addCategoryToprinter,
    removeCategoryFromPrinter,
    error: hookError,
  } = usePrinterConfig(unitId);

  const supabase = createClient();

  // ── Tabs ──
  const [printerTab, setPrinterTab] = useState<"impressoras" | "comandas" | "roteamento">("impressoras");

  // ── Impressoras state ──
  const [newName, setNewName] = useState("");
  const [newPurpose, setNewPurpose] = useState<"kitchen" | "cashier" | "generic">("kitchen");
  const [newPaperWidth, setNewPaperWidth] = useState<80 | 58>(80);
  const [newPrintLogo, setNewPrintLogo] = useState(true);
  const [newFooterMessage, setNewFooterMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [catMap, setCatMap] = useState<Map<string, any[]>>(new Map());
  const [allMappings, setAllMappings] = useState<CategoryMapping[]>([]);
  const [loadingCats, setLoadingCats] = useState<string | null>(null);

  // ── Comanda config state ──
  const [comandaConfig, setComandaConfig] = useState<Record<string, any>>(DEFAULT_COMANDA_CONFIG);
  const [unitName, setUnitName] = useState("Restaurante");

  useEffect(() => {
    fetchPrinters(unitId);
  }, [unitId, fetchPrinters]);

  // Load unit name and comanda_config
  useEffect(() => {
    supabase
      .from("units")
      .select("name, comanda_config")
      .eq("id", unitId)
      .single()
      .then(({ data }) => {
        if (data?.name) setUnitName(data.name);
        if (data?.comanda_config) setComandaConfig(prev => ({ ...prev, ...data.comanda_config }));
      });
  }, [unitId]);

  async function saveComandaConfig(config: Record<string, any>) {
    await supabase.from("units").update({ comanda_config: config }).eq("id", unitId);
  }

  // Load all mappings for this unit (for exclusivity checks and unassigned display)
  const loadAllMappings = useCallback(async () => {
    const { data } = await supabase
      .from("printer_category_mappings")
      .select("id, category_id, printer_config_id");
    if (data) setAllMappings(data as CategoryMapping[]);
  }, [supabase]);

  useEffect(() => {
    if (printers.length > 0) loadAllMappings();
  }, [printers.length, loadAllMappings]);

  const loadCatsForPrinter = useCallback(
    async (printerId: string) => {
      setLoadingCats(printerId);
      const cats = await getPrinterCategories(printerId);
      setCatMap((prev) => new Map(prev).set(printerId, cats));
      setLoadingCats(null);
    },
    [getPrinterCategories]
  );

  const handleExpand = async (printerId: string) => {
    if (expandedId === printerId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(printerId);
    await loadCatsForPrinter(printerId);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const result = await createPrinter({
      name: newName.trim(),
      purpose: newPurpose,
      paperWidth: newPaperWidth,
      printLogo: newPrintLogo,
      footerMessage: newFooterMessage.trim() || undefined,
      type: "browser",
      isActive: true,
    });
    if (result) {
      setNewName("");
      setNewFooterMessage("");
      // keep purpose/width/logo for next entry — most users add multiple
      // printers of the same kind in a row
    }
    setCreating(false);
  };

  async function handleToggleActive(p: PrinterConfig) {
    await supabase
      .from("printer_configs")
      .update({ is_active: !p.is_active })
      .eq("id", p.id);
    fetchPrinters(unitId);
  }

  const handleRemoveCat = async (mappingId: string, printerId: string) => {
    await removeCategoryFromPrinter(mappingId);
    await loadCatsForPrinter(printerId);
    await loadAllMappings();
  };

  const handleAddCat = async (printerId: string, categoryId: string) => {
    const existing = allMappings.find(
      (m) => m.category_id === categoryId && m.printer_config_id !== printerId
    );
    if (existing) {
      await removeCategoryFromPrinter(existing.id);
      if (expandedId && expandedId !== printerId) {
        const oldCats = catMap.get(expandedId);
        if (oldCats) {
          setCatMap((prev) =>
            new Map(prev).set(
              expandedId,
              oldCats.filter((c: any) => c.id !== existing.id)
            )
          );
        }
      }
    }
    await addCategoryToprinter(printerId, categoryId);
    await loadCatsForPrinter(printerId);
    await loadAllMappings();
  };

  const handleDeletePrinter = async (printerId: string) => {
    await deletePrinter(printerId);
    setCatMap((prev) => {
      const next = new Map(prev);
      next.delete(printerId);
      return next;
    });
    if (expandedId === printerId) setExpandedId(null);
    await loadAllMappings();
  };

  const assignedCategoryIds = new Set(allMappings.map((m) => m.category_id));
  const unassignedCats = categories.filter((c) => !assignedCategoryIds.has(c.id));

  const availableCatsFor = (printerId: string) => {
    const current = new Set((catMap.get(printerId) || []).map((c: any) => c.category_id));
    return categories.filter((c) => !current.has(c.id));
  };

  const s = {
    label: { color: "var(--dash-text-muted)", fontSize: 11, marginBottom: 4 } as React.CSSProperties,
    input: {
      width: "100%", padding: "10px 14px", borderRadius: 10,
      border: "1px solid var(--dash-border)",
      background: "var(--dash-card-hover)",
      color: "var(--dash-text)", fontSize: 13, fontWeight: 500, boxSizing: "border-box" as const,
      outline: "none", transition: "border-color 0.2s",
    } as React.CSSProperties,
    card: {
      borderRadius: 14, padding: "14px 16px",
      background: "var(--dash-card)",
      border: "1px solid var(--dash-card-border)",
      marginBottom: 8,
    } as React.CSSProperties,
    chip: {
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
      background: "var(--dash-accent-soft)", border: "1px solid rgba(0,255,174,0.15)",
      color: "var(--dash-accent)",
    } as React.CSSProperties,
    warn: {
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
      background: "var(--dash-warning-soft)", border: "1px solid rgba(251,191,36,0.2)",
      color: "var(--dash-warning)",
    } as React.CSSProperties,
    deleteBtn: {
      padding: "5px 10px", borderRadius: 8, border: "none",
      background: "var(--dash-danger-soft)", color: "var(--dash-danger)",
      fontSize: 12, cursor: "pointer", fontWeight: 600,
    } as React.CSSProperties,
    addBtn: {
      padding: "9px 14px", borderRadius: 10, border: "none",
      background: "var(--dash-accent-soft)", color: "var(--dash-accent)",
      fontSize: 13, cursor: "pointer", fontWeight: 700,
      flexShrink: 0,
      boxShadow: "0 1px 0 rgba(0,255,174,0.08) inset, 0 -1px 0 rgba(0,0,0,0.15) inset",
    } as React.CSSProperties,
    select: {
      flex: 1, padding: "9px 12px", borderRadius: 10,
      border: "1px solid var(--dash-border)",
      backgroundColor: "var(--dash-card-hover)",
      color: "var(--dash-text)", fontSize: 13,
    } as React.CSSProperties,
    removeX: {
      marginLeft: 2, background: "none", border: "none",
      color: "var(--dash-accent)", cursor: "pointer",
      padding: "0 2px", fontSize: 13, lineHeight: 1,
    } as React.CSSProperties,
  };

  const toggleField = (key: string) => {
    const updated = { ...comandaConfig, [key]: !comandaConfig[key] };
    setComandaConfig(updated);
    saveComandaConfig(updated);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 4 }}>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, padding: 3, background: "var(--dash-card)", borderRadius: 12, marginBottom: 4 }}>
        {[
          { key: "impressoras", label: "Impressoras" },
          { key: "comandas", label: "Formato Comanda" },
          { key: "roteamento", label: "Roteamento" },
        ].map(t => (
          <button key={t.key} onClick={() => setPrinterTab(t.key as any)} style={{
            flex: 1, padding: "8px 12px", borderRadius: 10, border: "none", cursor: "pointer",
            background: printerTab === t.key ? "var(--dash-accent-soft)" : "transparent",
            color: printerTab === t.key ? "var(--dash-accent)" : "var(--dash-text-muted)",
            fontSize: 12, fontWeight: 600, transition: "all 0.2s",
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── TAB: IMPRESSORAS ── */}
      {printerTab === "impressoras" && (
        <>
          {hookError && (
            <div style={{
              padding: "10px 14px", borderRadius: 12,
              background: "var(--dash-danger-soft)", border: "1px solid rgba(248,113,113,0.25)",
              fontSize: 12, color: "var(--dash-danger)",
            }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><AlertTriangle size={12} /> {hookError}</span>
            </div>
          )}

          {/* Add printer — name + advanced fields */}
          <div style={{
            background: "var(--dash-card)", border: "1px solid var(--dash-card-border)",
            borderRadius: 12, padding: 12, marginBottom: 8,
          }}>
            <div style={{ display: "flex", gap: 8, marginBottom: newName.trim() ? 12 : 0 }}>
              <input
                style={s.input}
                placeholder="Nome da impressora (ex: Cozinha, Bar)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
                style={{ ...s.addBtn, opacity: !newName.trim() || creating ? 0.5 : 1 }}
              >
                {creating ? "..." : "+ Adicionar"}
              </button>
            </div>

            {/* Advanced fields appear only after the user types a name —
                keeps the empty state clean while still requiring purpose. */}
            {newName.trim() && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <div style={s.label}>Finalidade</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {([
                      { v: "kitchen", emoji: "🍳", label: "Cozinha" },
                      { v: "cashier", emoji: "💰", label: "Caixa" },
                      { v: "generic", emoji: "📋", label: "Geral" },
                    ] as const).map((opt) => (
                      <button
                        key={opt.v}
                        onClick={() => setNewPurpose(opt.v as any)}
                        style={{
                          flex: 1, padding: "9px", borderRadius: 10,
                          border: newPurpose === opt.v ? "1px solid var(--dash-accent)" : "1px solid var(--dash-border)",
                          background: newPurpose === opt.v ? "var(--dash-accent-soft)" : "var(--dash-card-hover)",
                          color: newPurpose === opt.v ? "var(--dash-accent)" : "var(--dash-text-muted)",
                          fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                        }}
                      >{opt.emoji} {opt.label}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={s.label}>Largura do papel</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {([80, 58] as const).map((w) => (
                      <button
                        key={w}
                        onClick={() => setNewPaperWidth(w)}
                        style={{
                          flex: 1, padding: "8px", borderRadius: 10,
                          border: newPaperWidth === w ? "1px solid var(--dash-accent)" : "1px solid var(--dash-border)",
                          background: newPaperWidth === w ? "var(--dash-accent-soft)" : "var(--dash-card-hover)",
                          color: newPaperWidth === w ? "var(--dash-accent)" : "var(--dash-text-muted)",
                          fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                        }}
                      >{w}mm</button>
                    ))}
                  </div>
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, color: "var(--dash-text)" }}>
                  <input
                    type="checkbox"
                    checked={newPrintLogo}
                    onChange={(e) => setNewPrintLogo(e.target.checked)}
                    style={{ accentColor: "var(--dash-accent)" }}
                  />
                  Imprimir logo do restaurante no cabeçalho
                </label>

                <div>
                  <div style={s.label}>Mensagem rodapé (opcional)</div>
                  <input
                    style={s.input}
                    placeholder="Ex: Obrigado pela visita!"
                    value={newFooterMessage}
                    onChange={(e) => setNewFooterMessage(e.target.value.slice(0, 100))}
                  />
                </div>

                <div style={{ fontSize: 11, color: "var(--dash-text-muted)", lineHeight: 1.4 }}>
                  Tipo: <strong style={{ color: "var(--dash-text)" }}>Navegador (window.print)</strong>. Bluetooth e USB em breve.
                </div>
              </div>
            )}
          </div>

          {unassignedCats.length > 0 && printers.length > 0 && (
            <div style={{
              padding: "10px 14px", borderRadius: 12,
              background: "var(--dash-warning-soft)", border: "1px solid rgba(251,191,36,0.2)",
              fontSize: 12, color: "var(--dash-warning)",
            }}>
              <strong style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><AlertTriangle size={12} /> Sem impressora:</strong>{" "}
              {unassignedCats.map((c) => c.name).join(", ")}
            </div>
          )}

          {printers.length === 0 ? (
            <p style={{ color: "var(--dash-text-muted)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>
              Nenhuma impressora configurada.
            </p>
          ) : (
            printers.map((printer) => {
              const cats = catMap.get(printer.id) || [];
              const isExpanded = expandedId === printer.id;

              return (
                <div key={printer.id} style={s.card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "var(--dash-text)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Printer size={15} /> {printer.name}</span>
                        {printer.purpose && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                            background: "var(--dash-accent-soft)", color: "var(--dash-accent)",
                            textTransform: "uppercase", letterSpacing: "0.04em",
                          }}>
                            {printer.purpose === "kitchen" ? "🍳 Cozinha"
                              : printer.purpose === "cashier" ? "💰 Caixa"
                              : "📋 Geral"}
                          </span>
                        )}
                        {printer.paper_width && (
                          <span style={{ fontSize: 10, color: "var(--dash-text-muted)" }}>{printer.paper_width}mm</span>
                        )}
                        {printer.is_active === false && (
                          <span style={{ ...s.warn, fontSize: 10, padding: "2px 8px" }}>Inativa</span>
                        )}
                      </div>
                      <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {isExpanded && cats.length > 0
                          ? cats.map((c: any) => (
                              <span key={c.category_id} style={s.chip}>
                                {c.categories?.name || c.category_id}
                                <button
                                  style={s.removeX}
                                  onClick={() => handleRemoveCat(c.id, printer.id)}
                                  title="Remover"
                                >
                                  ×
                                </button>
                              </span>
                            ))
                          : !isExpanded && (
                              <span style={{ color: "var(--dash-text-muted)", fontSize: 12 }}>
                                {allMappings.filter((m) => m.printer_config_id === printer.id).length} categorias
                              </span>
                            )}
                        {loadingCats === printer.id && (
                          <span style={{ color: "var(--dash-text-muted)", fontSize: 12 }}>carregando...</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0, marginLeft: 10 }}>
                      <button
                        style={{
                          padding: "5px 10px", borderRadius: 8,
                          border: "1px solid var(--dash-card-border)",
                          background: printer.is_active === false ? "var(--dash-warning-soft)" : "transparent",
                          color: printer.is_active === false ? "var(--dash-warning)" : "var(--dash-text-muted)",
                          fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                        }}
                        onClick={() => handleToggleActive(printer)}
                        title={printer.is_active === false ? "Ativar impressora" : "Desativar impressora"}
                      >
                        {printer.is_active === false ? "Ativar" : "Pausar"}
                      </button>
                      <button
                        style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid var(--dash-card-border)", background: "transparent", color: "var(--dash-text-muted)", fontSize: 12, cursor: "pointer" }}
                        onClick={() => handleExpand(printer.id)}
                      >
                        {isExpanded ? "Recolher" : "Configurar"}
                      </button>
                      <button style={s.deleteBtn} onClick={() => handleDeletePrinter(printer.id)}>
                        Excluir
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--dash-card-border)" }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <select
                          style={s.select}
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAddCat(printer.id, e.target.value);
                              e.target.value = "";
                            }
                          }}
                        >
                          <option value="">+ Vincular categoria...</option>
                          {availableCatsFor(printer.id).map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                              {allMappings.some(
                                (m) => m.category_id === cat.id && m.printer_config_id !== printer.id
                              )
                                ? " (mover de outra impressora)"
                                : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      {cats.length === 0 && loadingCats !== printer.id && (
                        <p style={{ color: "var(--dash-text-muted)", fontSize: 12, marginTop: 8 }}>
                          Nenhuma categoria vinculada. Selecione acima.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {printers.length > 0 && (
            <p style={{ color: "var(--dash-text-muted)", fontSize: 11, textAlign: "center", marginTop: 4 }}>
              Cada categoria só pode estar em uma impressora. Ao vincular, remove da anterior automaticamente.
            </p>
          )}
        </>
      )}

      {/* ── TAB: FORMATO COMANDA ── */}
      {printerTab === "comandas" && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dash-text)", marginBottom: 14 }}>
            Configurar formato da comanda
          </div>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>

            {/* Opções */}
            <div style={{ flex: 1, minWidth: 240 }}>

              {/* Tamanho do papel */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: "var(--dash-text-muted)", marginBottom: 6 }}>Largura do papel</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {["58mm", "80mm"].map(size => (
                    <button key={size} onClick={() => {
                      const updated = { ...comandaConfig, paperWidth: size };
                      setComandaConfig(updated);
                      saveComandaConfig(updated);
                    }} style={{
                      flex: 1, padding: "8px 12px", borderRadius: 10, border: "none", cursor: "pointer",
                      background: comandaConfig.paperWidth === size ? "var(--dash-accent-soft)" : "var(--dash-card)",
                      color: comandaConfig.paperWidth === size ? "var(--dash-accent)" : "var(--dash-text-muted)",
                      fontSize: 12, fontWeight: 600, boxShadow: "var(--dash-shadow)",
                    }}>{size}</button>
                  ))}
                </div>
              </div>

              {/* Campos a exibir */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: "var(--dash-text-muted)", marginBottom: 8 }}>Campos na comanda</div>
                {[
                  { key: "showLogo", label: "Logo do restaurante" },
                  { key: "showOrderNumber", label: "Número do pedido" },
                  { key: "showDateTime", label: "Data e hora" },
                  { key: "showTable", label: "Número da mesa" },
                  { key: "showWaiter", label: "Nome do garçom" },
                  { key: "showCustomer", label: "Nome do cliente" },
                  { key: "showItems", label: "Itens do pedido" },
                  { key: "showPrices", label: "Preços individuais" },
                  { key: "showTotal", label: "Total" },
                  { key: "showNotes", label: "Observações" },
                ].map(field => (
                  <label key={field.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", cursor: "pointer" }}>
                    <button onClick={() => toggleField(field.key)} style={{
                      width: 24, height: 24, borderRadius: 6, border: "none", cursor: "pointer",
                      background: comandaConfig[field.key] ? "rgba(0,200,120,0.15)" : "rgba(128,128,128,0.15)",
                      color: comandaConfig[field.key] ? "#00c878" : "rgba(128,128,128,0.5)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700,
                    }}>{comandaConfig[field.key] ? "✓" : ""}</button>
                    <span style={{ fontSize: 12, color: "var(--dash-text-secondary)" }}>{field.label}</span>
                  </label>
                ))}
              </div>

              {/* Texto rodapé */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: "var(--dash-text-muted)", marginBottom: 6 }}>Texto no rodapé</div>
                <input
                  value={comandaConfig.footerText || ""}
                  onChange={(e) => setComandaConfig(prev => ({ ...prev, footerText: e.target.value }))}
                  onBlur={() => saveComandaConfig(comandaConfig)}
                  placeholder="Ex: Obrigado pela preferência!"
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: 10,
                    background: "var(--dash-card-hover)", border: "1px solid var(--dash-border)",
                    color: "var(--dash-text)", fontSize: 12, outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Preview da comanda */}
            <div style={{
              width: comandaConfig.paperWidth === "58mm" ? 200 : 260,
              flexShrink: 0, padding: 16, borderRadius: 8,
              background: "#ffffff", color: "#000000",
              fontFamily: "'Courier New', monospace",
              fontSize: 10, lineHeight: 1.6,
              boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
              alignSelf: "flex-start",
            }}>
              {comandaConfig.showLogo && (
                <div style={{ textAlign: "center", fontWeight: 900, fontSize: 14, marginBottom: 8 }}>
                  {unitName}
                </div>
              )}
              {comandaConfig.showOrderNumber && <div>Pedido: #0042</div>}
              {comandaConfig.showDateTime && <div>{new Date().toLocaleString("pt-BR")}</div>}
              {comandaConfig.showTable && <div>Mesa: 05</div>}
              {comandaConfig.showWaiter && <div>Garçom: João</div>}
              {comandaConfig.showCustomer && <div>Cliente: Maria</div>}
              <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />
              {comandaConfig.showItems && (
                <>
                  <div>1x Burgão Du Goias</div>
                  <div>2x Coca-Cola 600ml</div>
                  <div>1x Batata Frita G</div>
                </>
              )}
              {comandaConfig.showPrices && (
                <>
                  <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>1x Burgão</span><span>R$42,90</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>2x Coca</span><span>R$18,00</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>1x Batata G</span><span>R$24,90</span></div>
                </>
              )}
              {comandaConfig.showTotal && (
                <>
                  <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />
                  <div style={{ fontWeight: 900, fontSize: 13, textAlign: "right" }}>Total: R$85,80</div>
                </>
              )}
              {comandaConfig.showNotes && <div style={{ marginTop: 6, fontStyle: "italic" }}>Obs: Sem cebola</div>}
              {comandaConfig.footerText && (
                <div style={{ textAlign: "center", marginTop: 8, fontSize: 9 }}>{comandaConfig.footerText}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: ROTEAMENTO ── */}
      {printerTab === "roteamento" && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dash-text)", marginBottom: 6 }}>
            Roteamento por categoria
          </div>
          <div style={{ fontSize: 11, color: "var(--dash-text-muted)", marginBottom: 14 }}>
            Defina qual impressora recebe os pedidos de cada categoria.
          </div>

          {printers.length === 0 ? (
            <div style={{ textAlign: "center", padding: 30, color: "var(--dash-text-muted)", fontSize: 12 }}>
              Cadastre pelo menos uma impressora na aba "Impressoras" primeiro.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {categories.map(cat => {
                const mapping = allMappings.find(m => m.category_id === cat.id);
                return (
                  <div key={cat.id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px", borderRadius: 12,
                    background: "var(--dash-card)",
                    border: "1px solid var(--dash-border)",
                  }}>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "var(--dash-text)" }}>{cat.name}</span>
                    <select
                      value={mapping?.printer_config_id || ""}
                      onChange={async (e) => {
                        const printerId = e.target.value;
                        if (!printerId) {
                          if (mapping) {
                            await removeCategoryFromPrinter(mapping.id);
                            await loadAllMappings();
                          }
                          return;
                        }
                        if (mapping) {
                          await supabase
                            .from("printer_category_mappings")
                            .update({ printer_config_id: printerId })
                            .eq("id", mapping.id);
                        } else {
                          await addCategoryToprinter(printerId, cat.id);
                        }
                        await loadAllMappings();
                      }}
                      style={{
                        padding: "6px 28px 6px 10px", borderRadius: 8,
                        background: "var(--dash-card-hover)", border: "1px solid var(--dash-border)",
                        color: "var(--dash-text)", fontSize: 11, outline: "none", cursor: "pointer",
                        appearance: "none", WebkitAppearance: "none",
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M3 5l3 3 3-3'/%3E%3C/svg%3E")`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 8px center",
                      }}
                    >
                      <option value="">Nenhuma</option>
                      {printers.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
