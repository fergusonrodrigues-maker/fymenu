"use server";

import { createAdminClient } from "@/lib/supabase/admin";

const VALID_REASONS = ["order", "question", "close_bill"] as const;
type Reason = (typeof VALID_REASONS)[number];

export async function createTableCall(
  unitId: string,
  tableNumber: number,
  reason: string
): Promise<{ callId: string; success: true }> {
  if (!unitId) throw new Error("Unidade não informada");
  if (!Number.isInteger(tableNumber) || tableNumber < 1 || tableNumber > 999)
    throw new Error("Número de mesa inválido (1–999)");
  if (!VALID_REASONS.includes(reason as Reason))
    throw new Error("Motivo inválido");

  const db = createAdminClient();

  const { data: unit } = await db
    .from("units")
    .select("id")
    .eq("id", unitId)
    .maybeSingle();

  if (!unit) throw new Error("Unidade não encontrada");

  const { data, error } = await db
    .from("table_calls")
    .insert({
      unit_id: unitId,
      table_number: tableNumber,
      type: reason,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !data) throw new Error("Erro ao registrar chamada. Tente novamente.");

  return { callId: data.id, success: true };
}
