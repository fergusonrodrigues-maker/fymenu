import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const { products, clickData, salesData } = await req.json();

  if (!products || products.length === 0) {
    return NextResponse.json({ error: "Nenhum produto enviado." }, { status: 400 });
  }

  const prompt = `Você é um especialista em cardápios digitais de restaurantes. Analise os dados abaixo e sugira quais produtos devem ser destacados (featured) no cardápio para maximizar vendas e engajamento.

Produtos disponíveis:
${JSON.stringify(products, null, 2)}

Dados de cliques (últimos 7 dias):
${JSON.stringify(clickData ?? [], null, 2)}

Dados de vendas (últimos 30 dias):
${JSON.stringify(salesData ?? [], null, 2)}

Retorne SOMENTE JSON válido (sem markdown, sem backticks):
{
  "highlights": [
    {
      "product_id": "id do produto",
      "product_name": "nome do produto",
      "reason": "motivo em 1 frase curta"
    }
  ],
  "summary": "resumo de 2-3 frases sobre a estratégia sugerida"
}

Regras:
- Sugira no máximo 5 produtos
- Prefira produtos com alto número de cliques ou vendas
- Considere margem de preço (produtos premium merecem destaque)
- Se não houver dados suficientes, sugira produtos com preços mais altos ou nomes atrativos`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "user", content: prompt },
      ],
      max_tokens: 1000,
      temperature: 0.4,
    });

    const content = response.choices[0]?.message?.content?.trim() ?? "";
    const parsed = JSON.parse(content.replace(/```json|```/g, "").trim());
    return NextResponse.json(parsed);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
