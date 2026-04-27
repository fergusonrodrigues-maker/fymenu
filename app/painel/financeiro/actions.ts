"use server";

import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/audit/logActivity";

export async function createExpense(input: {
  restaurantId: string;
  unitId: string;
  name: string;
  category: string;
  amount: number;
  isRecurring: boolean;
  date: string;
}): Promise<{ data?: any; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("business_expenses")
    .insert({
      unit_id: input.unitId,
      name: input.name,
      category: input.category,
      amount: input.amount,
      is_recurring: input.isRecurring,
      recurrence: input.isRecurring ? "monthly" : "one_time",
      date: input.date,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity({
    restaurantId: input.restaurantId,
    unitId: input.unitId,
    module: 'financial',
    action: 'create_expense',
    entityType: 'expense',
    entityId: data?.id ?? null,
    entityName: input.name,
    changes: {
      amount: { to: input.amount },
      category: { to: input.category },
      is_recurring: { to: input.isRecurring },
    },
  });

  return { data };
}

export async function deleteExpense(
  id: string,
  restaurantId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();

  let expenseInfo: { name: string; unit_id: string } | null = null;
  try {
    const { data } = await supabase
      .from("business_expenses")
      .select("name, unit_id")
      .eq("id", id)
      .single();
    expenseInfo = data;
  } catch {}

  const { error } = await supabase.from("business_expenses").delete().eq("id", id);
  if (error) return { error: error.message };

  await logActivity({
    restaurantId,
    unitId: expenseInfo?.unit_id ?? null,
    module: 'financial',
    action: 'delete_expense',
    entityType: 'expense',
    entityId: id,
    entityName: expenseInfo?.name ?? null,
  });

  return {};
}
