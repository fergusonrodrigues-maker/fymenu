"use server";

import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";

const ROLE_LABELS: Record<string, string> = {
  waiter: "Garçom",
  chef: "Cozinheiro",
  driver: "Entregador",
  manager: "Gerente",
  cashier: "Caixa",
  cleaner: "Limpeza",
  financial: "Financeiro",
};

export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

// ── authenticateEmployee ────────────────────────────────────────────────────
// Returns session data on success; throws with a user-facing message on failure.

export async function authenticateEmployee(
  slug: string,
  username: string,
  password: string
): Promise<{
  token: string;
  employeeId: string;
  name: string;
  roles: string[];
  unitId: string;
  unitName: string;
}> {
  const db = createAdminClient();

  // 1) Resolve unit by slug
  const { data: unit, error: unitErr } = await db
    .from("units")
    .select("id, name")
    .eq("slug", slug)
    .maybeSingle();

  if (unitErr || !unit) throw new Error("Unidade não encontrada");

  // 2) Find active employee by unit + username
  const { data: employee, error: empErr } = await db
    .from("employees")
    .select("id, name, role, password_hash, is_active")
    .eq("unit_id", unit.id)
    .eq("username", username)
    .eq("is_active", true)
    .maybeSingle();

  if (empErr || !employee) throw new Error("Usuário ou senha incorretos");

  // 3) Verify password (bcrypt)
  if (!employee.password_hash) throw new Error("Acesso não configurado. Fale com o gerente.");

  const valid = await bcrypt.compare(password, employee.password_hash);
  if (!valid) throw new Error("Usuário ou senha incorretos");

  // 4) Create session token
  const token = crypto.randomUUID();

  const { error: sessionErr } = await db.from("employee_sessions").insert({
    employee_id: employee.id,
    unit_id: unit.id,
    token,
  });

  if (sessionErr) throw new Error("Erro ao criar sessão. Tente novamente.");

  return {
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

// ── revokeSession ───────────────────────────────────────────────────────────

export async function revokeSession(token: string): Promise<void> {
  if (!token) return;
  const db = createAdminClient();
  await db
    .from("employee_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("token", token);
}
