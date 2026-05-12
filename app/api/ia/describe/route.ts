import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { hasPlanFeature } from "@/lib/plans";
import { getRestaurantPlan } from "@/lib/server/getRestaurantPlan";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: member } = await supabase
    .from("restaurant_members")
    .select("restaurant_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member?.restaurant_id) {
    return NextResponse.json({ error: "no_restaurant" }, { status: 403 });
  }

  const { plan, unitFeatures } = await getRestaurantPlan(member.restaurant_id);
  if (!hasPlanFeature(plan, "iaDescription", unitFeatures)) {
    console.warn(`[gating] user=${user.id} blocked from ia/describe plan=${plan}`);
    return NextResponse.json(
      { error: "feature_not_available", minPlan: "menupro" },
      { status: 403 }
    );
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

    const description = completion.choices[0]?.message?.content?.trim() ?? "";

    return NextResponse.json({ description });
  } catch (err: unknown) {
    console.error("[ia/describe]", err);
    const message = err instanceof Error ? err.message : "Erro interno.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}