import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Must be authenticated owner
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const body = await req.json();
    const {
      unit_id,
      name,
      role = "waiter",
      phone,
      cpf,
      username,
      password,
      category_id,
      salary,
      work_days,
      shift_start,
      shift_end,
      lunch_start,
      lunch_end,
      extra_costs,
      extra_costs_description,
    } = body;

    if (!unit_id || !name) {
      return NextResponse.json({ error: "unit_id e nome são obrigatórios" }, { status: 400 });
    }

    // Verify owner owns the unit
    const { data: unit, error: unitErr } = await supabase
      .from("units")
      .select("id, restaurant_id")
      .eq("id", unit_id)
      .single();

    if (unitErr || !unit) {
      return NextResponse.json({ error: "Unidade não encontrada" }, { status: 404 });
    }

    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id")
      .eq("id", unit.restaurant_id)
      .eq("owner_id", user.id)
      .single();

    if (!restaurant) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    // Hash password if provided
    let password_hash: string | null = null;
    if (password) {
      password_hash = await bcrypt.hash(password, 12);
    }

    // Build access_subdomain from role + username slug
    const access_subdomain = username
      ? `${role}-${username.toLowerCase().replace(/[^a-z0-9]/g, "")}`
      : null;

    const { data: employee, error } = await supabase
      .from("employees")
      .insert({
        unit_id,
        name: name.trim(),
        role,
        phone: phone?.trim() || null,
        cpf: cpf?.replace(/\D/g, "") || null,
        username: username?.trim().toLowerCase() || null,
        password_hash,
        access_subdomain,
        category_id: category_id || null,
        salary: salary ?? 0,
        work_days: work_days ?? [],
        shift_start: shift_start || "08:00",
        shift_end: shift_end || "18:00",
        lunch_start: lunch_start || null,
        lunch_end: lunch_end || null,
        extra_costs: extra_costs ?? 0,
        extra_costs_description: extra_costs_description || null,
      })
      .select("id, name, role, phone, username, access_subdomain, is_active")
      .single();

    if (error) {
      if (error.code === "23505") {
        // Determine which field caused the conflict
        let conflictField: "cpf" | "username" | null = null;
        let conflictValue: string | null = null;
        if (error.message.includes("cpf") && cpf) {
          conflictField = "cpf";
          conflictValue = cpf.replace(/\D/g, "");
        } else if (error.message.includes("username") && username) {
          conflictField = "username";
          conflictValue = username.trim().toLowerCase();
        }

        if (conflictField && conflictValue) {
          // Check if the conflict is with an inactive employee — offer reactivation
          const { data: inactive } = await supabase
            .from("employees")
            .select("id, name")
            .eq("unit_id", unit_id)
            .eq(conflictField, conflictValue)
            .eq("is_active", false)
            .maybeSingle();

          if (inactive) {
            return NextResponse.json({
              error: "INACTIVE_DUPLICATE",
              inactive_id: inactive.id,
              inactive_name: inactive.name,
            }, { status: 409 });
          }
        }

        if (error.message.includes("cpf")) return NextResponse.json({ error: "CPF já cadastrado" }, { status: 409 });
        if (error.message.includes("username")) return NextResponse.json({ error: "Usuário já existe" }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, employee });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
