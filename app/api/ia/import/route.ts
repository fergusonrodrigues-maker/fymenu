import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `Você é um parser de cardápio para o FyMenu.

Regras:
- Analise o conteúdo fornecido (texto ou imagens) e extraia produtos, categorias e preços.
- Preserve a ordem original dos itens.
- Não invente preços. Se o preço não estiver claro, use null e raw_price_text com o texto original.
- price_type = "variable" se houver tamanhos/opções com preços diferentes.
- has_pending_media = true em todos os produtos.
- description: extraia a descrição ou ingredientes do produto se estiverem presentes no cardápio. Se não houver descrição visível, use null.
- import_confidence: 0.0 a 1.0, indique sua certeza sobre cada produto.
- Retorne exclusivamente JSON válido, sem texto adicional, sem markdown, sem backticks.

Schema de retorno:
{
  "unit_name": null,
  "source_type": "excel|word|txt|text|image",
  "currency": "BRL",
  "notes": [],
  "categories": [
    {
      "name": "string",
      "type": "food|drink|beverage|dessert|custom",
      "position": 0,
      "products": [
        {
          "name": "string",
          "description": "string|null",
          "price_type": "fixed|variable",
          "base_price": "number|null",
          "variations": [
            { "name": "string", "price": "number|null", "position": 0 }
          ],
          "has_pending_media": true,
          "status": "active",
          "position": 0,
          "import_confidence": 0.96,
          "raw_price_text": "string|null"
        }
      ]
    }
  ]
}`;

interface FileData {
  name: string;
  type: string;
  data: string; // base64
}

async function extractTextFromFile(
  file: FileData
): Promise<{ text: string; sourceType: string }> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const buffer = Buffer.from(file.data, "base64");

  if (["xlsx", "xls"].includes(ext)) {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const lines: string[] = [];
    workbook.SheetNames.forEach((name) => {
      const sheet = workbook.Sheets[name];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      lines.push(`=== ${name} ===\n${csv}`);
    });
    return { text: lines.join("\n\n"), sourceType: "excel" };
  }

  if (["doc", "docx"].includes(ext)) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return { text: result.value, sourceType: "word" };
  }

  if (["txt", "csv"].includes(ext)) {
    return { text: buffer.toString("utf-8"), sourceType: "txt" };
  }

  if (["jpg", "jpeg", "png", "webp"].includes(ext) || file.type.startsWith("image/")) {
    return { text: "__IMAGE__", sourceType: "image" };
  }

  return { text: buffer.toString("utf-8"), sourceType: "text" };
}

export async function POST(req: NextRequest) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    const body = await req.json();
    const files: FileData[] = body.files ?? [];
    const rawText: string | null = body.text ?? null;

    if (files.length === 0 && !rawText) {
      return NextResponse.json(
        { error: "Envie um arquivo ou texto." },
        { status: 400 }
      );
    }

    let messages: OpenAI.Chat.ChatCompletionMessageParam[];
    let sourceType = "text";

    if (rawText) {
      sourceType = "text";
      messages = [
        {
          role: "user",
          content: `Analise o cardápio abaixo e retorne o JSON estruturado:\n\n${rawText}`,
        },
      ];
    } else {
      const imageContents: OpenAI.Chat.ChatCompletionContentPart[] = [];
      const textChunks: string[] = [];

      for (const file of files) {
        const extracted = await extractTextFromFile(file);

        if (extracted.sourceType === "image") {
          sourceType = "image";
          const mimeType = file.type || "image/jpeg";
          imageContents.push({
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${file.data}` },
          });
        } else {
          sourceType = extracted.sourceType;
          textChunks.push(extracted.text);
        }
      }

      if (imageContents.length > 0) {
        messages = [
          {
            role: "user",
            content: [
              ...imageContents,
              {
                type: "text",
                text:
                  imageContents.length > 1
                    ? `Analise estas ${imageContents.length} imagens de cardápio. Unifique os dados em um único JSON, eliminando duplicatas e mantendo a estrutura de categorias e produtos com preços. Siga o schema JSON do sistema.`
                    : "Analise esta imagem de cardápio e extraia todos os produtos, categorias e preços seguindo o schema JSON do sistema.",
              },
            ],
          },
        ];
      } else {
        const combined = textChunks.join("\n\n---\n\n");
        messages = [
          {
            role: "user",
            content: `Analise o cardápio abaixo e retorne o JSON estruturado:\n\n${combined}`,
          },
        ];
      }
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      temperature: 0.1,
      max_tokens: 4000,
    });

    const raw = completion.choices[0]?.message?.content ?? "";

    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "IA retornou resposta inválida.", raw },
        { status: 422 }
      );
    }

    return NextResponse.json({ data: parsed, sourceType });
  } catch (err: unknown) {
    console.error("[ia/import]", err);
    const message = err instanceof Error ? err.message : "Erro interno.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}