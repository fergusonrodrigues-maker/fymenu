import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password, subdomain } = body;

    if (!username || !password) {
      return NextResponse.json({ error: "Usuário e senha são obrigatórios" }, { status: 400 });
    }

    const supabase = await createClient();

    // Find employee by username (or by access_subdomain if provided)
    let query = supabase
      .from("employees")
      .select(`
        id, name, role, phone, username, access_subdomain, is_active, password_hash,
        unit_id,
        units!employees_unit_id_fkey(id, name, slug),
        employee_categories!employees_category_id_fkey(id, name, color_badge)
      `)
      .eq("is_active", true);

    if (subdomain) {
      query = query.eq("access_subdomain", subdomain).eq("username", username);
    } else {
      query = query.eq("username", username);
    }

    const { data: employee, error } = await query.maybeSingle();

    if (error || !employee) {
      return NextResponse.json({ error: "Usuário ou senha incorretos" }, { status: 401 });
    }

    // Verify password
    if (!employee.password_hash) {
      return NextResponse.json({ error: "Acesso não configurado. Contate o gerente." }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, employee.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Usuário ou senha incorretos" }, { status: 401 });
    }

    // Return employee session data (no password_hash)
    const { password_hash: _omit, ...safe } = employee as any;

    return NextResponse.json({
      success: true,
      employee: safe,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
