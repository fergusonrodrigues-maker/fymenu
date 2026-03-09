import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { name, category, existing_description } = await req.json();

    if (!name) {
      return NextResponse.json(
        { error: "Nome do produto é obrigatório." },
        { status: 400 }
      );
    }

    const context = [
      `Produto: ${name}`,
      category ? `Categoria: ${category}` : null,
      existing_description
        ? `Descrição atual (para melhorar): ${existing_description}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Você escreve descrições curtas e apetitosas para cardápios digitais brasileiros.
Regras:
- Máximo 120 caracteres.
- Destaque ingredientes principais, textura ou modo de preparo.
- Tom: apetitoso, direto, sem exageros.
- Não use emojis.
- Não repita o nome do produto na descrição.
- Retorne apenas o texto da descrição, sem aspas, sem explicações.`,
        },
        {
          role: "user",
          content: context,
        },
      ],
      temperature: 0.7,
      max_tokens: 100,
    });

    const description =
      completion.choices[0]?.message?.content?.trim() ?? "";

    return NextResponse.json({ description });
  } catch (err: unknown) {
    console.error("[ia/describe]", err);
    const message = err instanceof Error ? err.message : "Erro interno.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
