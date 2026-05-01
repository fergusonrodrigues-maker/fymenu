/**
 * Single source of truth for monetary formatting/parsing.
 *
 * After the cents migration the database stores every monetary value as
 * integer cents (BRL). All UI must:
 *   - format with `formatCents` / `formatCentsBare` for display
 *   - parse user input with `parseToCents` before persisting
 *   - sum/subtract directly as integers (no toFixed, no Math.round)
 */

/**
 * Format cents as a localized BRL string with the "R$" prefix.
 *   4990   → "R$ 49,90"
 *   159990 → "R$ 1.599,90"
 */
export function formatCents(cents: number | string | null | undefined): string {
  const n = Number(cents ?? 0);
  if (!Number.isFinite(n)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n / 100);
}

/**
 * Same as `formatCents` but without the "R$" prefix — useful inside
 * inputs, tables, or compact UI where the prefix is rendered separately.
 *   4990 → "49,90"
 */
export function formatCentsBare(cents: number | string | null | undefined): string {
  const n = Number(cents ?? 0);
  if (!Number.isFinite(n)) return "0,00";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n / 100);
}

/**
 * Parse a free-form user input into integer cents. Strips every non-digit
 * character so "R$ 49,90", "49.90", "4990" all return 4990. Empty/invalid
 * returns 0.
 */
export function parseToCents(input: string | number | null | undefined): number {
  if (typeof input === "number") return Math.round(input);
  const digits = String(input ?? "").replace(/\D/g, "");
  return digits ? parseInt(digits, 10) : 0;
}
