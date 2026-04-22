"use client";

import { useState } from "react";
import { revertImportBatch } from "../importar/actions";

type Batch = {
  id: string;
  target_table: string;
  source_method: string;
  source_filename: string | null;
  records_count: number;
  date_range_start: string | null;
  date_range_end: string | null;
  status: string;
  created_at: string;
  reverted_at: string | null;
  notes: string | null;
};

const TABLE_LABELS: Record<string, string> = {
  order_intents: "Pedidos",
  business_expenses: "Custos",
  payments: "Pagamentos / Receitas",
  inventory_movements: "Estoque",
  crm_customers: "Clientes / CRM",
};

const METHOD_LABELS: Record<string, string> = {
  csv: "CSV",
  ai_pdf: "IA (PDF)",
  ai_image: "IA (Imagem)",
  manual: "Manual",
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR");
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; bg: string; color: string }> = {
    completed: { label: "Concluído", bg: "rgba(22,163,74,0.12)", color: "#16a34a" },
    reverted: { label: "Revertido", bg: "rgba(107,114,128,0.12)", color: "#6b7280" },
    failed: { label: "Falhou", bg: "rgba(220,38,38,0.1)", color: "#dc2626" },
    processing: { label: "Processando", bg: "rgba(234,179,8,0.12)", color: "#ca8a04" },
  };
  const c = config[status] ?? config.failed;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 6, background: c.bg, color: c.color }}>
      {c.label}
    </span>
  );
}

