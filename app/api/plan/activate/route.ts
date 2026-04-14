import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { restaurantId, plan } = await req.json();

  if (!restaurantId || plan !== "menu") {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: restaurant } = await admin
    .from("restaurants")
    .select("id, name, whatsapp, instagram")
    .eq("id", restaurantId)
    .eq("owner_id", user.id)
    .single();

  if (!restaurant) {
    return NextResponse.json(
      { error: "Restaurante não encontrado" },
      { status: 404 }
    );
  }

  // Cria unit de preview se ainda não existir
  const { data: existingUnits } = await admin
    .from("units")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .limit(1);

  if (!existingUnits || existingUnits.length === 0) {
    const slug = `preview-${restaurantId.slice(0, 8)}`;
    await admin.from("units").insert({
      restaurant_id: restaurantId,
      name: restaurant.name,
      slug,
      whatsapp: restaurant.whatsapp,
      instagram: restaurant.instagram,
      is_published: false,
    });
  }

  const { error } = await admin
    .from("restaurants")
    .update({
      plan: "menu",
      status: "active",
      onboarding_completed: true,
    })
    .eq("id", restaurantId);

  if (error) {
    return NextResponse.json(
      { error: "Erro ao ativar plano" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
