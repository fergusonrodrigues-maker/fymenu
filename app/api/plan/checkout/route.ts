import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { restaurantId, plan, cycle } = await req.json();

    const validPlans = ["menu", "menupro", "business"];
    const validCycles = ["monthly", "quarterly", "semiannual"];

    if (!restaurantId) {
      return NextResponse.json(
        { error: "ID do restaurante não informado" },
        { status: 400 }
      );
    }
    if (!validPlans.includes(plan)) {
      return NextResponse.json(
        {
          error: `Plano inválido: ${plan}. Válidos: ${validPlans.join(", ")}`,
        },
        { status: 400 }
      );
    }
    if (plan !== "menu" && !validCycles.includes(cycle)) {
      return NextResponse.json(
        {
          error: `Ciclo inválido: ${cycle}. Válidos: ${validCycles.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Garante que existe uma unit de preview
    const { data: existingUnits } = await supabase
      .from("units")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .limit(1);

    if (!existingUnits || existingUnits.length === 0) {
      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("name, whatsapp, instagram")
        .eq("id", restaurantId)
        .single();

      if (restaurant) {
        const slug = `preview-${restaurantId.slice(0, 8)}`;
        await supabase.from("units").insert({
          restaurant_id: restaurantId,
          name: restaurant.name,
          slug,
          whatsapp: restaurant.whatsapp,
          instagram: restaurant.instagram,
          is_published: false,
        });
      }
    }

    // Sandbox ou ASAAS_API_KEY ausente: ativa direto sem pagamento
    const isSandbox =
      process.env.ASAAS_SANDBOX === "true" || !process.env.ASAAS_API_KEY;

    if (isSandbox) {
      const trialDays = plan === "business" ? 7 : 0;
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + (trialDays || 30));

      const { error } = await supabase
        .from("restaurants")
        .update({
          plan,
          status: plan === "business" ? "trial" : "active",
          trial_ends_at: trialEndsAt.toISOString(),
          onboarding_completed: true,
        })
        .eq("id", restaurantId);

      if (error) {
        console.error("Checkout sandbox error:", error);
        return NextResponse.json(
          { error: "Erro ao ativar plano" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    // Produção com ASAAS_API_KEY configurada
    // Preços em centavos por plano e ciclo
    const PRICES: Record<string, Record<string, number>> = {
      menu: { monthly: 19990, quarterly: 53970, semiannual: 95940 },
      menupro: { monthly: 39990, quarterly: 107970, semiannual: 191940 },
      business: { monthly: 159900, quarterly: 419700, semiannual: 719400 },
    };

    const amount = PRICES[plan]?.[cycle];
    if (!amount) {
      return NextResponse.json(
        { error: "Combinação de plano/ciclo inválida" },
        { status: 400 }
      );
    }

    // TODO: criar cobrança Asaas e retornar checkoutUrl
    // Por enquanto ativa direto até integração Asaas produção estar pronta
    const trialDays = plan === "business" ? 7 : 0;
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + (trialDays || 30));

    const { error } = await supabase
      .from("restaurants")
      .update({
        plan,
        status: plan === "business" ? "trial" : "active",
        trial_ends_at: trialEndsAt.toISOString(),
        onboarding_completed: true,
      })
      .eq("id", restaurantId);

    if (error) {
      return NextResponse.json(
        { error: "Erro ao ativar plano" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
