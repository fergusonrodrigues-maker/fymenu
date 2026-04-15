import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createHash } from "crypto";
import {
  SESSION_COOKIE,
  SESSION_DURATION_MS,
  encodeSession,
  createSessionData,
} from "@/lib/funcionario-session";

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

// ─── In-memory rate limiter (CPF → attempts) ────────────────────────────────
// Resets on server restart. Sufficient for basic brute-force protection.
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 min

function checkRateLimit(key: string): { allowed: boolean; minutesLeft?: number } {
  const now = Date.now();
  const entry = loginAttempts.get(key);

  if (!entry || now > entry.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  entry.count++;
  if (entry.count > MAX_ATTEMPTS) {
    const minutesLeft = Math.ceil((entry.resetAt - now) / 60000);
    return { allowed: false, minutesLeft };
  }

  return { allowed: true };
}

/**
 * POST /api/funcionario/login
 *
 * Unified login: accepts { cpf, password, accessCode? }
 *
 * With accessCode: finds unit first (by access_code or cnpj), then employee in that unit.
 * Without accessCode: legacy — finds employee globally by CPF (backward compat).
 *
 * On success: sets httpOnly cookie "fy_emp_s" (12h) and returns employee JSON.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { cpf, password, accessCode } = body;

  if (!cpf || !password)
    return NextResponse.json(
      { error: "CPF e senha obrigatórios" },
      { status: 400 }
    );

  const normalizedCpf = cpf.replace(/\D/g, "");

  // Rate limit by CPF
  const rl = checkRateLimit(normalizedCpf);
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: `Muitas tentativas. Tente novamente em ${rl.minutesLeft} minuto${rl.minutesLeft !== 1 ? "s" : ""}.`,
      },
      { status: 429 }
    );
  }

  const admin = createAdminClient();
  let employee: any;
  let unit: any;

  if (accessCode) {
    // ── Unified login: unit-scoped ──────────────────────────────────────────
    const normalizedCode = accessCode.replace(/[\.\-\/\s]/g, "");

    const { data: foundUnit } = await admin
      .from("units")
      .select("id, name, slug, logo_url")
      .or(`access_code.eq.${normalizedCode},cnpj.eq.${normalizedCode}`)
      .maybeSingle();

    if (!foundUnit)
      return NextResponse.json(
        { error: "Empresa não encontrada. Verifique o código." },
        { status: 404 }
      );

    unit = foundUnit;

    const { data: emp } = await admin
      .from("employees")
      .select(
        "id, name, role, team, unit_id, password_hash, is_active, current_status, category_name, work_days, shift_start, shift_end"
      )
      .eq("unit_id", unit.id)
      .eq("cpf", normalizedCpf)
      .eq("is_active", true)
      .maybeSingle();

    if (!emp || !emp.password_hash) {
      return NextResponse.json(
        { error: "CPF ou senha incorretos" },
        { status: 401 }
      );
    }

    if (emp.password_hash !== hashPassword(password)) {
      return NextResponse.json(
        { error: "CPF ou senha incorretos" },
        { status: 401 }
      );
    }

    employee = emp;
  } else {
    // ── Legacy login: global CPF lookup ────────────────────────────────────
    const { data: emp } = await admin
      .from("employees")
      .select(
        "id, name, role, team, unit_id, password_hash, is_active, units(id, slug, name, logo_url)"
      )
      .eq("cpf", normalizedCpf)
      .maybeSingle();

    if (!emp)
      return NextResponse.json({ error: "CPF não encontrado" }, { status: 401 });

    if (emp.is_active === false)
      return NextResponse.json({ error: "Conta desativada" }, { status: 403 });

    if (!emp.password_hash || emp.password_hash !== hashPassword(password))
      return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });

    unit = emp.units as any;
    employee = emp;
  }

  // Clear rate limit on success
  loginAttempts.delete(normalizedCpf);

  // Build response
  const sessionPayload = createSessionData({
    employee_id: employee.id,
    unit_id: employee.unit_id,
    name: employee.name,
    role: employee.role ?? "",
    unit_name: unit?.name ?? "",
    unit_logo: unit?.logo_url ?? null,
  });

  const token = encodeSession(sessionPayload);

  const response = NextResponse.json({
    employee: {
      id: employee.id,
      name: employee.name,
      role: employee.role,
      team: employee.team,
      unit_id: employee.unit_id,
      unit_slug: unit?.slug ?? null,
      unit_name: unit?.name ?? null,
    },
  });

  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: SESSION_DURATION_MS / 1000,
    path: "/",
  });

  return response;
}
