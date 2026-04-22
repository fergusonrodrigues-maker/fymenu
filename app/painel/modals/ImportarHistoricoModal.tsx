"use client";

import { useState, useRef, useCallback } from "react";
import Papa from "papaparse";
import type { Unit, Restaurant } from "../types";
import { createImportBatch } from "../importar/actions";
import { parseMoneyToCents } from "../importar/utils";
import type { ImportTargetTable } from "../importar/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Props {
  unit: Unit | null;
  restaurant: Restaurant;
  initialType?: ImportTargetTable;
  onClose: () => void;
  onOpenPlano: () => void;
}

type Step = 1 | 2 | 3 | 4 | 5;

interface FieldDef {
  key: string;
  label: string;
  required: boolean;
  type: "date" | "money" | "text" | "number";
  hint?: string;
}

interface TypeConfig {
  label: string;
  icon: string;
  desc: string;
  table: ImportTargetTable;
  templateFile: string;
  fields: FieldDef[];
}

const DATE_FORMAT_LABELS: Record<string, string> = {
  "DD/MM/YYYY": "DD/MM/AAAA (padrão Brasil)",
  "YYYY-MM-DD": "AAAA-MM-DD (ISO)",
  "MM/DD/YYYY": "MM/DD/AAAA (EUA)",
};

const TYPE_CONFIGS: TypeConfig[] = [
  {
    label: "Pedidos",
    icon: "🛒",
    desc: "Pedidos históricos com valor, cliente e forma de pagamento",
    table: "order_intents",
    templateFile: "/templates/import/pedidos.csv",
    fields: [
      { key: "occurred_at",     label: "Data",             required: true,  type: "date" },
      { key: "total",           label: "Valor total",      required: true,  type: "money" },
      { key: "customer_name",   label: "Nome do cliente",  required: false, type: "text" },
      { key: "customer_phone",  label: "Telefone",         required: false, type: "text" },
      { key: "payment_method",  label: "Forma de pagamento", required: false, type: "text" },
      { key: "source",          label: "Origem",           required: false, type: "text" },
      { key: "notes",           label: "Observações",      required: false, type: "text" },
    ],
  },
  {
    label: "Custos",
    icon: "💼",
    desc: "Despesas operacionais, compras e custos fixos/variáveis",
    table: "business_expenses",
    templateFile: "/templates/import/custos.csv",
    fields: [
      { key: "date",     label: "Data",       required: true,  type: "date" },
      { key: "name",     label: "Descrição",  required: true,  type: "text" },
      { key: "amount",   label: "Valor",      required: true,  type: "money" },
      { key: "category", label: "Categoria",  required: false, type: "text" },
      { key: "notes",    label: "Observações", required: false, type: "text" },
    ],
  },
  {
    label: "Pagamentos / Receitas",
    icon: "💰",
    desc: "Recebimentos avulsos, depósitos e receitas não vinculadas a pedidos",
    table: "payments",
    templateFile: "/templates/import/pagamentos.csv",
    fields: [
      { key: "occurred_at", label: "Data",    required: true,  type: "date" },
      { key: "amount",      label: "Valor",   required: true,  type: "money" },
      { key: "method",      label: "Método",  required: false, type: "text" },
      { key: "status",      label: "Status",  required: false, type: "text" },
      { key: "notes",       label: "Observações", required: false, type: "text" },
    ],
  },
  {
    label: "Estoque",
    icon: "📦",
    desc: "Movimentações de estoque: compras, perdas, ajustes retroativos",
    table: "inventory_movements",
    templateFile: "/templates/import/estoque.csv",
    fields: [
      { key: "occurred_at",        label: "Data",          required: true,  type: "date" },
      { key: "type",               label: "Tipo",          required: false, type: "text", hint: "purchase | usage | loss | adjustment | return" },
      { key: "quantity",           label: "Quantidade",    required: true,  type: "number" },
      { key: "inventory_item_id",  label: "Item (nome)",   required: false, type: "text" },
      { key: "cost_total",         label: "Custo total",   required: false, type: "money" },
      { key: "notes",              label: "Observações",   required: false, type: "text" },
    ],
  },
  {
    label: "Clientes / CRM",
    icon: "👥",
    desc: "Base de clientes histórica com histórico de pedidos e gastos",
    table: "crm_customers",
    templateFile: "/templates/import/clientes.csv",
    fields: [
      { key: "name",            label: "Nome",             required: true,  type: "text" },
      { key: "phone",           label: "Telefone",         required: false, type: "text" },
      { key: "email",           label: "E-mail",           required: false, type: "text" },
      { key: "neighborhood",    label: "Bairro",           required: false, type: "text" },
      { key: "city",            label: "Cidade",           required: false, type: "text" },
      { key: "first_order_at",  label: "Data 1º pedido",   required: false, type: "date" },
      { key: "total_orders",    label: "Total de pedidos", required: false, type: "number" },
      { key: "total_spent",     label: "Total gasto",      required: false, type: "money" },
    ],
  },
];

