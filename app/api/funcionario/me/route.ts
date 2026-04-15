import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SESSION_COOKIE, decodeSession } from "@/lib/funcionario-session";

/**
 * GET /api/funcionario/me
 * Valida o cookie de sessão e retorna os dados do funcionário autenticado.
 */
export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const session = decodeSession(token);
  if (!session)
    return NextResponse.json({ error: "Sessão expirada" }, { status: 401 });

  const admin = createAdminClient();

  const { data: employee } = await admin
    .from("employees")
    .select(
      "id, name, role, team, unit_id, is_active, current_status, category_name, salary, work_days, shift_start, shift_end, cpf, units(id, name, slug, logo_url)"
    )
    .eq("id", session.employee_id)
    .maybeSingle();

  if (!employee || !employee.is_active)
    return NextResponse.json({ error: "Conta desativada" }, { status: 403 });

  const { data: empCategories } = await admin
    .from("employee_category_links")
    .select("category_id, employee_categories(id, name)")
    .eq("employee_id", session.employee_id);

  const categories = (empCategories ?? [])
    .map((r: any) => ({ id: r.employee_categories?.id, name: r.employee_categories?.name }))
    .filter((c: any) => c.id && c.name);

  const unit = employee.units as any;
  const maskedCpf = employee.cpf
    ? employee.cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "***.$2.$3-$4")
    : null;

  return NextResponse.json({
    employee: {
      id: employee.id,
      name: employee.name,
      role: employee.role,
      team: employee.team,
      unit_id: employee.unit_id,
      current_status: employee.current_status ?? "off",
      category_name: employee.category_name,
      salary: employee.salary,
      work_days: employee.work_days,
      shift_start: employee.shift_start,
      shift_end: employee.shift_end,
      cpf_masked: maskedCpf,
      unit_name: unit?.name ?? session.unit_name,
      unit_logo: unit?.logo_url ?? session.unit_logo,
      unit_slug: unit?.slug ?? null,
      categories,
      active_category_id: session.active_category_id ?? null,
      active_category_name: session.active_category_name ?? null,
    },
  });
}
