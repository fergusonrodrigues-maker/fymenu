"use server";

import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureTodayTasks } from "@/lib/tarefas/ensureTodayTasks";

// ── authenticateEmployee ────────────────────────────────────────────────────
// Returns a discriminated union — never throws on user-facing failures so the
// client gets a usable error message instead of a Server Components exception.

export type AuthResult =
  | {
      ok: true;
      token: string;
      employeeId: string;
      name: string;
      roles: string[];
      unitId: string;
      unitName: string;
    }
  | { ok: false; error: string };

export async function authenticateEmployee(
  slug: string,
  username: string,
  password: string,
): Promise<AuthResult> {
  const db = createAdminClient();

  // 1) Resolve unit by slug
  const { data: unit, error: unitErr } = await db
    .from("units")
    .select("id, name")
    .eq("slug", slug)
    .maybeSingle();

  if (unitErr || !unit) return { ok: false, error: "Unidade não encontrada" };

  // 2) Find active employee by unit + username
  const { data: employee, error: empErr } = await db
    .from("employees")
    .select("id, name, role, password_hash, is_active")
    .eq("unit_id", unit.id)
    .eq("username", username)
    .eq("is_active", true)
    .maybeSingle();

  if (empErr || !employee) return { ok: false, error: "Usuário ou senha incorretos" };

  // 3) Verify password (bcrypt)
  if (!employee.password_hash) {
    return { ok: false, error: "Acesso não configurado. Fale com o gerente." };
  }

  const valid = await bcrypt.compare(password, employee.password_hash);
  if (!valid) return { ok: false, error: "Usuário ou senha incorretos" };

  // 4) Create session token
  const token = crypto.randomUUID();

  const { error: sessionErr } = await db.from("employee_sessions").insert({
    employee_id: employee.id,
    unit_id: unit.id,
    token,
  });

  if (sessionErr) return { ok: false, error: "Erro ao criar sessão. Tente novamente." };

  // Lazy-generate today's task instances + expire old ones (silent, idempotent).
  await ensureTodayTasks(unit.id);

  return {
    ok: true,
    token,
    employeeId: employee.id,
    name: employee.name,
    roles: [employee.role],
    unitId: unit.id,
    unitName: unit.name,
  };
}

// ── validateSession ─────────────────────────────────────────────────────────

export async function validateSession(token: string): Promise<{
  valid: boolean;
  employee?: { id: string; name: string; roles: string[]; unitId: string };
}> {
  if (!token) return { valid: false };

  const db = createAdminClient();

  const { data: session, error } = await db
    .from("employee_sessions")
    .select("employee_id, unit_id, expires_at, revoked_at, employees(id, name, role)")
    .eq("token", token)
    .maybeSingle();

  if (error || !session) return { valid: false };
  if (session.revoked_at) return { valid: false };
  if (new Date(session.expires_at) < new Date()) return { valid: false };

  const emp = (session as any).employees;
  if (!emp) return { valid: false };

  // Lazy-generate today's task instances on each protected-route entry.
  // In-memory + DB cache makes this near-free after the first call of the day.
  await ensureTodayTasks(session.unit_id);

  return {
    valid: true,
    employee: {
      id: emp.id,
      name: emp.name,
      roles: [emp.role],
      unitId: session.unit_id,
    },
  };
}

// ── getEmployeeSchedule ─────────────────────────────────────────────────────

export type EmployeeSchedule = {
  shift_start: string | null;
  shift_end: string | null;
  lunch_start: string | null;
  lunch_end: string | null;
  work_days: string[] | null;
};

export async function getEmployeeSchedule(token: string): Promise<EmployeeSchedule | null> {
  if (!token) return null;
  const db = createAdminClient();

  const { data: session } = await db
    .from("employee_sessions")
    .select("employee_id, expires_at, revoked_at")
    .eq("token", token)
    .maybeSingle();

  if (!session || session.revoked_at) return null;
  if (new Date(session.expires_at) < new Date()) return null;

  const { data: emp } = await db
    .from("employees")
    .select("shift_start, shift_end, lunch_start, lunch_end, work_days")
    .eq("id", session.employee_id)
    .maybeSingle();

  if (!emp) return null;

  return {
    shift_start: emp.shift_start ?? null,
    shift_end:   emp.shift_end   ?? null,
    lunch_start: emp.lunch_start ?? null,
    lunch_end:   emp.lunch_end   ?? null,
    work_days:   (emp.work_days as string[] | null) ?? null,
  };
}

// ── revokeSession ───────────────────────────────────────────────────────────

export async function revokeSession(token: string): Promise<void> {
  if (!token) return;
  const db = createAdminClient();
  await db
    .from("employee_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("token", token);
}
