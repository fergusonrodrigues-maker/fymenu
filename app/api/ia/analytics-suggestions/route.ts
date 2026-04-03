import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
  }

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
            content: "Você é um consultor de restaurantes especializado em cardápios digitais. Dê sugestões práticas e acionáveis em português do Brasil. Seja direto, use bullet points. Máximo 300 palavras.",
          },
          {
            role: "user",
            content: `Analise estes dados do restaurante e dê sugestões de melhoria:
- ${body.totalProducts} produtos cadastrados
- ${body.totalCategories} categorias
- ${body.totalOrders} pedidos recentes
- ${body.totalViews} visualizações do cardápio
- ${body.totalClicks} cliques em produtos
- Taxa de conversão: ${body.totalViews > 0 ? ((body.totalOrders / body.totalViews) * 100).toFixed(1) : 0}%
- Top 5 produtos mais clicados: ${body.topProducts?.join(", ") || "sem dados"}

Dê sugestões sobre:
1. Como melhorar a taxa de conversão
2. Quais produtos destacar ou remover
3. Estratégias de preço
4. Melhorias no cardápio
5. Oportunidades de upsell`,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });
    const data = await res.json();
    const suggestions = data.choices?.[0]?.message?.content?.trim();
    return NextResponse.json({ suggestions });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
