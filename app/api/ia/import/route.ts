import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `Você é um parser de cardápio para o FyMenu.

Regras:
- Analise apenas palavras, estrutura e valores. Não analise imagens.
- Preserve a ordem original dos itens.
- Não invente preços. Se o preço não estiver claro, use null e raw_price_text com o texto original.
- price_type = "variable" se houver tamanhos/opções com preços diferentes.
- has_pending_media = true em todos os produtos.
- description = null quando não houver descrição clara no cardápio.
- import_confidence: 0.0 a 1.0, indique sua certeza sobre cada produto.
- Retorne exclusivamente JSON válido, sem texto adicional, sem markdown, sem backticks.

Schema de retorno:
{
  "unit_name": null,
  "source_type": "pdf|excel|word|txt|text|image",
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

async function extractTextFromFile(
  file: File
): Promise<{ text: string; sourceType: string }> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (ext === "pdf") {
    const pdfParse = (await import("pdf-parse")).default;
    const buffer = Buffer.from(await file.arrayBuffer());
    const data = await pdfParse(buffer);
    return { text: data.text, sourceType: "pdf" };
  }

  if (["xlsx", "xls"].includes(ext)) {
    const XLSX = await import("xlsx");
    const buffer = Buffer.from(await file.arrayBuffer());
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
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await mammoth.extractRawText({ buffer });
    return { text: result.value, sourceType: "word" };
  }

  if (["txt", "csv"].includes(ext)) {
    const text = await file.text();
    return { text, sourceType: "txt" };
  }

  if (["jpg", "jpeg", "png", "webp"].includes(ext)) {
    return { text: "__IMAGE__", sourceType: "image" };
  }

  const text = await file.text();
  return { text, sourceType: "text" };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const rawText = formData.get("text") as string | null;

    if (!file && !rawText) {
      return NextResponse.json(
        { error: "Envie um arquivo ou texto." },
        { status: 400 }
      );
    }

    let text = "";
    let sourceType = "text";

    if (rawText) {
      text = rawText;
      sourceType = "text";
    } else if (file) {
      const extracted = await extractTextFromFile(file);
      text = extracted.text;
      sourceType = extracted.sourceType;
    }

    let messages: OpenAI.Chat.ChatCompletionMessageParam[];

    if (sourceType === "image" && file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = buffer.toString("base64");
      const mimeType = file.type || "image/jpeg";

      messages = [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64}` },
            },
            {
              type: "text",
              text: "Analise esta imagem de cardápio e extraia todos os produtos, categorias e preços seguindo o schema JSON fornecido no sistema.",
            },
          ],
        },
      ];
    } else {
      messages = [
        {
          role: "user",
          content: `Analise o cardápio abaixo e retorne o JSON estruturado:\n\n${text}`,
        },
      ];
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
