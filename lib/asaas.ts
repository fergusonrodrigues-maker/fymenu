import { createAdminClient } from "@/lib/supabase/admin";

export class AsaasError extends Error {
  rawText: string;
  httpStatus: number;
  asaasUrl: string;
  responseHeaders: Record<string, string>;

  constructor(message: string, rawText: string, httpStatus: number, asaasUrl: string, headers: Headers) {
    super(message);
    this.name = "AsaasError";
    this.rawText = rawText;
    this.httpStatus = httpStatus;
    this.asaasUrl = asaasUrl;
    this.responseHeaders = Object.fromEntries(headers.entries());
  }
}

const ASAAS_BASE =
  process.env.ASAAS_SANDBOX === "true"
    ? "https://sandbox.asaas.com/api/v3"
    : "https://api.asaas.com/v3";

const ASAAS_KEY = process.env.ASAAS_API_KEY!;

export const PLAN_PRICES: Record<string, Record<string, number>> = {
  menu:     { MONTHLY: 19990, QUARTERLY: 53970, SEMIANNUALLY: 95940 },
  menupro:  { MONTHLY: 39990, QUARTERLY: 107970, SEMIANNUALLY: 191940 },
  business: { MONTHLY: 159900, QUARTERLY: 419700, SEMIANNUALLY: 719400 },
};

export const PLAN_LABELS: Record<string, string> = {
  menu: "Menu",
  menupro: "MenuPro",
  business: "Business",
};

export const CYCLE_LABELS: Record<string, string> = {
  MONTHLY: "Mensal",
  QUARTERLY: "Trimestral",
  SEMIANNUALLY: "Semestral",
};

export async function asaasRequest(method: string, endpoint: string, body?: any) {
  const url = `${ASAAS_BASE}${endpoint}`;
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "access_token": ASAAS_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const rawText = await res.text();
  console.log(`[ASAAS] ${method} ${endpoint} → ${res.status}`, rawText.substring(0, 500));

  let data: any;
  try {
    data = JSON.parse(rawText);
  } catch {
    console.error("[ASAAS] Non-JSON response:", rawText.substring(0, 500));
    throw new AsaasError(
      rawText || "Resposta inválida do gateway de pagamento",
      rawText, res.status, url, res.headers,
    );
  }

  if (!res.ok) {
    const msg = data?.errors?.[0]?.description || data?.message || JSON.stringify(data);
    console.error("[ASAAS] Error response:", data);
    throw new AsaasError(msg, rawText, res.status, url, res.headers);
  }

  return data;
}

export async function getOrCreateAsaasCustomer(restaurant: any): Promise<string> {
  const admin = createAdminClient();

  const { data: sub } = await admin
    .from("subscriptions")
    .select("asaas_customer_id")
    .eq("restaurant_id", restaurant.id)
    .not("asaas_customer_id", "is", null)
    .limit(1)
    .maybeSingle();

  if (sub?.asaas_customer_id) return sub.asaas_customer_id;

  const customer = await asaasRequest("POST", "/customers", {
    name: restaurant.name,
    cpfCnpj: restaurant.owner_document || undefined,
    phone: restaurant.whatsapp || restaurant.owner_phone || undefined,
    externalReference: restaurant.id,
  });

  return customer.id;
}
