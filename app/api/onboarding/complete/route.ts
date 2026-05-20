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
  // Mantém profiles como source-of-truth do perfil pessoal, MAS também
  // espelha owner_first_name/last_name/document/phone em restaurants —
  // o gate do /painel lê dessa coluna (owner_document) e várias features
  // (Asaas, admin CRM) leem owner_phone/document daqui.
  const restUpdate: Record<string, unknown> = {};
  if (restaurantName !== undefined) restUpdate.name = restaurantName;
  if (whatsapp !== undefined) restUpdate.whatsapp = whatsapp;
  if (instagram !== undefined) restUpdate.instagram = instagram;
  if (firstName !== undefined) restUpdate.owner_first_name = firstName;
  if (lastName !== undefined) restUpdate.owner_last_name = lastName;
  if (document !== undefined) restUpdate.owner_document = document;
  if (phone !== undefined) restUpdate.owner_phone = phone;

  const { error: restError } = await admin
    .from("restaurants")
    .update(restUpdate)
    .eq("id", restaurantId);
  if (restError) return NextResponse.json({ error: "Erro ao salvar dados do restaurante" }, { status: 500 });

  // 3. Cria unit de preview (idempotente)
  // Só cria quando vier restaurantName (cenário do wizard original). O modal
  // do painel envia apenas dados do dono — pra essas contas a unit já existe
  // (signup cria, ou admin populou). Skip evita unit zumbi e duplicata.
  if (restaurantName) {
    const { data: existingUnit } = await admin
      .from("units")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .limit(1)
      .maybeSingle();

    if (!existingUnit) {
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
    }
  }

  // 4. Marca onboarding como completo
  const { error: completeError } = await admin
    .from("restaurants")
    .update({ onboarding_completed: true })
    .eq("id", restaurantId);
  if (completeError) return NextResponse.json({ error: "Erro ao finalizar configuração" }, { status: 500 });

  // 5. Garante membership owner — SELECT-then-INSERT idempotente.
  // (Não usamos .upsert() porque restaurant_members não tem UNIQUE
  // (restaurant_id, user_id); o onConflict falhava silenciosamente.)
  const { data: existingMember } = await admin
    .from("restaurant_members")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existingMember) {
    const { error: memberErr } = await admin
      .from("restaurant_members")
      .insert({
        user_id: user.id,
        restaurant_id: restaurantId,
        role: "owner",
        status: "active",
        invited_email: user.email ?? "",
        activated_at: new Date().toISOString(),
      });
    if (memberErr) {
      console.error("[onboarding/complete] Falha membership owner:", memberErr);
      return NextResponse.json(
        { error: "member_insert_failed", detail: memberErr.message },
        { status: 500 },
      );
    }
  }

  // 6. Envia email de boas-vindas (não-bloqueante: falha silenciosa)
  const displayName = firstName || restaurantName;
  const template = welcomeEmail(displayName, "Teste grátis");
  await sendEmail({ to: user.email!, ...template });

  return NextResponse.json({ ok: true });
}
