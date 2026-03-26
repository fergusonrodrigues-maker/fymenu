import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type TimeclockAction = "entry" | "break_start" | "break_end" | "exit";

const ACTION_FIELDS: Record<TimeclockAction, keyof typeof FIELD_MAP> = {
  entry: "entry_time",
  break_start: "break_start",
  break_end: "break_end",
  exit: "exit_time",
};

const FIELD_MAP = {
  entry_time: "entry_time",
  break_start: "break_start",
  break_end: "break_end",
  exit_time: "exit_time",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employee_id, action, observations } = body as {
      employee_id: string;
      action: TimeclockAction;
      observations?: string;
    };

    if (!employee_id || !action) {
      return NextResponse.json({ error: "employee_id e action são obrigatórios" }, { status: 400 });
    }

    if (!["entry", "break_start", "break_end", "exit"].includes(action)) {
      return NextResponse.json({ error: "action inválida" }, { status: 400 });
    }

    const supabase = await createClient();

    // Verify employee exists
    const { data: employee } = await supabase
      .from("employees")
      .select("id, unit_id")
      .eq("id", employee_id)
      .eq("is_active", true)
      .single();

    if (!employee) {
      return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 });
    }

    const today = new Date().toISOString().split("T")[0];
    const now = new Date().toISOString();
    const fieldName = ACTION_FIELDS[action];

    // Upsert today's time_log record
    const { data: existing } = await supabase
      .from("time_logs")
      .select("id, entry_time, exit_time, total_minutes")
      .eq("employee_id", employee_id)
      .eq("log_date", today)
      .maybeSingle();

    if (existing) {
      // Update the specific field
      const updates: any = { [fieldName]: now, updated_at: now };

      // Calculate total_minutes if logging exit
      if (action === "exit" && existing.entry_time) {
        const entry = new Date(existing.entry_time).getTime();
        const exit = new Date(now).getTime();
        updates.total_minutes = Math.round((exit - entry) / 60000);
        updates.status = "complete";
      }

      if (observations) updates.observations = observations;

      const { data, error } = await supabase
        .from("time_logs")
        .update(updates)
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, log: data, action });
    } else {
      // Create new record (only makes sense for "entry")
      if (action !== "entry") {
        return NextResponse.json({ error: "Registre a entrada primeiro" }, { status: 400 });
      }

      const { data, error } = await supabase
        .from("time_logs")
        .insert({
          employee_id,
          unit_id: employee.unit_id,
          log_date: today,
          entry_time: now,
          status: "open",
          observations: observations || null,
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, log: data, action });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET — check today's status for an employee
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const employee_id = searchParams.get("employee_id");

  if (!employee_id) {
    return NextResponse.json({ error: "employee_id é obrigatório" }, { status: 400 });
  }

  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: log } = await supabase
    .from("time_logs")
    .select("*")
    .eq("employee_id", employee_id)
    .eq("log_date", today)
    .maybeSingle();

  // Determine current state
  let current_state: "not_started" | "working" | "on_break" | "done" = "not_started";
  if (log) {
    if (log.exit_time) current_state = "done";
    else if (log.break_start && !log.break_end) current_state = "on_break";
    else if (log.entry_time) current_state = "working";
  }

  return NextResponse.json({ log: log ?? null, current_state });
}
