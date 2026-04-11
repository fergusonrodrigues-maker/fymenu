import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { welcomeEmail } from "@/lib/email-templates";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { restaurantId, firstName, lastName, phone, document, restaurantName, whatsapp, instagram } =
    await req.json();

  const admin = createAdminClient();

  // 1. Salva dados pessoais
  const { error: profileError } = await admin.from("profiles").upsert(
    { id: user.id, first_name: firstName, last_name: lastName, phone, document },
    { onConflict: "id" },
  );
  if (profileError) return NextResponse.json({ error: "Erro ao salvar dados pessoais" }, { status: 500 });

  // 2. Atualiza restaurant
  const { error: restError } = await admin
    .from("restaurants")
    .update({ name: restaurantName, whatsapp, instagram })
    .eq("id", restaurantId);
  if (restError) return NextResponse.json({ error: "Erro ao salvar dados do restaurante" }, { status: 500 });

  // 3. Cria unit de preview
  const slug = `preview-${restaurantId.slice(0, 8)}`;
  const { error: unitError } = await admin.from("units").insert({
    restaurant_id: restaurantId,
    name: restaurantName,
    slug,
    whatsapp,
    instagram,
    is_published: false,
  });
  if (unitError) return NextResponse.json({ error: "Erro ao criar cardápio de preview" }, { status: 500 });

  // 4. Marca onboarding como completo
  const { error: completeError } = await admin
    .from("restaurants")
    .update({ onboarding_completed: true })
    .eq("id", restaurantId);
  if (completeError) return NextResponse.json({ error: "Erro ao finalizar configuração" }, { status: 500 });

  // 5. Envia email de boas-vindas (não-bloqueante: falha silenciosa)
  const displayName = firstName || restaurantName;
  const template = welcomeEmail(displayName, "Teste grátis");
  await sendEmail({ to: user.email!, ...template });

  return NextResponse.json({ ok: true });
}
