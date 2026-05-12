import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasPlanFeature } from "@/lib/plans";
import { getRestaurantPlan } from "@/lib/server/getRestaurantPlan";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: member } = await supabase
    .from("restaurant_members")
    .select("restaurant_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member?.restaurant_id) {
    return NextResponse.json({ error: "no_restaurant" }, { status: 403 });
  }

  const { plan, unitFeatures } = await getRestaurantPlan(member.restaurant_id);
  if (!hasPlanFeature(plan, "iaDescription", unitFeatures)) {
    console.warn(`[gating] user=${user.id} blocked from ia/analyze-reviews plan=${plan}`);
    return NextResponse.json(
      { error: "feature_not_available", minPlan: "menupro" },
      { status: 403 }
    );
  }

  const body = await req.json();

  if (!process.env.OPENAI_API_KEY)
    return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Você é um consultor de experiência do cliente em restaurantes. Analise as avaliações e dê insights práticos. Use emojis como títulos. Máximo 400 palavras. Português do Brasil.",
          },
          {
            role: "user",
            content: `DADOS DAS AVALIAÇÕES:

📊 RESUMO:
- Total: ${body.totalReviews} avaliações
- Média restaurante: ${body.avgRestaurant}/5
- Média garçons: ${body.avgWaiter}/5
- Redirecionados pro Google: ${body.googleRedirects}
- Últimos 7 dias: ${body.reviewsLast7} avaliações
- Últimos 30 dias: ${body.reviewsLast30} avaliações

⭐ DISTRIBUIÇÃO:
- 5★: ${body.starDist?.[4]} | 4★: ${body.starDist?.[3]} | 3★: ${body.starDist?.[2]} | 2★: ${body.starDist?.[1]} | 1★: ${body.starDist?.[0]}

👨‍🍳 TOP GARÇONS:
${body.waiterRanking?.map((w: any) => `- ${w.name}: ${w.avg}★ (${w.count} avaliações)`).join("\n") || "Sem dados"}

💬 COMENTÁRIOS RECENTES:
${body.comments?.map((c: any) => `- [${c.rating}★] ${c.comment} (Garçom: ${c.waiter || "N/A"})`).join("\n") || "Sem comentários"}

ANALISE:
1. 📋 Diagnóstico geral da satisfação
2. ⚠️ Padrões nos feedbacks negativos
3. 🌟 Pontos fortes a manter
4. 💡 Ações concretas pra melhorar a nota
5. 👨‍🍳 Análise individual dos garçons (quem precisa de treinamento?)
6. 🎯 Meta sugerida de avaliação pro próximo mês`,
          },
        ],
        max_tokens: 600,
        temperature: 0.7,
      }),
    });

    const data = await res.json();
    return NextResponse.json({
      analysis: data.choices?.[0]?.message?.content?.trim(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
