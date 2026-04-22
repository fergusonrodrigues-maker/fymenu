// Client/server-safe utilities for historical import feature.
// No "use server" — safe to import in both client and server code.

export type ImportTargetTable =
  | "order_intents"
  | "business_expenses"
  | "payments"
  | "inventory_movements"
  | "crm_customers";

export type ImportSourceMethod = "csv" | "ai_pdf" | "ai_image" | "manual";

export type ImportResult = {
  ok: boolean;
  batchId?: string;
  recordsCount?: number;
  errors?: string[];
  message?: string;
};

// ─── Money parsing: "R$ 1.234,56" | "1234,56" | "1234.56" → cents ────────────
export function parseMoneyToCents(raw: string): number | null {
  if (!raw && raw !== "0") return null;
  const str = String(raw).trim()
    .replace(/R\$\s*/g, "")
    .replace(/\s/g, "");

  // BR format: 1.234,56
  if (/^\d{1,3}(\.\d{3})*(,\d{1,2})?$/.test(str)) {
    const norm = str.replace(/\./g, "").replace(",", ".");
    return Math.round(parseFloat(norm) * 100);
  }
  // EN format: 1234.56 or 1234
  const num = parseFloat(str.replace(",", "."));
  if (isNaN(num)) return null;
  return Math.round(num * 100);
}