export default function ImportacoesClient({ batches, restaurantPlan }: { batches: Batch[]; restaurantPlan: string }) {
  const [revertTarget, setRevertTarget] = useState<Batch | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [reverting, setReverting] = useState(false);
  const [revertResult, setRevertResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [batchList, setBatchList] = useState<Batch[]>(batches);
  const [detailBatch, setDetailBatch] = useState<Batch | null>(null);

  async function handleRevert() {
    if (!revertTarget || confirmText !== "REVERTER") return;
    setReverting(true);
    try {
      const result = await revertImportBatch(revertTarget.id);
      if (result.ok) {
        setBatchList(prev => prev.map(b =>
          b.id === revertTarget.id
            ? { ...b, status: "reverted", reverted_at: new Date().toISOString() }
            : b
        ));
        setRevertResult({ ok: true, message: result.message ?? "Lote revertido com sucesso." });
      } else {
        setRevertResult({ ok: false, message: result.message ?? "Erro ao reverter." });
      }
    } catch (err: any) {
      setRevertResult({ ok: false, message: err.message ?? "Erro inesperado." });
    } finally {
      setReverting(false);
      setRevertTarget(null);
      setConfirmText("");
    }
  }

  return (
    <div style={{ minHeight: "100dvh", background: "var(--dash-bg)", padding: "32px 24px" }}>
      {/* Header */}
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
          <a href="/painel" style={{ fontSize: 13, color: "var(--dash-accent)", textDecoration: "none", fontWeight: 600 }}>
            ← Voltar ao painel
          </a>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--dash-text)" }}>Importações Históricas</div>
            <div style={{ fontSize: 13, color: "var(--dash-text-muted)", marginTop: 2 }}>
              Gerencie e reverta lotes de importação de dados
            </div>
          </div>
        </div>

        {revertResult && (
          <div style={{
            background: revertResult.ok ? "rgba(22,163,74,0.08)" : "rgba(220,38,38,0.08)",
            border: `1px solid ${revertResult.ok ? "rgba(22,163,74,0.2)" : "rgba(220,38,38,0.2)"}`,
            borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 13,
            color: revertResult.ok ? "#16a34a" : "#dc2626", fontWeight: 600,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            {revertResult.message}
            <button onClick={() => setRevertResult(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "inherit", lineHeight: 1 }}>×</button>
          </div>
        )}

        {batchList.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--dash-text-muted)" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Nenhuma importação encontrada</div>
            <div style={{ fontSize: 13, marginBottom: 24 }}>Importe dados históricos pelo painel para vê-los aqui.</div>
            <a href="/painel" style={{ fontSize: 13, color: "var(--dash-accent)", fontWeight: 600, textDecoration: "none" }}>
              Ir ao painel →
            </a>
          </div>
        ) : (
          <div style={{ background: "var(--dash-card)", border: "1px solid var(--dash-border)", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "var(--dash-card)" }}>
                    {["Data import.", "Tipo", "Método", "Arquivo", "Período dos dados", "Registros", "Status", "Ações"].map(h => (
                      <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontWeight: 700, fontSize: 11, color: "var(--dash-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--dash-border)", whiteSpace: "nowrap" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {batchList.map(batch => (
                    <tr key={batch.id} style={{ borderBottom: "1px solid var(--dash-border)" }}>
                      <td style={{ padding: "11px 14px", color: "var(--dash-text-muted)", whiteSpace: "nowrap" }}>
                        {fmtDateTime(batch.created_at)}
                      </td>
                      <td style={{ padding: "11px 14px", fontWeight: 600, color: "var(--dash-text)", whiteSpace: "nowrap" }}>
                        {TABLE_LABELS[batch.target_table] ?? batch.target_table}
                      </td>
                      <td style={{ padding: "11px 14px", color: "var(--dash-text-muted)" }}>
                        {METHOD_LABELS[batch.source_method] ?? batch.source_method}
                      </td>
                      <td style={{ padding: "11px 14px", color: "var(--dash-text-muted)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {batch.source_filename ?? "—"}
                      </td>
                      <td style={{ padding: "11px 14px", color: "var(--dash-text-muted)", whiteSpace: "nowrap" }}>
                        {batch.date_range_start
                          ? `${fmtDate(batch.date_range_start)} – ${fmtDate(batch.date_range_end)}`
                          : "—"}
                      </td>
                      <td style={{ padding: "11px 14px", fontWeight: 700, color: "var(--dash-text)" }}>
                        {batch.records_count ?? 0}
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <StatusBadge status={batch.status} />
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <button
                            onClick={() => setDetailBatch(batch)}
                            style={{ fontSize: 12, fontWeight: 600, color: "var(--dash-accent)", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}
                          >
                            Detalhes
                          </button>
                          {batch.status === "completed" && (
                            <button
                              onClick={() => { setRevertTarget(batch); setConfirmText(""); setRevertResult(null); }}
                              style={{ fontSize: 12, fontWeight: 600, color: "#dc2626", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}
                            >
                              Reverter
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {detailBatch && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={() => setDetailBatch(null)}>
          <div style={{ background: "var(--dash-card)", borderRadius: 20, padding: "28px 24px", maxWidth: 480, width: "100%", boxShadow: "0 24px 80px rgba(0,0,0,0.3)" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--dash-text)", marginBottom: 20 }}>Detalhes do lote</div>
            {[
              ["ID do lote", detailBatch.id],
              ["Tipo", TABLE_LABELS[detailBatch.target_table] ?? detailBatch.target_table],
              ["Método", METHOD_LABELS[detailBatch.source_method] ?? detailBatch.source_method],
              ["Arquivo", detailBatch.source_filename ?? "—"],
              ["Registros", String(detailBatch.records_count ?? 0)],
              ["Status", detailBatch.status],
              ["Período dos dados", detailBatch.date_range_start ? `${fmtDate(detailBatch.date_range_start)} – ${fmtDate(detailBatch.date_range_end)}` : "—"],
              ["Importado em", fmtDateTime(detailBatch.created_at)],
              ["Revertido em", detailBatch.reverted_at ? fmtDateTime(detailBatch.reverted_at) : "—"],
              ["Notas", detailBatch.notes ?? "—"],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", gap: 12, marginBottom: 10, alignItems: "flex-start" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--dash-text-muted)", minWidth: 120, flexShrink: 0 }}>{label}</div>
                <div style={{ fontSize: 12, color: "var(--dash-text)", wordBreak: "break-all", fontFamily: label === "ID do lote" ? "monospace" : "inherit" }}>{value}</div>
              </div>
            ))}
            <button onClick={() => setDetailBatch(null)} style={{ marginTop: 16, padding: "10px 20px", borderRadius: 10, border: "1px solid var(--dash-border)", background: "transparent", color: "var(--dash-text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Revert confirmation modal */}
      {revertTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "var(--dash-card)", borderRadius: 20, padding: "28px 24px", maxWidth: 440, width: "100%", boxShadow: "0 24px 80px rgba(0,0,0,0.35)" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#dc2626", marginBottom: 8 }}>Reverter importação?</div>
            <div style={{ fontSize: 13, color: "var(--dash-text-muted)", lineHeight: 1.6, marginBottom: 16 }}>
              Tem certeza que deseja reverter esta importação?
            </div>
            <div style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.18)", borderRadius: 12, padding: "12px 14px", marginBottom: 20, fontSize: 13, color: "#dc2626", lineHeight: 1.6 }}>
              Isso vai apagar permanentemente{" "}
              <strong>{revertTarget.records_count ?? 0} registros</strong>{" "}
              do banco de dados ({TABLE_LABELS[revertTarget.target_table] ?? revertTarget.target_table}).{" "}
              <strong>Esta ação não pode ser desfeita.</strong>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--dash-text-muted)", marginBottom: 6 }}>
                Digite <strong style={{ color: "var(--dash-text)" }}>REVERTER</strong> para confirmar:
              </div>
              <input
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder="REVERTER"
                style={{
                  width: "100%", padding: "9px 12px", borderRadius: 10,
                  border: "1px solid var(--dash-border)",
                  background: "var(--dash-bg)",
                  color: "var(--dash-text)", fontSize: 14, fontWeight: 700,
                  boxSizing: "border-box", outline: "none", fontFamily: "inherit",
                  letterSpacing: "0.05em",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => { setRevertTarget(null); setConfirmText(""); }}
                style={{ flex: 1, padding: "11px 20px", borderRadius: 12, border: "1px solid var(--dash-border)", background: "transparent", color: "var(--dash-text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              >
                Cancelar
              </button>
              <button
                onClick={handleRevert}
                disabled={confirmText !== "REVERTER" || reverting}
                style={{
                  flex: 1, padding: "11px 20px", borderRadius: 12, border: "none",
                  background: confirmText === "REVERTER" && !reverting ? "#dc2626" : "rgba(220,38,38,0.3)",
                  color: "#fff", fontSize: 13, fontWeight: 700, cursor: confirmText === "REVERTER" && !reverting ? "pointer" : "not-allowed",
                  fontFamily: "inherit", transition: "background 0.15s",
                }}
              >
                {reverting ? "Revertendo..." : "Reverter permanentemente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
