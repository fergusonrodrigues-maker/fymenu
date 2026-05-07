// Single source of truth for plan pricing + feature gating.
// Vigente a partir de 06/05/2026.
//
// All prices stored in integer cents (BRL). UI must format with formatCents
// from lib/money.ts.

export type PlanCode = "menu" | "menupro" | "business";

// Internal canonical cycle keys.
export type BillingCycle = "monthly" | "quarterly" | "semestral";

// Mapping to Asaas API conventions ("MONTHLY" | "QUARTERLY" | "SEMIANNUALLY").
export const ASAAS_CYCLE: Record<BillingCycle, "MONTHLY" | "QUARTERLY" | "SEMIANNUALLY"> = {
  monthly: "MONTHLY",
  quarterly: "QUARTERLY",
  semestral: "SEMIANNUALLY",
};

// Reverse map for routes that receive Asaas-style cycle names.
export const FROM_ASAAS_CYCLE: Record<"MONTHLY" | "QUARTERLY" | "SEMIANNUALLY", BillingCycle> = {
  MONTHLY: "monthly",
  QUARTERLY: "quarterly",
  SEMIANNUALLY: "semestral",
};

export const CYCLE_LABEL: Record<BillingCycle, string> = {
  monthly: "Mensal",
  quarterly: "Trimestral",
  semestral: "Semestral",
};

// Number of months billed per cycle (used to compute the total charge).
export const CYCLE_MONTHS: Record<BillingCycle, number> = {
  monthly: 1,
  quarterly: 3,
  semestral: 6,
};

export interface PlanFeatures {
  catalog: boolean;
  videoMenu: boolean;
  tvMode: boolean;
  analytics: boolean;
  analyticsAI: boolean;
  pdfReport: boolean;
  iaDescription: boolean;
  whatsappOrders: boolean;
  deliveryLink: boolean;
  tableLink: boolean;
  comanda: boolean;
  crm: boolean;
  crmBroadcast: boolean;
  stock: boolean;
  stockComplete: boolean;
  employees: boolean;
  finance: boolean;
  financeComplete: boolean;
  operations: boolean;
  waiterPortal: boolean;
  managerPortal: boolean;
  chatbotAI: boolean;
  callManagerButton: boolean;
}

export interface PlanDef {
  code: PlanCode;
  name: string;
  tagline: string;
  featured?: boolean;
  maxUnits: number;
  trialDays: number;
  hasTrial: boolean;
  // Per-month price in cents for each cycle (the user always sees a per-month figure).
  prices: Record<BillingCycle, number>;
  features: PlanFeatures;
}

const ALL_FALSE: PlanFeatures = {
  catalog: false,
  videoMenu: false,
  tvMode: false,
  analytics: false,
  analyticsAI: false,
  pdfReport: false,
  iaDescription: false,
  whatsappOrders: false,
  deliveryLink: false,
  tableLink: false,
  comanda: false,
  crm: false,
  crmBroadcast: false,
  stock: false,
  stockComplete: false,
  employees: false,
  finance: false,
  financeComplete: false,
  operations: false,
  waiterPortal: false,
  managerPortal: false,
  chatbotAI: false,
  callManagerButton: false,
};

export const PLANS: Record<PlanCode, PlanDef> = {
  menu: {
    code: "menu",
    name: "Menu",
    tagline: "Vitrine premium + Analytics IA",
    maxUnits: 2,
    trialDays: 0,
    hasTrial: false,
    prices: {
      monthly: 14900,
      quarterly: 12900,
      semestral: 9900,
    },
    features: {
      ...ALL_FALSE,
      catalog: true,
      videoMenu: true,
      tvMode: true,
      analytics: true,
      analyticsAI: true,
      pdfReport: true,
    },
  },
  menupro: {
    code: "menupro",
    name: "MenuPro",
    tagline: "Operação Restaurante completa",
    featured: true,
    maxUnits: 3,
    trialDays: 7,
    hasTrial: true,
    prices: {
      monthly: 49900,
      quarterly: 44900,
      semestral: 39900,
    },
    features: {
      ...ALL_FALSE,
      catalog: true,
      videoMenu: true,
      tvMode: true,
      analytics: true,
      analyticsAI: true,
      pdfReport: true,
      iaDescription: true,
      whatsappOrders: true,
      deliveryLink: true,
      tableLink: true,
      comanda: true,
      crm: true,
      stock: true,
      finance: true,
      operations: true,
      waiterPortal: true,
    },
  },
  business: {
    code: "business",
    name: "Business",
    tagline: "Gestão Completa",
    maxUnits: 5,
    trialDays: 7,
    hasTrial: true,
    prices: {
      monthly: 125000,
      quarterly: 112900,
      semestral: 99900,
    },
    features: {
      catalog: true,
      videoMenu: true,
      tvMode: true,
      analytics: true,
      analyticsAI: true,
      pdfReport: true,
      iaDescription: true,
      whatsappOrders: true,
      deliveryLink: true,
      tableLink: true,
      comanda: true,
      crm: true,
      crmBroadcast: true,
      stock: true,
      stockComplete: true,
      employees: true,
      finance: true,
      financeComplete: true,
      operations: true,
      waiterPortal: true,
      managerPortal: true,
      chatbotAI: true,
      callManagerButton: true,
    },
  },
};

