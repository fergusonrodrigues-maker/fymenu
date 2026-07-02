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

// Number of months billed per cycle (used to compute the total charge).
const CYCLE_MONTHS: Record<BillingCycle, number> = {
  monthly: 1,
  quarterly: 3,
  semestral: 6,
};

interface PlanFeatures {
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
      monthly: 19990,
      quarterly: 17990,
      semestral: 15990,
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
      monthly: 12990,
      quarterly: 10990,
      semestral: 9990,
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
      deliveryLink: true,
      tableLink: true,
      crm: true,
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

const PLAN_ORDER: PlanCode[] = ["menu", "menupro", "business"];

/**
 * Total amount billed at once for the cycle (per-month × months).
 *   getTotalCents("menupro", "quarterly") → 32970  (R$ 109,90 × 3)
 */
export function getTotalCents(plan: PlanCode, cycle: BillingCycle): number {
  return PLANS[plan].prices[cycle] * CYCLE_MONTHS[cycle];
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

// ── Plan name helpers (migrated from lib/plan.ts) ────────────────────────────

/**
 * Normaliza variantes/aliases ("menu_pro", "pro", "Menu", "BUSINESS"...) em um
 * PlanCode canônico. Default: "menu" (free tier visível).
 */
export function normalizePlanName(plan: string | undefined | null): PlanCode {
  if (!plan) return "menu";
  const p = plan.toLowerCase().trim();
  if (p === "business") return "business";
  if (p === "menupro" || p === "menu_pro" || p === "pro") return "menupro";
  return "menu";
}

/** Label legível do plano: "Menu" | "MenuPro" | "Business". */
export function planLabel(plan: string | undefined | null): string {
  return PLANS[normalizePlanName(plan)].name;
}

/** Limite de unidades por plano (Menu=2, MenuPro=3, Business=5). */
export function maxUnits(plan: string | undefined | null): number {
  return PLANS[normalizePlanName(plan)].maxUnits;
}

/**
 * Fonte canônica de "tem plano ativo". Cortesia (is_complimentary=true) bypassa
 * todas as outras checagens — admin libera acesso permanente independente de
 * pagamento. Sem cortesia: precisa de plan != null E status === "active".
 *
 * Use em gates de criação de unidade, produto, publicar cardápio, features
 * premium, etc.
 */
export function hasActivePlan(restaurant: {
  plan: string | null;
  is_complimentary: boolean;
  status: string;
}): boolean {
  if (restaurant.is_complimentary) return true;
  if (!restaurant.plan) return false;
  if (restaurant.status !== "active") return false;
  return true;
}

/** Limite de produtos no plano free (gate aplicado quando !hasActivePlan). */
export const FREE_PLAN_MAX_PRODUCTS = 10;

/** Limite de unidades no plano free (gate aplicado quando !hasActivePlan). */
export const FREE_PLAN_MAX_UNITS = 1;
