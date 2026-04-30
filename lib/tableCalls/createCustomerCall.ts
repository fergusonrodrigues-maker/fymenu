"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import crypto from "crypto";

export type CreateCustomerCallResult = {
  ok: boolean;
  error?: string;
  message?: string;
  call_id?: string;
};

export async function createCustomerCall(params: {
  unit_id: string;
  mesa_id?: string | null;
  table_number: number;
  type?: "waiter" | "bill" | "manager";
  comanda_id?: string | null;
  customer_name?: string | null;
}): Promise<CreateCustomerCallResult> {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown";
  const ip_hash = crypto
    .createHash("sha256")
    .update(ip + (process.env.IP_HASH_SALT || "fymenu"))
    .digest("hex")
    .slice(0, 32);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_table_call", {
    p_unit_id: params.unit_id,
    p_mesa_id: params.mesa_id ?? null,
    p_table_number: params.table_number,
    p_type: params.type ?? "waiter",
    p_comanda_id: params.comanda_id ?? null,
    p_customer_name: params.customer_name ?? null,
    p_ip_hash: ip_hash,
  });

  if (error) {
    return { ok: false, error: "rpc_error", message: error.message };
  }
  return data as CreateCustomerCallResult;
}