// ─── Date parsing ─────────────────────────────────────────────────────────────
function parseDate(raw: string, fmt: string): string | null {
  if (!raw?.trim()) return null;
  const s = raw.trim();

  if (fmt === "DD/MM/YYYY") {
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (!m) return null;
    const [, d, mo, y] = m;
    const year = y.length === 2 ? (parseInt(y) > 50 ? `19${y}` : `20${y}`) : y;
    return `${year}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  if (fmt === "MM/DD/YYYY") {
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (!m) return null;
    const [, mo, d, y] = m;
    const year = y.length === 2 ? (parseInt(y) > 50 ? `19${y}` : `20${y}`) : y;
    return `${year}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // YYYY-MM-DD or ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return null;
}

function isWithin3Years(isoDate: string): boolean {
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return false;
  const min = Date.now() - 3 * 365.25 * 24 * 60 * 60 * 1000;
  return d.getTime() >= min && d.getTime() <= Date.now() + 60_000;
}

// ─── Auto-detect CSV column → field mapping ───────────────────────────────────
const AUTO_MAP: Record<string, string> = {
  data: "occurred_at", date: "occurred_at", fecha: "occurred_at",
  data_pedido: "occurred_at", data_venda: "occurred_at",
  // business_expenses date key
  date_expense: "date",
  // money
  valor: "total", value: "total", total: "total", amount: "amount",
  // customer
  nome_cliente: "customer_name", cliente: "customer_name", customer: "customer_name",
  telefone_cliente: "customer_phone", fone: "customer_phone", phone: "phone",
  // payment
  forma_pagamento: "payment_method", pagamento: "payment_method", metodo: "method",
  // expense
  descricao: "name", description: "name", nome: "name",
  categoria: "category", cat: "category",
  // inventory
  item: "inventory_item_id", produto: "inventory_item_id",
  tipo_movimentacao: "type", tipo: "type",
  quantidade: "quantity", qty: "quantity",
  custo_total: "cost_total",
  // crm
  email: "email", bairro: "neighborhood", cidade: "city",
  data_primeiro_pedido: "first_order_at",
  total_pedidos: "total_orders", total_gasto: "total_spent",
  // notes
  observacoes: "notes", obs: "notes", note: "notes",
  // origem
  origem: "source",
};

function autoDetectMapping(headers: string[], fields: FieldDef[]): Record<string, string> {
  const map: Record<string, string> = {};
  const fieldKeys = fields.map(f => f.key);

  for (const h of headers) {
    const normalized = h.toLowerCase().trim().replace(/[^a-z0-9_]/g, "_");
    // Exact match first
    if (fieldKeys.includes(normalized)) { map[h] = normalized; continue; }
    // Auto-map table
    if (AUTO_MAP[normalized] && fieldKeys.includes(AUTO_MAP[normalized])) {
      map[h] = AUTO_MAP[normalized];
    }
  }
  return map;
}

// ─── Row validation ───────────────────────────────────────────────────────────
type RowStatus = "ok" | "warning" | "error";

function validateRow(
  raw: Record<string, string>,
  mapping: Record<string, string>,
  fields: FieldDef[],
  dateFormat: string,
): { status: RowStatus; errors: string[]; warnings: string[]; mapped: Record<string, any> } {
  const mapped: Record<string, any> = {};
  const errors: string[] = [];
  const warnings: string[] = [];

  // Apply mapping
  for (const [csvCol, fieldKey] of Object.entries(mapping)) {
    if (fieldKey === "__ignore__") continue;
    mapped[fieldKey] = raw[csvCol] ?? "";
  }

  // Validate each field
  for (const field of fields) {
    const val = mapped[field.key];

    if (field.required && (!val || val === "")) {
      errors.push(`${field.label}: obrigatório`);
      continue;
    }
    if (!val || val === "") {
      if (field.type !== "date") warnings.push(`${field.label}: vazio`);
      continue;
    }

    if (field.type === "date") {
      const parsed = parseDate(String(val), dateFormat);
      if (!parsed) {
        errors.push(`${field.label}: formato de data inválido "${val}"`);
      } else {
        if (!isWithin3Years(parsed)) {
          errors.push(`${field.label}: data fora do range (máx. 3 anos atrás)`);
        } else {
          mapped[field.key] = parsed;
        }
      }
    } else if (field.type === "money") {
      const cents = parseMoneyToCents(String(val));
      if (cents === null) {
        errors.push(`${field.label}: valor inválido "${val}"`);
      } else {
        mapped[field.key] = val; // Keep raw — server action parses again
      }
    } else if (field.type === "number") {
      const n = parseFloat(String(val).replace(",", "."));
      if (isNaN(n)) {
        errors.push(`${field.label}: número inválido "${val}"`);
      }
    }
  }

  return {
    status: errors.length ? "error" : warnings.length ? "warning" : "ok",
    errors,
    warnings,
    mapped,
  };
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  section: { marginBottom: 24 } as React.CSSProperties,
  label: { fontSize: 12, fontWeight: 600, color: "var(--dash-text-muted)", marginBottom: 6, display: "block", textTransform: "uppercase" as const, letterSpacing: "0.05em" },
  inp: {
    width: "100%", padding: "9px 12px", borderRadius: 10,
    border: "1px solid var(--dash-border)",
    background: "var(--dash-card)",
    color: "var(--dash-text)", fontSize: 13, fontWeight: 500,
    boxSizing: "border-box" as const, outline: "none",
    fontFamily: "inherit",
  } as React.CSSProperties,
  select: {
    width: "100%", padding: "8px 10px", borderRadius: 10,
    border: "1px solid var(--dash-border)",
    background: "var(--dash-card)",
    color: "var(--dash-text)", fontSize: 12,
    boxSizing: "border-box" as const, outline: "none",
    fontFamily: "inherit", cursor: "pointer",
  } as React.CSSProperties,
  btnPrimary: {
    padding: "11px 24px", borderRadius: 12, border: "none",
    background: "var(--dash-accent)", color: "#000",
    fontSize: 14, fontWeight: 700, cursor: "pointer",
    fontFamily: "inherit", transition: "opacity 0.15s",
  } as React.CSSProperties,
  btnSecondary: {
    padding: "11px 20px", borderRadius: 12,
    border: "1px solid var(--dash-border)",
    background: "transparent", color: "var(--dash-text-muted)",
    fontSize: 14, fontWeight: 600, cursor: "pointer",
    fontFamily: "inherit",
  } as React.CSSProperties,
  btnDanger: {
    padding: "11px 20px", borderRadius: 12, border: "none",
    background: "#dc2626", color: "#fff",
    fontSize: 14, fontWeight: 700, cursor: "pointer",
    fontFamily: "inherit",
  } as React.CSSProperties,
};

// ─── Stepper ──────────────────────────────────────────────────────────────────
const STEPS = ["Tipo", "Upload", "Mapear", "Preview", "Confirmar"];

function Stepper({ current }: { current: Step }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 28 }}>
      {STEPS.map((label, i) => {
        const num = (i + 1) as Step;
        const done = num < current;
        const active = num === current;
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : undefined }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700,
                background: done ? "var(--dash-accent)" : active ? "var(--dash-accent)" : "var(--dash-border)",
                color: done || active ? "#000" : "var(--dash-text-muted)",
                transition: "all 0.2s",
              }}>
                {done ? "✓" : num}
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, color: active ? "var(--dash-accent)" : "var(--dash-text-muted)", whiteSpace: "nowrap" }}>
                {label}
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 1, background: done ? "var(--dash-accent)" : "var(--dash-border)", margin: "0 6px", marginBottom: 18, transition: "background 0.3s" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ImportarHistoricoModal({ unit, restaurant, initialType, onClose, onOpenPlano }: Props) {
  const isBusiness = restaurant.plan === "business";

  const [step, setStep] = useState<Step>(1);
  const [selectedType, setSelectedType] = useState<ImportTargetTable | null>(initialType ?? null);
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
  const [tagsInput, setTagsInput] = useState("");
  const [previewRows, setPreviewRows] = useState<{ raw: Record<string, string>; status: RowStatus; errors: string[]; warnings: string[]; mapped: Record<string, any> }[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStage, setImportStage] = useState("");
  const [result, setResult] = useState<{ batchId: string; count: number; errors?: string[] } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const typeConfig = TYPE_CONFIGS.find(t => t.table === selectedType);

  // ── File parsing ──────────────────────────────────────────────────────────
  function handleFile(f: File) {
    setFile(f);
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (res) => {
        const headers = res.meta.fields ?? [];
        const rows = res.data as Record<string, string>[];
        setCsvHeaders(headers);
        setCsvRows(rows);
        if (typeConfig) {
          setColumnMapping(autoDetectMapping(headers, typeConfig.fields));
        }
      },
    });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith(".csv") || f.name.endsWith(".tsv"))) handleFile(f);
  }

  // ── Build preview ─────────────────────────────────────────────────────────
  function buildPreview() {
    if (!typeConfig) return;
    const rows = csvRows.map(raw => {
      const v = validateRow(raw, columnMapping, typeConfig.fields, dateFormat);
      return { raw, ...v };
    });
    setPreviewRows(rows);
  }

  // ── Import ────────────────────────────────────────────────────────────────
  async function handleImport() {
    if (!unit || !typeConfig) return;
    setImporting(true);
    setImportError(null);
    setImportProgress(10);
    setImportStage("Criando lote de importação...");

    const validRows = previewRows.filter(r => r.status !== "error").map(r => r.mapped);
    const tags = tagsInput.split(",").map(t => t.trim()).filter(Boolean);

    try {
      setImportProgress(25);
      setImportStage("Validando linhas...");

      setImportProgress(50);
      setImportStage(`Inserindo registros (0 de ${validRows.length})...`);

      const res = await createImportBatch({
        unitId: unit.id,
        targetTable: typeConfig.table,
        sourceMethod: "csv",
        sourceFilename: file?.name ?? null,
        rows: validRows,
        tags,
      });

      setImportProgress(90);
      setImportStage("Finalizando...");

      await new Promise(r => setTimeout(r, 400));
      setImportProgress(100);
      setImportStage("Concluído!");

      if (res.ok) {
        setResult({ batchId: res.batchId!, count: res.recordsCount!, errors: res.errors });
      } else {
        setImportError(res.message ?? "Erro desconhecido na importação.");
      }
    } catch (err: any) {
      setImportError(err.message ?? "Erro ao importar.");
    } finally {
      setImporting(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PLAN GATE
  // ─────────────────────────────────────────────────────────────────────────
  if (!isBusiness) {
    return (
      <div style={{ padding: "8px 0", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <div style={{ fontSize: 17, fontWeight: 800, color: "var(--dash-text)", marginBottom: 10 }}>
          Recurso exclusivo Business
        </div>
        <div style={{ fontSize: 13, color: "var(--dash-text-muted)", lineHeight: 1.6, marginBottom: 24 }}>
          A importação histórica de dados está disponível apenas no plano Business.
          Faça upgrade para importar pedidos, custos, pagamentos, estoque e clientes de até 3 anos atrás.
        </div>
        <button onClick={onOpenPlano} style={{ ...S.btnPrimary, margin: "0 auto", display: "block" }}>
          Ver planos
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 5 — RESULT / IMPORTING
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 5) {
    if (result) {
      return (
        <div style={{ padding: "8px 0" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--dash-text)", marginBottom: 8 }}>
              Importação concluída!
            </div>
            <div style={{ fontSize: 14, color: "var(--dash-text-muted)" }}>
              <strong style={{ color: "var(--dash-accent)" }}>{result.count}</strong> registros adicionados ao histórico
            </div>
          </div>

          <div style={{ background: "var(--dash-card)", borderRadius: 12, padding: "12px 16px", marginBottom: 16, border: "1px solid var(--dash-border)" }}>
            <div style={{ fontSize: 11, color: "var(--dash-text-muted)", marginBottom: 4 }}>ID do lote (para rollback)</div>
            <div style={{ fontFamily: "monospace", fontSize: 12, color: "var(--dash-text)", wordBreak: "break-all" }}>{result.batchId}</div>
          </div>

          {result.errors && result.errors.length > 0 && (
            <div style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.2)", borderRadius: 12, padding: "12px 16px", marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#ca8a04", marginBottom: 8 }}>
                {result.errors.length} linhas com erro foram ignoradas
              </div>
              {result.errors.slice(0, 5).map((e, i) => (
                <div key={i} style={{ fontSize: 11, color: "var(--dash-text-muted)", marginBottom: 3 }}>• {e}</div>
              ))}
              {result.errors.length > 5 && <div style={{ fontSize: 11, color: "var(--dash-text-muted)" }}>...e mais {result.errors.length - 5}</div>}
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={{ ...S.btnSecondary, flex: 1 }}>Fechar</button>
          </div>
        </div>
      );
    }

    // Importing in progress
    return (
      <div style={{ padding: "16px 0" }}>
        <Stepper current={5} />

        {importError ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>❌</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#dc2626", marginBottom: 12 }}>Erro na importação</div>
            <div style={{ fontSize: 13, color: "var(--dash-text-muted)", marginBottom: 20 }}>{importError}</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => { setStep(4); setImportError(null); }} style={S.btnSecondary}>Voltar</button>
              <button onClick={onClose} style={S.btnSecondary}>Fechar</button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--dash-text)", marginBottom: 24 }}>
              {importing ? "Importando dados..." : "Concluído!"}
            </div>

            {[
              "Criando lote de importação...",
              "Validando linhas...",
              `Inserindo registros (${previewRows.filter(r => r.status !== "error").length} válidos)...`,
              "Finalizando...",
              "Concluído! ✓",
            ].map((stage, i) => {
              const pct = [10, 25, 50, 90, 100][i];
              const done = importProgress >= pct;
              const active = importStage === stage || (i === 4 && importProgress === 100);
              return (
                <div key={stage} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, opacity: done ? 1 : 0.35, transition: "opacity 0.3s" }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, background: done ? "var(--dash-accent)" : "var(--dash-border)", color: done ? "#000" : "var(--dash-text-muted)", flexShrink: 0, transition: "background 0.3s" }}>
                    {done ? "✓" : i + 1}
                  </div>
                  <div style={{ fontSize: 13, color: active ? "var(--dash-text)" : "var(--dash-text-muted)", fontWeight: active ? 600 : 400 }}>{stage}</div>
                </div>
              );
            })}

            <div style={{ marginTop: 20, background: "var(--dash-border)", borderRadius: 99, height: 6, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${importProgress}%`, background: "var(--dash-accent)", borderRadius: 99, transition: "width 0.4s ease" }} />
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1 — TIPO
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div>
        <Stepper current={1} />
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--dash-text)", marginBottom: 4 }}>
            Qual tipo de dado deseja importar?
          </div>
          <div style={{ fontSize: 13, color: "var(--dash-text-muted)" }}>
            Suporta dados de até 3 anos atrás. Selecione o tipo para continuar.
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
          {TYPE_CONFIGS.map(tc => {
            const sel = selectedType === tc.table;
            return (
              <button
                key={tc.table}
                onClick={() => setSelectedType(tc.table)}
                style={{
                  position: "relative", textAlign: "left",
                  padding: "16px 14px",
                  borderRadius: 14,
                  border: sel ? "2px solid var(--dash-accent)" : "1px solid var(--dash-border)",
                  background: sel ? "var(--dash-accent-soft)" : "var(--dash-card)",
                  cursor: "pointer", transition: "all 0.15s",
                  fontFamily: "inherit",
                }}
              >
                {sel && (
                  <div style={{ position: "absolute", top: 8, right: 8, width: 18, height: 18, borderRadius: "50%", background: "var(--dash-accent)", color: "#000", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>✓</div>
                )}
                <div style={{ fontSize: 26, marginBottom: 8 }}>{tc.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dash-text)", marginBottom: 4 }}>{tc.label}</div>
                <div style={{ fontSize: 11, color: "var(--dash-text-muted)", lineHeight: 1.4 }}>{tc.desc}</div>
                <a
                  href={tc.templateFile}
                  download
                  onClick={e => e.stopPropagation()}
                  style={{ display: "inline-block", marginTop: 10, fontSize: 11, color: "var(--dash-accent)", textDecoration: "none", fontWeight: 600 }}
                >
                  ↓ Modelo CSV
                </a>
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={() => setStep(2)} disabled={!selectedType} style={{ ...S.btnPrimary, opacity: selectedType ? 1 : 0.4 }}>
            Próximo →
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2 — UPLOAD
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 2) {
    return (
      <div>
        <Stepper current={2} />
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--dash-text)", marginBottom: 4 }}>
            Envie o arquivo CSV
          </div>
          <div style={{ fontSize: 13, color: "var(--dash-text-muted)" }}>
            Importando: <strong style={{ color: "var(--dash-text)" }}>{typeConfig?.label}</strong>
          </div>
        </div>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${file ? "var(--dash-accent)" : "var(--dash-border)"}`,
            borderRadius: 16,
            padding: "40px 24px",
            textAlign: "center",
            cursor: "pointer",
            background: file ? "var(--dash-accent-soft)" : "var(--dash-card)",
            transition: "all 0.2s",
            marginBottom: 20,
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.tsv"
            style={{ display: "none" }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          {file ? (
            <div>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📄</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--dash-text)", marginBottom: 4 }}>{file.name}</div>
              <div style={{ fontSize: 12, color: "var(--dash-text-muted)" }}>
                {(file.size / 1024).toFixed(1)} KB · {csvRows.length} linhas detectadas
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📂</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--dash-text)", marginBottom: 6 }}>
                Arraste o arquivo CSV aqui ou clique para selecionar
              </div>
              <div style={{ fontSize: 12, color: "var(--dash-text-muted)" }}>Aceita .csv e .tsv · Máximo 10 MB</div>
            </div>
          )}
        </div>

        <div style={{ marginBottom: 24 }}>
          <a
            href={typeConfig?.templateFile}
            download
            style={{ fontSize: 13, color: "var(--dash-accent)", textDecoration: "none", fontWeight: 600 }}
          >
            ↓ Baixar modelo CSV para {typeConfig?.label}
          </a>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
          <button onClick={() => setStep(1)} style={S.btnSecondary}>← Voltar</button>
          <button onClick={() => setStep(3)} disabled={!file || csvRows.length === 0} style={{ ...S.btnPrimary, opacity: file && csvRows.length > 0 ? 1 : 0.4 }}>
            Próximo →
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 3 — MAPEAMENTO
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 3 && typeConfig) {
    const requiredFields = typeConfig.fields.filter(f => f.required);
    const mappedKeys = Object.values(columnMapping).filter(v => v !== "__ignore__");
    const allRequiredMapped = requiredFields.every(f => mappedKeys.includes(f.key));

    return (
      <div>
        <Stepper current={3} />
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--dash-text)", marginBottom: 4 }}>
            Mapeie as colunas do CSV
          </div>
          <div style={{ fontSize: 13, color: "var(--dash-text-muted)" }}>
            Associe cada coluna do arquivo ao campo correto. Campos com <span style={{ color: "#dc2626" }}>*</span> são obrigatórios.
          </div>
        </div>

        {/* Date format selector */}
        <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--dash-text-muted)", whiteSpace: "nowrap" }}>Formato de data:</span>
          <select value={dateFormat} onChange={e => setDateFormat(e.target.value)} style={{ ...S.select, maxWidth: 220 }}>
            {Object.entries(DATE_FORMAT_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        {/* Mapping table */}
        <div style={{ border: "1px solid var(--dash-border)", borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", background: "var(--dash-card)", borderBottom: "1px solid var(--dash-border)", padding: "10px 14px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dash-text-muted)", textTransform: "uppercase" }}>Coluna no CSV</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dash-text-muted)", textTransform: "uppercase" }}>Campo do sistema</div>
          </div>
          {csvHeaders.map(h => (
            <div key={h} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", padding: "8px 14px", borderBottom: "1px solid var(--dash-border)", alignItems: "center" }}>
              <div style={{ fontSize: 12, color: "var(--dash-text)", fontWeight: 500, paddingRight: 8 }}>
                {h}
                {csvRows[0] && (
                  <div style={{ fontSize: 10, color: "var(--dash-text-muted)", marginTop: 2 }}>ex: {String(csvRows[0][h] ?? "").slice(0, 30)}</div>
                )}
              </div>
              <select
                value={columnMapping[h] ?? "__ignore__"}
                onChange={e => setColumnMapping(prev => ({ ...prev, [h]: e.target.value }))}
                style={S.select}
              >
                <option value="__ignore__">— Ignorar coluna —</option>
                {typeConfig.fields.map(f => (
                  <option key={f.key} value={f.key}>
                    {f.required ? "* " : ""}{f.label}{f.hint ? ` (${f.hint})` : ""}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {/* Tags */}
        <div style={{ marginBottom: 20 }}>
          <label style={S.label}>Tags (opcional)</label>
          <input
            value={tagsInput}
            onChange={e => setTagsInput(e.target.value)}
            placeholder="ex: importação-2024, fornecedor-x (separadas por vírgula)"
            style={S.inp}
          />
          <div style={{ fontSize: 11, color: "var(--dash-text-muted)", marginTop: 5 }}>Tags aplicadas a todos os registros deste lote</div>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
          <button onClick={() => setStep(2)} style={S.btnSecondary}>← Voltar</button>
          <button onClick={() => { buildPreview(); setStep(4); }} disabled={!allRequiredMapped} style={{ ...S.btnPrimary, opacity: allRequiredMapped ? 1 : 0.4 }}>
            Prévia →
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 4 — PREVIEW
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 4 && typeConfig) {
    const totalRows = previewRows.length;
    const validCount = previewRows.filter(r => r.status === "ok").length;
    const warnCount = previewRows.filter(r => r.status === "warning").length;
    const errCount = previewRows.filter(r => r.status === "error").length;
    const willImport = validCount + warnCount;
    const errorPct = totalRows > 0 ? errCount / totalRows : 0;
    const hasManyErrors = errorPct > 0.3;

    // Date range
    const dateField = typeConfig.table === "business_expenses" ? "date" : typeConfig.table === "crm_customers" ? "first_order_at" : "occurred_at";
    const validDates = previewRows
      .filter(r => r.status !== "error" && r.mapped[dateField])
      .map(r => r.mapped[dateField])
      .sort();
    const dateFrom = validDates[0];
    const dateTo = validDates[validDates.length - 1];

    function fmtDate(iso: string | undefined) {
      if (!iso) return "—";
      const d = new Date(iso);
      return d.toLocaleDateString("pt-BR");
    }

    const displayRows = previewRows.slice(0, 20);
    const colKeys = typeConfig.fields.filter(f => {
      return previewRows.some(r => r.mapped[f.key] !== undefined && r.mapped[f.key] !== "");
    }).map(f => f.key);

    return (
      <div>
        <Stepper current={4} />

        {/* Summary */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Total", value: totalRows, color: "var(--dash-text)" },
            { label: "Válidas", value: validCount + warnCount, color: "var(--dash-accent)" },
            { label: "Com erro", value: errCount, color: errCount ? "#dc2626" : "var(--dash-text-muted)" },
            { label: "Período", value: dateFrom ? `${fmtDate(dateFrom)} – ${fmtDate(dateTo)}` : "—", color: "var(--dash-text-muted)", small: true },
          ].map(s => (
            <div key={s.label} style={{ background: "var(--dash-card)", border: "1px solid var(--dash-border)", borderRadius: 12, padding: "10px 14px" }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--dash-text-muted)", marginBottom: 4, textTransform: "uppercase" }}>{s.label}</div>
              <div style={{ fontSize: (s as any).small ? 11 : 20, fontWeight: 700, color: s.color, lineHeight: 1.2 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {hasManyErrors && (
          <div style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 12, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#dc2626", fontWeight: 600 }}>
            ⚠️ Muitos erros detectados ({Math.round(errorPct * 100)}%). Revise o mapeamento de colunas.
          </div>
        )}

        {/* Preview table */}
        <div style={{ overflowX: "auto", marginBottom: 20, border: "1px solid var(--dash-border)", borderRadius: 12, maxHeight: 320, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "var(--dash-card)", position: "sticky", top: 0 }}>
                <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "var(--dash-text-muted)", borderBottom: "1px solid var(--dash-border)", whiteSpace: "nowrap" }}>#</th>
                <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "var(--dash-text-muted)", borderBottom: "1px solid var(--dash-border)" }}>Status</th>
                {colKeys.map(k => (
                  <th key={k} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "var(--dash-text-muted)", borderBottom: "1px solid var(--dash-border)", whiteSpace: "nowrap" }}>
                    {typeConfig.fields.find(f => f.key === k)?.label ?? k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--dash-border)" }}>
                  <td style={{ padding: "7px 12px", color: "var(--dash-text-muted)", fontWeight: 500 }}>{i + 1}</td>
                  <td style={{ padding: "7px 12px" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                      background: row.status === "ok" ? "rgba(22,163,74,0.12)" : row.status === "warning" ? "rgba(234,179,8,0.12)" : "rgba(220,38,38,0.1)",
                      color: row.status === "ok" ? "#16a34a" : row.status === "warning" ? "#ca8a04" : "#dc2626",
                    }}>
                      {row.status === "ok" ? "✓" : row.status === "warning" ? "⚠" : "✗"}
                      {(row.errors.length > 0 || row.warnings.length > 0) && (
                        <span title={[...row.errors, ...row.warnings].join("\n")} style={{ marginLeft: 4, cursor: "help" }}>ⓘ</span>
                      )}
                    </span>
                  </td>
                  {colKeys.map(k => (
                    <td key={k} style={{ padding: "7px 12px", color: "var(--dash-text)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {String(row.mapped[k] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {previewRows.length > 20 && (
            <div style={{ padding: "8px 14px", fontSize: 11, color: "var(--dash-text-muted)", background: "var(--dash-card)" }}>
              Mostrando as primeiras 20 linhas de {previewRows.length}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
          <button onClick={() => setStep(3)} style={S.btnSecondary}>← Voltar</button>
          <button
            onClick={() => { setStep(5); handleImport(); }}
            disabled={willImport === 0}
            style={{ ...S.btnPrimary, opacity: willImport > 0 ? 1 : 0.4 }}
          >
            Confirmar e importar {willImport} registros →
          </button>
        </div>
      </div>
    );
  }

  return null;
}
