import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    console.error("[ia/generate-description] OPENAI_API_KEY not configured");
    return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const { productName, categoryName, image_url, product_name, category, manual_description } = await req.json();

    // Accept both naming conventions (hook uses snake_case, direct calls use camelCase)
    const name = productName ?? product_name;
    const cat  = categoryName ?? category;

    if (!name) {
      return NextResponse.json({ error: "Nome do produto é obrigatório." }, { status: 400 });
    }

    const messages: OpenAI.ChatCompletionMessageParam[] = [
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
        content: [
          image_url ? { type: "image_url" as const, image_url: { url: image_url } } : null,
          {
            type: "text" as const,
            text: [
              `Produto: ${name}`,
              cat ? `Categoria: ${cat}` : null,
              manual_description ? `Descrição atual (para melhorar): ${manual_description}` : null,
            ].filter(Boolean).join("\n"),
          },
        ].filter(Boolean) as OpenAI.ChatCompletionContentPart[],
      },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
      max_tokens: 100,
    });

    const description = completion.choices[0]?.message?.content?.trim() ?? "";
    const description_source = "AI_GENERATED";

    return NextResponse.json({ description, description_source });
  } catch (err: unknown) {
    console.error("[ia/generate-description]", err);
    const message = err instanceof Error ? err.message : "Erro interno.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
