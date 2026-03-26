import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { restaurantName } = await request.json();
    if (!restaurantName) {
      return NextResponse.json({ error: "restaurantName é obrigatório" }, { status: 400 });
    }

    const supabase = await createClient();
    const suggestions = generateSuggestions(restaurantName);
    const available: string[] = [];

    for (const s of suggestions) {
      const { data } = await supabase
        .from("units")
        .select("id")
        .or(`slug.eq.${s},custom_domain.eq.${s}`)
        .maybeSingle();
      if (!data) available.push(s);
    }

    // If all taken, try numbered variants
    if (available.length < 3) {
      const base = slugify(restaurantName);
      for (let i = 1; available.length < 3; i++) {
        const v = `${base}-${String(i).padStart(2, "0")}`;
        const { data } = await supabase
          .from("units")
          .select("id")
          .or(`slug.eq.${v},custom_domain.eq.${v}`)
          .maybeSingle();
        if (!data) available.push(v);
        if (i > 20) break;
      }
    }

    return NextResponse.json({ suggestions: available.slice(0, 3) });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

function generateSuggestions(restaurantName: string): string[] {
  const base = slugify(restaurantName);
  const words = restaurantName.trim().split(/\s+/);
  const short = words.length > 1
    ? slugify(words.slice(0, 2).join(" "))
    : base;
  return [...new Set([base, short, `${base}-menu`])].filter(Boolean);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
    .substring(0, 63);
}
