"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type PointType =
  | "clock_in"
  | "break_start"
  | "break_end"
  | "lunch_start"
  | "lunch_end"
  | "clock_out";

export type PointStatus =
  | "off"          // no entries today
  | "working"      // clock_in done, no break/lunch open, no clock_out
  | "on_break"     // break_start without break_end
  | "on_lunch"     // lunch_start without lunch_end
  | "ended";       // clock_out done

export type PointEntry = {
  id: string;
  type: PointType;
  timestamp: string;
};

export type PointStateResult = {
  status: PointStatus;
  entries: PointEntry[];
  lastEntry: PointEntry | null;
  clockInAt: string | null;   // first clock_in of today (for "Trabalhando desde")
  clockOutAt: string | null;  // last clock_out (for "Encerrou às")
};

async function authenticate(token: string) {
  if (!token) throw new Error("Sessão inválida");
  const db = createAdminClient();
  const { data: session } = await db
    .from("employee_sessions")
    .select("employee_id, unit_id, expires_at, revoked_at")
    .eq("token", token)
    .maybeSingle();

  if (!session || session.revoked_at) throw new Error("Sessão inválida");
  if (new Date(session.expires_at) < new Date()) throw new Error("Sessão expirada");

  return { db, employeeId: session.employee_id as string, unitId: session.unit_id as string };
}

function startOfTodayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function deriveStatus(entries: PointEntry[]): PointStatus {
  if (entries.length === 0) return "off";
  const last = entries[entries.length - 1];
  switch (last.type) {
    case "clock_in":     return "working";
    case "break_start":  return "on_break";
    case "break_end":    return "working";
    case "lunch_start":  return "on_lunch";
    case "lunch_end":    return "working";
    case "clock_out":    return "ended";
    default:             return "working";
  }
}

export async function getCurrentPointStatus(token: string): Promise<PointStateResult> {
  const { db, employeeId } = await authenticate(token);

  const { data: rows, error } = await db
    .from("time_entries")
    .select("id, type, timestamp")
    .eq("employee_id", employeeId)
    .gte("timestamp", startOfTodayISO())
    .order("timestamp", { ascending: true });

  if (error) throw new Error(error.message);

  const entries = (rows ?? []) as PointEntry[];
  const status = deriveStatus(entries);

  const clockInAt  = entries.find((e) => e.type === "clock_in")?.timestamp ?? null;
  const clockOuts  = entries.filter((e) => e.type === "clock_out");
  const clockOutAt = clockOuts.length > 0 ? clockOuts[clockOuts.length - 1].timestamp : null;

  return {
    status,
    entries,
    lastEntry: entries.length > 0 ? entries[entries.length - 1] : null,
    clockInAt,
    clockOutAt,
  };
}

const ALLOWED_NEXT: Record<PointStatus, PointType[]> = {
  off:      ["clock_in"],
  working:  ["lunch_start", "break_start", "clock_out"],
  on_break: ["break_end"],
  on_lunch: ["lunch_end"],
  ended:    ["clock_in"],
};

const TYPE_LABELS: Record<PointType, string> = {
  clock_in:    "entrada",
  break_start: "início de pausa",
  break_end:   "fim de pausa",
  lunch_start: "início de almoço",
  lunch_end:   "fim de almoço",
  clock_out:   "saída",
};

export async function registerTimeEntry(
  token: string,
  type: PointType,
): Promise<{ success: true; status: PointStatus; entry: PointEntry }> {
  const { db, employeeId, unitId } = await authenticate(token);

  // Re-derive current status to validate sequence (anti-double-click).
  const { data: rows, error: readErr } = await db
    .from("time_entries")
    .select("id, type, timestamp")
    .eq("employee_id", employeeId)
    .gte("timestamp", startOfTodayISO())
    .order("timestamp", { ascending: true });
  if (readErr) throw new Error(readErr.message);

  const entries = (rows ?? []) as PointEntry[];
  const current = deriveStatus(entries);

  if (!ALLOWED_NEXT[current].includes(type)) {
    throw new Error(
      `Não é possível registrar ${TYPE_LABELS[type]} no estado atual.`,
    );
  }

  const timestamp = new Date().toISOString();
  const { data: inserted, error: insErr } = await db
    .from("time_entries")
    .insert({ employee_id: employeeId, unit_id: unitId, type, timestamp })
    .select("id, type, timestamp")
    .single();

  if (insErr) throw new Error(insErr.message);

  // Best-effort employees.current_status sync (mirrors legacy /funcionario flow).
  try {
    const newStatus = deriveStatus([...entries, inserted as PointEntry]);
    const empUpdate: Record<string, unknown> = {
      current_status: newStatus === "working" ? "working"
                    : newStatus === "ended"   ? "off"
                    : newStatus === "on_break" || newStatus === "on_lunch" ? "break"
                    : "off",
    };
    if (type === "clock_in") empUpdate.last_clock_in = timestamp;
    await db.from("employees").update(empUpdate).eq("id", employeeId);
  } catch { /* non-fatal */ }

  const newEntries = [...entries, inserted as PointEntry];
  return {
    success: true,
    status: deriveStatus(newEntries),
    entry: inserted as PointEntry,
  };
}
