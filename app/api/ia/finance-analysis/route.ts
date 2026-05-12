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
  if (!hasPlanFeature(plan, "financeComplete", unitFeatures)) {
    console.warn(`[gating] user=${user.id} blocked from ia/finance-analysis plan=${plan}`);
    return NextResponse.json(
      { error: "feature_not_available", minPlan: "business" },
      { status: 403 }
    );
  }

  const body = await req.json();
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
  }

  const fmtBRL = (v: number) =>
    `R$ ${(v / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const revenueBySourceText = Object.entries(body.revenueBySource || {})
    .filter(([, v]) => (v as number) > 0)
    .map(([k, v]) => `${k}: ${fmtBRL(v as number)}`)
    .join(", ");

  const ordersBySourceText = Object.entries(body.ordersBySource || {})
    .filter(([, v]) => (v as number) > 0)
    .map(([k, v]) => `${k}: ${v} pedidos`)
    .join(", ");

  const paymentText = Object.entries(body.paymentMethods || {})
    .filter(([, v]) => (v as number) > 0)
    .map(([k, v]) =>
      `${k === "pix" ? "PIX" : k === "card" ? "Cartão" : k === "cash" ? "Dinheiro" : k}: ${fmtBRL(v as number)}`
    )
    .join(", ");

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Você é um consultor financeiro especializado em restaurantes brasileiros. Faça uma análise completa e prática. Use seções com emoji como título. Seja direto e acionável. Máximo 500 palavras. Português do Brasil.",
          },
          {
            role: "user",
            content: `RELATÓRIO FINANCEIRO DO MÊS:

📊 RECEITA:
- Total: ${fmtBRL(body.revenue)}
- Por fonte: ${revenueBySourceText || "sem dados"}
- Pedidos: ${body.totalOrders} (${ordersBySourceText || "sem dados"})
- Ticket médio: ${fmtBRL(body.ticketMedio)}

💰 CUSTOS:
- Despesas operacionais: ${fmtBRL(body.expenses)}
- Equipe (${body.employeeCount} funcionários): ${fmtBRL(body.employeeCosts)}
- Total: ${fmtBRL(body.totalCosts)}
- Por categoria: ${(body.expensesByCategory || []).map((c: any) => `${c.category}: ${fmtBRL(c.total)}`).join(", ") || "sem dados"}

📈 RESULTADO:
- Lucro/Prejuízo: ${fmtBRL(body.profit)}
- Margem: ${body.margin}%
- Meta diária: ${body.dailyGoal > 0 ? fmtBRL(body.dailyGoal) : "não definida"}
- Faturamento hoje: ${fmtBRL(body.todayRevenue)}

💳 PAGAMENTOS:
- ${paymentText || "sem dados"}

ANALISE:
1. 📋 Diagnóstico geral da saúde financeira
2. 💡 Top 3 ações pra aumentar margem
3. 🔪 Custos que podem ser cortados ou otimizados
4. 💵 Sugestão de pró-labore baseada no lucro (conservador 30%, moderado 50%, agressivo 70%)
5. 📊 Quanto precisa faturar por dia pra cobrir custos (break-even diário)
6. ⚠️ Pontos de atenção e riscos
7. 🎯 Meta sugerida pro próximo mês`,
          },
        ],
        max_tokens: 800,
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
