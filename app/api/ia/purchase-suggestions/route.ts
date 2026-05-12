import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { hasPlanFeature } from "@/lib/plans";
import { getRestaurantPlan } from "@/lib/server/getRestaurantPlan";

export const runtime = "nodejs";

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
  if (!hasPlanFeature(plan, "stockComplete", unitFeatures)) {
    console.warn(`[gating] user=${user.id} blocked from ia/purchase-suggestions plan=${plan}`);
    return NextResponse.json(
      { error: "feature_not_available", minPlan: "business" },
      { status: 403 }
    );
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const body = await req.json();

  const fmtBRL = (v: number) =>
    `R$ ${(v / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Você é um consultor de compras de restaurantes. Analise o estoque e sugira compras prioritárias. Use emojis como títulos de seção. Seja direto e prático. Máximo 400 palavras. Português do Brasil.",
        },
        {
          role: "user",
          content: `ANÁLISE DE ESTOQUE:

📦 INGREDIENTES COM ESTOQUE BAIXO:
${
  body.lowStock?.map(
    (i: any) =>
      `- ${i.name}: ${i.currentStock} ${i.unitMeasure} (mín: ${i.minStock})${i.supplier ? ` — Fornecedor: ${i.supplier}` : ""}`
  ).join("\n") || "Nenhum"
}

⏰ PREVISÃO DE RUPTURA:
${
  body.dailyConsumption?.slice(0, 10).map(
    (d: any) =>
      `- ${d.name}: ${d.daysRemaining} dias restantes (usa ~${d.dailyUsage.toFixed(2)}/${d.unitMeasure}/dia)`
  ).join("\n") || "Sem dados"
}

💰 PRODUTOS MAIS LUCRATIVOS (com gargalo):
${
  body.bottlenecks?.map(
    (p: any) =>
      `- ${p.productName}: pode fazer ${p.capacity} un (gargalo: ${p.bottleneck}), margem ${p.marginPercent}%`
  ).join("\n") || "Sem dados"
}

📊 VALOR TOTAL EM ESTOQUE: ${fmtBRL(body.totalStockValue || 0)}

SUGIRA:
1. 🛒 Lista de compras prioritárias (o que comprar primeiro)
2. 💡 Quanto comprar de cada item (baseado no consumo)
3. ⚠️ Itens que limitam produtos de alta margem
4. 💰 Investimento estimado pra repor estoque
5. 🎯 Estratégia de compras (semanal vs quinzenal)`,
        },
      ],
      max_tokens: 600,
      temperature: 0.7,
    });

    const suggestions = response.choices[0]?.message?.content?.trim();
    return NextResponse.json({ suggestions });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
