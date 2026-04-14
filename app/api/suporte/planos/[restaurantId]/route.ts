import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateSuporteToken, hasPermission } from "@/lib/suporte-auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  const staff = await validateSuporteToken(req);
  if (!staff) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!hasPermission(staff, "gerenciar_planos"))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { restaurantId } = await params;
  const { plan } = await req.json();

  const VALID_PLANS = ["free", "basic", "pro", "enterprise"];
  if (!plan || !VALID_PLANS.includes(plan))
    return NextResponse.json({ error: "Plano inválido" }, { status: 400 });

  const admin = createAdminClient();

  const { data: restaurant, error: fetchErr } = await admin
    .from("restaurants")
    .select("id, name, plan")
    .eq("id", restaurantId)
    .single();

  if (fetchErr || !restaurant)
    return NextResponse.json({ error: "Restaurante não encontrado" }, { status: 404 });

  const { error } = await admin
    .from("restaurants")
    .update({ plan })
    .eq("id", restaurantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    previous_plan: restaurant.plan,
    new_plan: plan,
    restaurant_name: restaurant.name,
    changed_by: staff.email,
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  const staff = await validateSuporteToken(req);
  if (!staff) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!hasPermission(staff, "gerenciar_planos"))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { restaurantId } = await params;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("restaurants")
    .select("id, name, plan, status, free_access, trial_ends_at, created_at")
    .eq("id", restaurantId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