export const PLAN_ORDER: PlanCode[] = ["menu", "menupro", "business"];

// Referral commission paid to the partner (recurring).
// Indicated client gets NO discount.
export const REFERRAL_COMMISSION = 0.10;

/**
 * Per-month price in cents for a given plan/cycle.
 *   getPriceCents("menupro", "quarterly") → 44900
 */
export function getPriceCents(plan: PlanCode, cycle: BillingCycle): number {
  return PLANS[plan].prices[cycle];
}

/**
 * Total amount billed at once for the cycle (per-month × months).
 *   getTotalCents("menupro", "quarterly") → 134700  (R$ 449 × 3)
 */
export function getTotalCents(plan: PlanCode, cycle: BillingCycle): number {
  return PLANS[plan].prices[cycle] * CYCLE_MONTHS[cycle];
}

/**
 * Discount percentage of a non-monthly cycle vs the plan's monthly price.
 * Returns an integer (0-100). Returns 0 for "monthly".
 *   getCycleSavingsPercent("menu", "semestral") → 34
 */
export function getCycleSavingsPercent(plan: PlanCode, cycle: BillingCycle): number {
  if (cycle === "monthly") return 0;
  const monthly = PLANS[plan].prices.monthly;
  const cycleMonth = PLANS[plan].prices[cycle];
  if (!monthly) return 0;
  return Math.round(((monthly - cycleMonth) / monthly) * 100);
}

// ── Asaas-cycle convenience: routes that receive "MONTHLY"/etc. ───────────────
// Map keyed by the Asaas-style names so legacy code can lookup directly.
export const PLAN_PRICES_ASAAS: Record<PlanCode, Record<"MONTHLY" | "QUARTERLY" | "SEMIANNUALLY", number>> = {
  menu: {
    MONTHLY:      PLANS.menu.prices.monthly      * CYCLE_MONTHS.monthly,
    QUARTERLY:    PLANS.menu.prices.quarterly    * CYCLE_MONTHS.quarterly,
    SEMIANNUALLY: PLANS.menu.prices.semestral    * CYCLE_MONTHS.semestral,
  },
  menupro: {
    MONTHLY:      PLANS.menupro.prices.monthly      * CYCLE_MONTHS.monthly,
    QUARTERLY:    PLANS.menupro.prices.quarterly    * CYCLE_MONTHS.quarterly,
    SEMIANNUALLY: PLANS.menupro.prices.semestral    * CYCLE_MONTHS.semestral,
  },
  business: {
    MONTHLY:      PLANS.business.prices.monthly      * CYCLE_MONTHS.monthly,
    QUARTERLY:    PLANS.business.prices.quarterly    * CYCLE_MONTHS.quarterly,
    SEMIANNUALLY: PLANS.business.prices.semestral    * CYCLE_MONTHS.semestral,
  },
};

// ── Feature gating helpers ────────────────────────────────────────────────────

export type FeatureKey = keyof PlanFeatures;

/**
 * Verifica se um plano tem acesso a uma feature.
 * Considera unit_features overrides se passar unitFeatures (ex: cliente Menu
 * com chatbot liberado manualmente pelo suporte).
 */
export function hasPlanFeature(
  plan: PlanCode | string | null | undefined,
  feature: FeatureKey,
  unitFeatures?: Record<string, boolean>
): boolean {
  // Override por unidade tem prioridade (admin pode liberar feature manual)
  if (unitFeatures && feature in unitFeatures) {
    return unitFeatures[feature];
  }

  // Fallback pro schema do plano
  const normalized = (plan ?? "").toString().toLowerCase();
  const planDef = (PLANS as Record<string, PlanDef | undefined>)[normalized];
  if (!planDef) return false;
  return planDef.features[feature] === true;
}

/**
 * Server-side: lança erro 403 se não tiver acesso. Use em server actions e
 * API routes que precisam ser bloqueadas. NUNCA chamar do client.
 */
export function assertPlanFeature(
  plan: PlanCode | string | null | undefined,
  feature: FeatureKey,
  unitFeatures?: Record<string, boolean>
): void {
  if (!hasPlanFeature(plan, feature, unitFeatures)) {
    const error = new Error(
      `Feature "${feature}" não disponível no plano "${plan ?? "unknown"}"`
    );
    (error as { code?: string }).code = "FEATURE_NOT_AVAILABLE";
    (error as { statusCode?: number }).statusCode = 403;
    throw error;
  }
}

/**
 * Retorna o menor plano que tem acesso à feature (pra mensagem de upgrade).
 *   minPlanForFeature("chatbotAI") -> "business"
 *   minPlanForFeature("catalog")   -> "menu"
 */
export function minPlanForFeature(feature: FeatureKey): PlanCode | null {
  for (const code of PLAN_ORDER) {
    if (PLANS[code].features[feature] === true) return code;
  }
  return null;
}
