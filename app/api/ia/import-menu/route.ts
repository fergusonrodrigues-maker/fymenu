import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `Você é um especialista em organizar cardápios de restaurantes. Analise o conteúdo enviado e organize em categorias e produtos. Responda SOMENTE com JSON válido (sem markdown, sem backticks) no formato:
{
  "categories": [
    {
      "name": "Nome da Categoria",
      "products": [
        {
          "name": "Nome do Produto",
          "description": "Descrição curta e apetitosa",
          "price": 29.90,
          "variations": [
            { "name": "Pequena", "price": 19.90 }
          ]
        }
      ]
    }
  ]
}
Se a descrição não existir no original, crie uma curta e apetitosa em português. Preços devem ser números decimais. Organize logicamente (entradas, pratos, bebidas, sobremesas, etc). Se tiver variações de tamanho/sabor, coloque no array variations.`;

function parseMenuJson(raw: string): any {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

export async function POST(req: NextRequest) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const text = formData.get("text") as string | null;

  let contentToAnalyze = "";

  if (text) {
    contentToAnalyze = text;
  } else if (file) {
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "csv" || ext === "json" || ext === "txt") {
      contentToAnalyze = await file.text();
    } else if (
      ext === "pdf" ||
      ext === "jpg" ||
      ext === "jpeg" ||
      ext === "png" ||
      ext === "webp"
    ) {
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const mimeType =
        ext === "pdf"
          ? "application/pdf"
          : ext === "webp"
          ? "image/webp"
          : `image/${ext === "jpg" ? "jpeg" : ext}`;

      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: { url: `data:${mimeType};base64,${base64}` },
                },
                {
                  type: "text",
                  text: "Extraia o cardápio completo desta imagem. Responda SOMENTE com JSON válido no formato especificado.",
                },
              ],
            },
          ],
          max_tokens: 4000,
          temperature: 0.2,
        });

        const extracted = response.choices[0]?.message?.content?.trim() ?? "";
        const parsed = parseMenuJson(extracted);
        return NextResponse.json({ importData: parsed, source: "vision" });
      } catch (err: any) {
        return NextResponse.json(
          {
            error:
              "Não foi possível interpretar o documento. Tente com texto ou CSV.",
            raw: err.message,
          },
          { status: 422 }
        );
      }
    } else if (ext === "xlsx" || ext === "xls") {
      const buffer = await file.arrayBuffer();
      const decoder = new TextDecoder("utf-8", { fatal: false });
      const decoded = decoder.decode(buffer).slice(0, 5000);
      if (decoded.includes("\x00")) {
        return NextResponse.json(
          {
            error:
              "Arquivo Excel não pode ser lido diretamente. Exporte como CSV e importe novamente.",
          },
          { status: 422 }
        );
      }
      contentToAnalyze = decoded;
    }
  }

  if (!contentToAnalyze) {
    return NextResponse.json(
      {
        error:
          "Nenhum conteúdo para analisar. Envie um arquivo ou cole o texto.",
      },
      { status: 400 }
    );
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Analise e organize este cardápio:\n\n${contentToAnalyze.slice(0, 8000)}`,
        },
      ],
      max_tokens: 4000,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content?.trim() ?? "";
    const parsed = parseMenuJson(content);
    return NextResponse.json({ importData: parsed, source: "text" });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "Erro ao processar. Verifique o formato do arquivo.",
        raw: err.message,
      },
      { status: 500 }
    );
  }
}
