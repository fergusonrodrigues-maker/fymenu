import { createAdminClient } from "@/lib/supabase/admin";

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
  const res = await fetch(`${ASAAS_BASE}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "access_token": ASAAS_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.errors?.[0]?.description || JSON.stringify(data));
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
