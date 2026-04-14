import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import OpenAI from "openai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { unitId, productId, productName, cartItems } = await req.json();

  if (!unitId || !productId) {
    return NextResponse.json({ combos: [], suggestions: [] });
  }

  // ─── 1) Fetch product's upsell_mode from DB ────────────────────────────────
  const { data: productRow } = await admin
    .from("products")
    .select("upsell_mode")
    .eq("id", productId)
    .single();

  const upsellMode: string = productRow?.upsell_mode ?? "auto";

  // ─── Off → return nothing ──────────────────────────────────────────────────
  if (upsellMode === "off") {
    return NextResponse.json({ combos: [], suggestions: [] });
  }

  // ─── 2) Check plan — AI only for menupro/business ─────────────────────────
  const { data: unitRow } = await admin
    .from("units")
    .select("restaurant_id")
    .eq("id", unitId)
    .single();

  let aiEnabled = false;
  if (unitRow?.restaurant_id) {
    const { data: restaurant } = await admin
      .from("restaurants")
      .select("plan")
      .eq("id", unitRow.restaurant_id)
      .single();
    const plan = restaurant?.plan ?? "menu";
    aiEnabled = plan === "menupro" || plan === "business";
  }

  // ─── 3) Manual combos for this product ────────────────────────────────────
  const { data: manualCombos } = await admin
    .from("product_combo_suggestions")
    .select(
      "combo_id, product_combos(id, name, combo_price, original_price, is_active, combo_items(quantity, products(name)))"
    )
    .eq("product_id", productId)
    .eq("is_active", true);

  const activeCombos =
    (manualCombos ?? [])
      .filter((c: any) => c.product_combos?.is_active)
      .map((c: any) => c.product_combos)
      .filter(Boolean) ?? [];

  // ─── Manual mode WITH combos → return only combos (no AI) ─────────────────
  if (upsellMode === "manual" && activeCombos.length > 0) {
    return NextResponse.json({ combos: activeCombos, suggestions: [] });
  }

  // ─── Manual mode WITHOUT combos → fallback to AI (continue below)
  // ─── Auto mode → call AI

  // ─── 4) If plan doesn't support AI, return just combos ────────────────────
  if (!aiEnabled) {
    return NextResponse.json({ combos: activeCombos, suggestions: [] });
  }

  // ─── 4) Load products for AI context ──────────────────────────────────────
  const { data: products } = await admin
    .from("products")
    .select("id, name, base_price, price_type, category_id, categories(name)")
    .eq("unit_id", unitId)
    .eq("is_active", true)
    .neq("id", productId)
    .limit(50);

  if (!products || products.length === 0) {
    return NextResponse.json({ combos: activeCombos, suggestions: [] });
  }

  // ─── 5) Call OpenAI ───────────────────────────────────────────────────────
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ combos: activeCombos, suggestions: [] });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const cartItemNames =
    Array.isArray(cartItems) && cartItems.length > 0
      ? cartItems.map((i: any) => i.name).join(", ")
      : "";

  // Exclude cart items from suggestions
  const cartProductIds = new Set(
    Array.isArray(cartItems) ? cartItems.map((i: any) => i.product_id) : []
  );

  const availableProducts = products
    .filter((p) => !cartProductIds.has(p.id))
    .slice(0, 30);

  if (availableProducts.length === 0) {
    return NextResponse.json({ combos: activeCombos, suggestions: [] });
  }

  const productList = availableProducts
    .map(
      (p) =>
        `- id:${p.id} | ${p.name} (R$${p.base_price?.toFixed(2)}) [${(p as any).categories?.name ?? "Geral"}]`
    )
    .join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 300,
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: `Você é um assistente de vendas de restaurante. Analise o cardápio e sugira até 3 produtos que combinam bem com o pedido do cliente. Responda APENAS em JSON array sem markdown: [{"productId": "id exato do produto", "reason": "motivo curto max 8 palavras"}]. Priorize: bebidas se não há no carrinho, acompanhamentos complementares, sobremesas. NUNCA sugira produto já no carrinho.`,
        },
        {
          role: "user",
          content: `Cliente pediu: ${productName}${cartItemNames ? `\nCarrinho atual: ${cartItemNames}` : ""}\n\nProdutos disponíveis:\n${productList}`,
        },
      ],
    });

    const aiText = completion.choices[0]?.message?.content ?? "[]";

    let aiSuggestions: Array<{ productId: string; reason: string }> = [];
    try {
      const cleaned = aiText.replace(/```json|```/g, "").trim();
      aiSuggestions = JSON.parse(cleaned);
    } catch {
      aiSuggestions = [];
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    const enriched = aiSuggestions
      .filter((s) => s.productId)
      .map((s) => {
        const prod = productMap.get(s.productId);
        if (!prod) return null;
        return {
          id: prod.id,
          name: prod.name,
          price: prod.base_price ?? 0,
          reason: s.reason || "Combina com seu pedido",
          source: "ai",
        };
      })
      .filter(Boolean)
      .slice(0, 3);

    return NextResponse.json({ combos: activeCombos, suggestions: enriched });
  } catch (err) {
    console.error("[upsell-ai] OpenAI error:", err);
    return NextResponse.json({ combos: activeCombos, suggestions: [] });
  }
}
