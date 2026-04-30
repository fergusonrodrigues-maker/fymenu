"use server";

import { createCustomerCall } from "@/lib/tableCalls/createCustomerCall";

const VALID_REASONS = ["order", "question", "close_bill"] as const;
type Reason = (typeof VALID_REASONS)[number];

const REASON_TO_TYPE: Record<Reason, "waiter" | "bill" | "manager"> = {
  order: "waiter",
  question: "waiter",
  close_bill: "bill",
};

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

  const result = await createCustomerCall({
    unit_id: unitId,
    table_number: tableNumber,
    type: REASON_TO_TYPE[reason as Reason],
  });

  if (!result.ok || !result.call_id) {
    throw new Error(result.message || "Não foi possível chamar agora.");
  }

  return { callId: result.call_id, success: true };
}
