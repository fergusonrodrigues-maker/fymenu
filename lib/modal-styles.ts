/**
 * Modal Design System — Reference Styles
 *
 * Use these values inline in each modal (do not import directly — copy values).
 * All colors use CSS custom properties so they work in dark and light mode.
 *
 * CSS variables defined in app/globals.css:
 *   --dash-accent        : #00ffae (dark) / #00b37e (light)
 *   --dash-accent-soft   : rgba(0,255,174,0.1) (dark) / rgba(0,179,126,0.1) (light)
 *   --dash-card          : panel background
 *   --dash-card-hover    : slightly lighter panel bg (used for input backgrounds)
 *   --dash-border        : subtle border color
 *   --dash-text          : primary text
 *   --dash-text-muted    : secondary / muted text
 *   --dash-shadow        : embossed inset shadow
 */

export const modalStyles = {
  // ── Inputs ──────────────────────────────────────────────────────────────────
  input: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 10,
    background: "var(--dash-card-hover)",
    border: "1px solid var(--dash-border)",
    color: "var(--dash-text)",
    fontSize: 13,
    fontWeight: 500,
    outline: "none",
    boxSizing: "border-box" as const,
    transition: "border-color 0.2s",
  },

  // Apply via onFocus/onBlur on the element
  inputFocus: {
    borderColor: "var(--dash-accent)",
    boxShadow: "0 0 0 2px rgba(0,255,174,0.08)",
  },
  inputBlur: {
    borderColor: "var(--dash-border)",
    boxShadow: "none",
  },

  // ── Buttons ─────────────────────────────────────────────────────────────────

  // Primary — Salvar, Criar, Confirmar
  btnPrimary: {
    padding: "8px 18px",
    borderRadius: 10,
    border: "none",
    cursor: "pointer",
    background: "var(--dash-accent-soft)",
    color: "var(--dash-accent)",
    fontSize: 12,
    fontWeight: 700,
    boxShadow: "0 1px 0 rgba(0,255,174,0.08) inset, 0 -1px 0 rgba(0,0,0,0.15) inset",
    transition: "all 0.2s",
  },

  // Secondary — neutral actions, links
  btnSecondary: {
    padding: "8px 16px",
    borderRadius: 10,
    border: "none",
    cursor: "pointer",
    background: "var(--dash-card)",
    color: "var(--dash-text-muted)",
    fontSize: 12,
    fontWeight: 600,
    boxShadow: "var(--dash-shadow)",
    transition: "all 0.2s",
  },

  // AI / Special features
  btnAI: {
    padding: "8px 16px",
    borderRadius: 10,
    border: "none",
    cursor: "pointer",
    background: "rgba(168,85,247,0.06)",
    color: "rgba(168,85,247,0.7)",
    fontSize: 12,
    fontWeight: 600,
    boxShadow: "0 1px 0 rgba(168,85,247,0.06) inset, 0 -1px 0 rgba(0,0,0,0.12) inset",
    transition: "all 0.2s",
  },

  // Danger — remove, cancel, delete
  btnDanger: {
    width: 28,
    height: 28,
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    background: "rgba(248,113,113,0.06)",
    color: "rgba(248,113,113,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    transition: "all 0.2s",
  },

  // ── Toggle ──────────────────────────────────────────────────────────────────
  toggle: (active: boolean) => ({
    width: 28,
    height: 28,
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    background: active ? "var(--dash-accent-soft)" : "var(--dash-card)",
    color: active ? "var(--dash-accent)" : "var(--dash-text-muted)",
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    fontSize: 12,
    fontWeight: 700,
    transition: "all 0.2s",
  }),

  // ── Cards ───────────────────────────────────────────────────────────────────
  card: {
    padding: "14px",
    borderRadius: 14,
    background: "var(--dash-card)",
    border: "1px solid var(--dash-border)",
    boxShadow: "var(--dash-shadow)",
    marginBottom: 8,
    transition: "all 0.2s",
  },

  // ── Typography ──────────────────────────────────────────────────────────────
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "var(--dash-text)",
    marginBottom: 10,
  },

  label: {
    fontSize: 11,
    fontWeight: 600,
    color: "var(--dash-text-muted)",
    display: "block" as const,
    marginBottom: 4,
  },

  // ── Pills / Chips ────────────────────────────────────────────────────────────
  pill: (active: boolean) => ({
    padding: "4px 12px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    background: active ? "var(--dash-accent-soft)" : "var(--dash-card)",
    color: active ? "var(--dash-accent)" : "var(--dash-text-muted)",
    fontSize: 11,
    fontWeight: 600,
    transition: "all 0.15s",
  }),

  // ── Badge ───────────────────────────────────────────────────────────────────
  badge: (color: string) => ({
    display: "inline-flex",
    padding: "2px 8px",
    borderRadius: 6,
    background: `${color}12`,
    color: color,
    fontSize: 10,
    fontWeight: 700,
  }),
};
