import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SESSION_COOKIE, decodeSession } from "@/lib/funcionario-session";

/**
 * GET /api/funcionario/ponto?period=7d
 * Lista registros de ponto do funcionário (últimos 7 ou 30 dias).
 *
 * POST /api/funcionario/ponto
 * Smart punch: se não tem entrada aberta hoje → clock_in (working).
 *              se já tem entrada sem saída → clock_out (off).
 */

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const session = decodeSession(token);
  if (!session)
    return NextResponse.json({ error: "Sessão expirada" }, { status: 401 });

  const url = new URL(req.url);
  const days = url.searchParams.get("period") === "30d" ? 30 : 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const admin = createAdminClient();
  const { data: entries } = await admin
    .from("time_entries")
    .select("id, type, timestamp")
    .eq("employee_id", session.employee_id)
    .gte("timestamp", since)
    .order("timestamp", { ascending: false });

  return NextResponse.json({ entries: entries ?? [] });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const session = decodeSession(token);
  if (!session)
    return NextResponse.json({ error: "Sessão expirada" }, { status: 401 });

  const admin = createAdminClient();
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  // Check today's entries to determine if this is a clock_in or clock_out
  const { data: todayEntries } = await admin
    .from("time_entries")
    .select("id, type, timestamp")
    .eq("employee_id", session.employee_id)
    .gte("timestamp", todayStart.toISOString())
    .order("timestamp", { ascending: true });

  const entries = todayEntries ?? [];
  const lastClockIn = [...entries].filter(e => e.type === "clock_in").at(-1);
  const lastClockOut = [...entries].filter(e => e.type === "clock_out").at(-1);

  const isOpen =
    lastClockIn &&
    (!lastClockOut ||
      new Date(lastClockIn.timestamp) > new Date(lastClockOut.timestamp));

  const type = isOpen ? "clock_out" : "clock_in";
  const nextStatus = isOpen ? "off" : "working";
  const timestamp = now.toISOString();

  await admin.from("time_entries").insert({
    employee_id: session.employee_id,
    unit_id: session.unit_id,
    type,
    timestamp,
  });

  const updatePayload: Record<string, unknown> = { current_status: nextStatus };
  if (type === "clock_in") updatePayload.last_clock_in = timestamp;

  await admin
    .from("employees")
    .update(updatePayload)
    .eq("id", session.employee_id);

  return NextResponse.json({ type, timestamp, status: nextStatus });
}
