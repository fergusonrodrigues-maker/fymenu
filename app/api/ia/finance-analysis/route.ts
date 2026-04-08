import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
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
