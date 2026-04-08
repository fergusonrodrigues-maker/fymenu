import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const text = formData.get("text") as string | null;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
  }

  const JSON_SCHEMA = `{
  "items": [
    { "name": "Nome do item/custo", "amount": 150.00, "category": "fornecedores", "date": "2026-04-01", "recurring": false }
  ],
  "total": 1500.00,
  "source": "nota fiscal"
}
Categorias válidas: aluguel, salarios, fornecedores, marketing, impostos, manutencao, delivery, geral. Valores em reais (decimal).`;

  if (text) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: `Analise dados financeiros e organize em itens de custo. Responda SOMENTE com JSON:\n${JSON_SCHEMA}` },
            { role: "user", content: `Analise:\n\n${text.slice(0, 8000)}` },
          ],
          max_tokens: 3000,
          temperature: 0.3,
        }),
      });
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content?.trim() ?? "";
      return NextResponse.json({ importData: JSON.parse(content.replace(/```json|```/g, "").trim()) });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  if (!file) {
    return NextResponse.json({ error: "Nenhum conteúdo para analisar" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (ext === "pdf" || ext === "jpg" || ext === "jpeg" || ext === "png") {
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mimeType = ext === "pdf" ? "application/pdf" : `image/${ext === "jpg" ? "jpeg" : ext}`;

    try {
      const visionRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: `Extraia TODOS os itens financeiros desta imagem/documento. Responda SOMENTE com JSON:\n${JSON_SCHEMA}` },
            { role: "user", content: [
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
              { type: "text", text: "Extraia os dados financeiros em JSON." },
            ]},
          ],
          max_tokens: 3000,
          temperature: 0.2,
        }),
      });
      const visionData = await visionRes.json();
      const extracted = visionData.choices?.[0]?.message?.content?.trim() ?? "";
      return NextResponse.json({ importData: JSON.parse(extracted.replace(/```json|```/g, "").trim()) });
    } catch {
      return NextResponse.json({ error: "Não foi possível interpretar o documento" }, { status: 422 });
    }
  }

  // CSV / XLSX / XLS — read as text
  let contentToAnalyze = "";
  try {
    contentToAnalyze = await file.text();
  } catch {
    return NextResponse.json({ error: "Não foi possível ler o arquivo" }, { status: 400 });
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: `Analise dados financeiros e organize em itens de custo. Responda SOMENTE com JSON:\n${JSON_SCHEMA}` },
          { role: "user", content: `Analise:\n\n${contentToAnalyze.slice(0, 8000)}` },
        ],
        max_tokens: 3000,
        temperature: 0.3,
      }),
    });
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim() ?? "";
    return NextResponse.json({ importData: JSON.parse(content.replace(/```json|```/g, "").trim()) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
