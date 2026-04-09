import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `Você é um especialista em estoque de restaurantes. Analise o conteúdo e extraia a lista de ingredientes/insumos. Responda SOMENTE com JSON válido (sem markdown, sem backticks):
{
  "items": [
    {
      "name": "Nome do ingrediente",
      "category": "proteinas",
      "unit_measure": "kg",
      "quantity": 10.0,
      "cost_per_unit": 95.00,
      "supplier": "Nome do fornecedor ou null",
      "min_stock": 2.0
    }
  ]
}
Categorias válidas: proteinas, hortifruti, laticinios, graos, bebidas, temperos, embalagens, limpeza, geral.
Unidades válidas: kg, g, l, ml, un, cx, pct, dz.
cost_per_unit = custo por unidade de medida em reais (decimal). Se não informado, colocar 0.
min_stock = sugestão de estoque mínimo (20% da quantidade atual). Se não fizer sentido, 0.
Infira a categoria automaticamente pelo nome do ingrediente.`;

function parseJson(raw: string): any {
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
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
                  text: "Extraia a lista de ingredientes/insumos desta imagem. Responda SOMENTE com JSON válido.",
                },
              ],
            },
          ],
          max_tokens: 3000,
          temperature: 0.2,
        });

        const extracted = response.choices[0]?.message?.content?.trim() ?? "";
        return NextResponse.json({ importData: parseJson(extracted) });
      } catch (err: any) {
        return NextResponse.json(
          { error: "Não foi possível interpretar a imagem.", raw: err.message },
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
      { error: "Nenhum conteúdo para analisar." },
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
          content: `Extraia os ingredientes:\n\n${contentToAnalyze.slice(0, 6000)}`,
        },
      ],
      max_tokens: 3000,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content?.trim() ?? "";
    return NextResponse.json({ importData: parseJson(content) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
