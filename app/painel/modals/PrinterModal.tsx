"use client";

import { useEffect, useState, useCallback } from "react";
import { usePrinterConfig } from "@/lib/hooks/usePrinterConfig";
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

  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // { printerId -> [{ id, category_id, categories: { name } }] }
  const [catMap, setCatMap] = useState<Map<string, any[]>>(new Map());
  // All mappings for exclusivity check: category_id -> { id, printer_config_id }
  const [allMappings, setAllMappings] = useState<CategoryMapping[]>([]);
  const [loadingCats, setLoadingCats] = useState<string | null>(null);

  useEffect(() => {
    fetchPrinters(unitId);
  }, [unitId, fetchPrinters]);

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
    const result = await createPrinter(newName.trim());
    if (result) setNewName("");
    setCreating(false);
  };

  const handleRemoveCat = async (mappingId: string, printerId: string) => {
    await removeCategoryFromPrinter(mappingId);
    await loadCatsForPrinter(printerId);
    await loadAllMappings();
  };

  const handleAddCat = async (printerId: string, categoryId: string) => {
    // Exclusive: remove from other printer first
    const existing = allMappings.find(
      (m) => m.category_id === categoryId && m.printer_config_id !== printerId
    );
    if (existing) {
      await removeCategoryFromPrinter(existing.id);
      // Refresh the old printer's cat list if it's expanded
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

  // Which categories have no printer assigned
  const assignedCategoryIds = new Set(allMappings.map((m) => m.category_id));
  const unassignedCats = categories.filter((c) => !assignedCategoryIds.has(c.id));

  // Categories available to add to a given printer (not already in it)
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
      background: "var(--dash-card-hover)",
      color: "var(--dash-text)", fontSize: 13,
    } as React.CSSProperties,
    removeX: {
      marginLeft: 2, background: "none", border: "none",
      color: "var(--dash-accent)", cursor: "pointer",
      padding: "0 2px", fontSize: 13, lineHeight: 1,
    } as React.CSSProperties,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 4 }}>
      {/* Error display */}
      {hookError && (
        <div style={{
          padding: "10px 14px", borderRadius: 12,
          background: "var(--dash-danger-soft)", border: "1px solid rgba(248,113,113,0.25)",
          fontSize: 12, color: "var(--dash-danger)",
        }}>
          ⚠️ {hookError}
        </div>
      )}

      {/* Add new printer */}
      <div style={{ display: "flex", gap: 8 }}>
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

      {/* Unassigned categories warning */}
      {unassignedCats.length > 0 && printers.length > 0 && (
        <div style={{
          padding: "10px 14px", borderRadius: 12,
          background: "var(--dash-warning-soft)", border: "1px solid rgba(251,191,36,0.2)",
          fontSize: 12, color: "var(--dash-warning)",
        }}>
          <strong>⚠️ Sem impressora:</strong>{" "}
          {unassignedCats.map((c) => c.name).join(", ")}
        </div>
      )}

      {/* Printer list */}
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
                  <div style={{ fontWeight: 700, fontSize: 15, color: "var(--dash-text)" }}>
                    🖨️ {printer.name}
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

      {/* Help text */}
      {printers.length > 0 && (
        <p style={{ color: "var(--dash-text-muted)", fontSize: 11, textAlign: "center", marginTop: 4 }}>
          Cada categoria só pode estar em uma impressora. Ao vincular, remove da anterior automaticamente.
        </p>
      )}
    </div>
  );
}
