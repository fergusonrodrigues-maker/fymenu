import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Per-process cache: unitId → last run date YYYY-MM-DD.
// Persists across server-action invocations on the same Node process.
const inMemoryCache = new Map<string, string>();

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Ensures that today's task_instances have been materialized for the unit and that
 * past pending instances have been expired. Idempotent: runs at most once per unit
 * per day. Safe to call from any server-side context — fails silently on errors.
 */
export async function ensureTodayTasks(unitId: string): Promise<void> {
  if (!unitId) return;
  const today = todayStr();

  if (inMemoryCache.get(unitId) === today) return;

  try {
    const supabase = createAdminClient();

    const { data: unit } = await supabase
      .from("units")
      .select("last_tasks_generated_at")
      .eq("id", unitId)
      .maybeSingle();

    const lastRun = (unit as any)?.last_tasks_generated_at as string | null;
    const lastRunDate = lastRun ? new Date(lastRun).toISOString().split("T")[0] : null;

    if (lastRunDate === today) {
      inMemoryCache.set(unitId, today);
      return;
    }

    await supabase.rpc("generate_task_instances_for_unit", {
      p_unit_id: unitId,
      p_target_date: today,
    });
    await supabase.rpc("expire_old_task_instances", {
      p_unit_id: unitId,
    });

    await supabase
      .from("units")
      .update({ last_tasks_generated_at: new Date().toISOString() })
      .eq("id", unitId);

    inMemoryCache.set(unitId, today);
  } catch (err) {
    console.error("ensureTodayTasks failed:", err);
  }
}
