// Centralized plan feature definitions — single source of truth
// Plan names as stored in the database
export type PlanName = "menu" | "menupro" | "business";

export const PLAN_FEATURES: Record<PlanName, {
  maxUnits: number;
  comanda: boolean;
  analytics_ai: boolean;
  financeiro_custos: boolean;
  equipe_completa: boolean;
  estoque_completo: boolean;
  crm_disparo: boolean;
  portal_gerente: boolean;
  ponto: boolean;
  ia_sugestao: boolean;
  import_ia: boolean;
  pdf_relatorio: boolean;
  whatsapp: boolean;
}> = {
  menu: {
    maxUnits: 1,
    comanda: false,
    analytics_ai: false,
    financeiro_custos: false,
    equipe_completa: false,
    estoque_completo: false,
    crm_disparo: false,
    portal_gerente: false,
    ponto: false,
    ia_sugestao: false,
    import_ia: false,
    pdf_relatorio: false,
    whatsapp: false,
  },
  menupro: {
    maxUnits: 3,
    comanda: true,
    analytics_ai: true,
    financeiro_custos: false,
    equipe_completa: false,
    estoque_completo: false,
    crm_disparo: false,
    portal_gerente: false,
    ponto: false,
    ia_sugestao: true,
    import_ia: true,
    pdf_relatorio: true,
    whatsapp: false,
  },
  business: {
    maxUnits: 4,
    comanda: true,
    analytics_ai: true,
    financeiro_custos: true,
    equipe_completa: true,
    estoque_completo: true,
    crm_disparo: true,
    portal_gerente: true,
    ponto: true,
    ia_sugestao: true,
    import_ia: true,
    pdf_relatorio: true,
    whatsapp: true,
  },
};

/** Normalizes legacy or variant plan names to the canonical PlanName */
export function normalizePlanName(plan: string | undefined | null): PlanName {
  if (!plan) return "menu";
  const p = plan.toLowerCase().trim();
  if (p === "business") return "business";
  if (p === "menupro" || p === "menu_pro" || p === "pro") return "menupro";
  return "menu"; // "menu", "basic", or anything else → menu
}

/** Returns true if the given plan includes the requested feature */
export function hasPlanFeature(
  plan: string | undefined | null,
  feature: keyof typeof PLAN_FEATURES["menu"]
): boolean {
  return Boolean(PLAN_FEATURES[normalizePlanName(plan)]?.[feature] ?? false);
}

/** Human-readable plan label */
export function planLabel(plan: string | undefined | null): string {
  const p = normalizePlanName(plan);
  if (p === "business") return "Business";
  if (p === "menupro") return "MenuPro";
  return "Menu";
}

/** Maximum number of units allowed for the plan */
export function maxUnits(plan: string | undefined | null): number {
  return PLAN_FEATURES[normalizePlanName(plan)]?.maxUnits ?? 1;
}
