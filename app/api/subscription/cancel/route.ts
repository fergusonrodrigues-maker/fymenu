import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { asaasRequest } from "@/lib/asaas";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const { data: restaurant } = await admin
    .from("restaurants")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (!restaurant) return NextResponse.json({ error: "Restaurante não encontrado" }, { status: 404 });

  const { data: subscription } = await admin
    .from("subscriptions")
    .select("id, asaas_subscription_id")
    .eq("restaurant_id", restaurant.id)
    .in("status", ["active", "pending", "overdue"])
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!subscription?.asaas_subscription_id) {
    return NextResponse.json({ error: "Nenhuma assinatura ativa encontrada" }, { status: 404 });
  }

  try {
    await asaasRequest("DELETE", `/subscriptions/${subscription.asaas_subscription_id}`);

    await admin.from("subscriptions")
      .update({ status: "canceled", canceled_at: new Date().toISOString() })
      .eq("id", subscription.id);

    // Webhook SUBSCRIPTION_INACTIVATED irá desativar units; aqui apenas marca como cancelado.

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
