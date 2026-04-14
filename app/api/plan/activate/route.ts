import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { restaurantId, plan } = await req.json();

    if (!restaurantId) {
      return NextResponse.json(
        { error: "ID do restaurante não informado" },
        { status: 400 }
      );
    }

    // Cancelar plano
    if (plan === "cancel") {
      const { error } = await supabase
        .from("restaurants")
        .update({
          plan: null,
          status: "canceled",
          onboarding_completed: true,
        })
        .eq("id", restaurantId);

      if (error) {
        console.error("Erro ao cancelar plano:", error);
        return NextResponse.json(
          { error: "Erro ao cancelar plano" },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true });
    }

    // Ativar plano
    const validPlans = ["menu", "menupro", "business"];
    if (!validPlans.includes(plan)) {
      return NextResponse.json(
        {
          error: `Plano inválido: ${plan}. Válidos: ${validPlans.join(", ")}`,
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
      console.error("Erro ao ativar plano:", error);
      return NextResponse.json(
        { error: "Erro ao ativar plano" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Plan activate error:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
