import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const text = formData.get("text") as string | null;

  if (!process.env.OPENAI_API_KEY)
    return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });

  const SYSTEM_PROMPT = `Você é um especialista em conversão de dados de analytics. Converta os dados recebidos para o formato de eventos do FyMenu. Responda SOMENTE com JSON válido (sem markdown):
{
  "events": [
    { "event": "menu_view", "date": "2026-03-01T10:00:00Z", "product_id": null },
    { "event": "product_click", "date": "2026-03-01T10:05:00Z", "product_id": null },
    { "event": "whatsapp_click", "date": "2026-03-01T10:10:00Z", "product_id": null }
  ],
  "daily_summary": [
    { "date": "01/03/2026", "views": 150, "clicks": 45, "orders": 12 }
  ],
  "period": "01/03/2026 - 31/03/2026"
}
Eventos válidos: menu_view, product_click, whatsapp_click, ifood_click.
Para cada visualização, crie um evento menu_view.
Para cada clique, crie um evento product_click.
Para cada pedido/conversão, crie um evento whatsapp_click.
Distribua os eventos ao longo do dia (horários variados entre 10:00-23:00).
Se os dados vêm em formato diário (ex: "150 visualizações no dia 01/03"), crie 150 eventos menu_view distribuídos nesse dia.
MÁXIMO 500 eventos no total (agrupe se necessário).`;

  let contentToAnalyze = "";
  if (text) {
    contentToAnalyze = text;
  } else if (file) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "csv" || ext === "json" || ext === "txt") {
      contentToAnalyze = await file.text();
    } else {
      contentToAnalyze = "Arquivo binário não suportado";
    }
  }

  if (!contentToAnalyze)
    return NextResponse.json({ error: "Nenhum conteúdo" }, { status: 400 });

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Converta estes dados de analytics:\n\n${contentToAnalyze.slice(0, 6000)}`,
          },
        ],
        max_tokens: 4000,
        temperature: 0.2,
      }),
    });
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    return NextResponse.json({
      importData: JSON.parse(content.replace(/```json|```/g, "").trim()),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
