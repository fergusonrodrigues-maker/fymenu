import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const employee_id = searchParams.get("employee_id");
  const days = parseInt(searchParams.get("days") ?? "7", 10);

  if (!employee_id) {
    return NextResponse.json({ error: "employee_id é obrigatório" }, { status: 400 });
  }

  const supabase = await createClient();

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const { data: logs, error } = await supabase
    .from("time_logs")
    .select("*")
    .eq("employee_id", employee_id)
    .gte("log_date", since)
    .order("log_date", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Compute summary
  const completeLogs = (logs ?? []).filter((l) => l.status === "complete");
  const totalMinutes = completeLogs.reduce((sum, l) => sum + (l.total_minutes ?? 0), 0);
  const daysWorked = completeLogs.length;

  // Get analytics from view
  const { data: analytics } = await supabase
    .from("employee_hours_analytics")
    .select("hours_30d, hours_60d, hours_90d, days_worked_30d, days_worked_60d, days_worked_90d")
    .eq("employee_id", employee_id)
    .maybeSingle();

  return NextResponse.json({
    logs: logs ?? [],
    summary: {
      days_in_range: daysWorked,
      total_minutes: totalMinutes,
      total_hours: Math.round((totalMinutes / 60) * 10) / 10,
    },
    analytics: analytics ?? null,
  });
}
