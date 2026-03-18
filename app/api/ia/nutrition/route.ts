import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const { name, description } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Nome do produto é obrigatório." }, { status: 400 });
    }

    const context = [
      `Produto: ${name}`,
      description ? `Descrição: ${description}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Você é um nutricionista especializado em alimentos de restaurante.
Retorne APENAS um JSON com as estimativas nutricionais por porção típica do produto.
Formato exato (sem texto extra, sem markdown):
{"calories":000,"protein":0.0,"carbs":0.0,"fat":0.0}
- calories: kcal (número inteiro)
- protein, carbs, fat: gramas (uma casa decimal)
Se não souber estimar, use valores razoáveis para o tipo de alimento.`,
        },
        { role: "user", content: context },
      ],
      temperature: 0.3,
      max_tokens: 60,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
    const data = JSON.parse(raw);

    return NextResponse.json({
      calories: data.calories ?? null,
      protein: data.protein ?? null,
      carbs: data.carbs ?? null,
      fat: data.fat ?? null,
    });
  } catch (err: unknown) {
    console.error("[ia/nutrition]", err);
    const message = err instanceof Error ? err.message : "Erro interno.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
