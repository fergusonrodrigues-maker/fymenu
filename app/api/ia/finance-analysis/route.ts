import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });

  const fmtBRL = (v: number) => `R$ ${(v / 100).toFixed(2).replace(".", ",")}`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Você é um consultor financeiro de restaurantes. Dê análise prática em português do Brasil. Use bullet points. Máximo 400 palavras." },
          { role: "user", content: `Analise a saúde financeira deste restaurante:
- Receita mensal: ${fmtBRL(body.revenue)}
- Custos mensais: ${fmtBRL(body.expenses)}
- Resultado: ${fmtBRL(body.profit)} (${body.profit >= 0 ? "lucro" : "prejuízo"})
- Margem: ${body.revenue > 0 ? ((body.profit / body.revenue) * 100).toFixed(1) : 0}%
- Custos por categoria: ${body.expensesByCategory?.map((c: any) => `${c.category}: ${fmtBRL(c.total)}`).join(", ")}

Analise:
1. Saúde financeira geral
2. Quais custos podem ser reduzidos
3. Quanto precisa faturar por dia pra cobrir os custos
4. Sugestões pra aumentar margem
5. Ponto de atenção ou risco` }
        ],
        max_tokens: 600, temperature: 0.7,
      }),
    });
    const data = await res.json();
    return NextResponse.json({ analysis: data.choices?.[0]?.message?.content?.trim() });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
