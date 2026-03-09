// FILE: /app/dashboard/actions.ts
// ACTION: REPLACE ENTIRE FILE
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function normalizeName(name: string) {
  return name.trim();
}

function normalizeText(v: string) {
  return v.trim();
}

function normalizeSlug(v: string) {
  // higiene do slug: trim + remove \r\n
  return String(v ?? "").trim().replace(/[\r\n]/g, "");
}

function parsePrice(input: string): number | null {
  const raw = input.trim();
  if (!raw) return null;

  const normalized = raw.replace(/\./g, "").replace(",", ".");
  const num = Number(normalized);

  if (!Number.isFinite(num)) return null;
  return num;
}

async function getUnitIdOrThrow(unitIdFromForm?: string) {
  const supabase = await createClient();

  // se veio unit_id explícito no form, valida que pertence ao dono
  if (unitIdFromForm) {
    const { data, error } = await supabase
      .from("units")
      .select("id")
      .eq("id", unitIdFromForm)
      .maybeSingle();
    if (error || !data?.id) throw new Error("Unidade não encontrada ou sem permissão.");
    return data.id as string;
  }

  // fallback: pega a primeira unit DO restaurante do usuário logado
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!restaurant?.id) throw new Error("Restaurante não encontrado.");

  const { data: unit, error } = await supabase
    .from("units")
    .select("id")
    .eq("restaurant_id", restaurant.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !unit?.id) throw new Error("Nenhuma unidade encontrada.");
  return unit.id as string;
}

/* =========================
   UNIT (editar dados da unidade)
   (usado em /dashboard/unit)
========================= */
export async function updateUnit(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const unitId = await getUnitIdOrThrow(
    String(formData.get("unit_id") ?? "") || undefined
  );

  const name = normalizeName(String(formData.get("name") ?? ""));
  const slug = normalizeSlug(String(formData.get("slug") ?? ""));
  const address = normalizeText(String(formData.get("address") ?? ""));
  const instagram = normalizeText(String(formData.get("instagram") ?? ""));
  const whatsapp = normalizeText(String(formData.get("whatsapp") ?? ""));

  if (!name) throw new Error("Nome da unidade é obrigatório.");
  if (!slug) throw new Error("Slug é obrigatório.");

  const { error } = await supabase
    .from("units")
    .update({
      name,
      slug,
      address: address || null,
      instagram: instagram || null,
      whatsapp: whatsapp || null,
    })
    .eq("id", unitId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/unit");
  revalidatePath("/u");
}

/* =========================
   UPLOAD LOGO (bucket: logos)
   (chamado via await no client)
========================= */

export async function uploadLogoAction(
  formData: FormData
): Promise<{ ok: boolean; message?: string; publicUrl?: string }> {
  try {
    const supabase = await createClient();

    const file = formData.get("file");
    const unitId = await getUnitIdOrThrow(
      String(formData.get("unitId") ?? "") || undefined
    );

    if (!file || !(file instanceof File)) {
      return { ok: false, message: "Arquivo inválido." };
    }

    if (!file.type.startsWith("image/")) {
      return { ok: false, message: "Envie uma imagem." };
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const safeExt = ["png", "jpg", "jpeg", "webp"].includes(ext) ? ext : "png";

    const filePath = `units/${unitId}/logo-${Date.now()}.${safeExt}`;

    const { error: uploadError } = await supabase.storage
      .from("logos")
      .upload(filePath, file, {
        upsert: true,
        cacheControl: "3600",
        contentType: file.type,
      });

    if (uploadError) {
      return { ok: false, message: uploadError.message };
    }

    const { data: pub } = supabase.storage.from("logos").getPublicUrl(filePath);
    const publicUrl = pub?.publicUrl ?? "";

    const { error: updateError } = await supabase
      .from("units")
      .update({ logo_url: publicUrl })
      .eq("id", unitId);

    if (updateError) {
      return { ok: false, message: updateError.message };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/unit");
    revalidatePath("/u");

    return { ok: true, publicUrl };
  } catch (e: any) {
    return { ok: false, message: e?.message || "Falha ao enviar logo." };
  }
}

/* =========================
   CATEGORIAS (para <form action={...}>)
   MUST return void | Promise<void>
========================= */

export async function createCategory(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const name = normalizeName(String(formData.get("name") ?? ""));
  if (!name) throw new Error("Nome da categoria é obrigatório.");

  const unitId = await getUnitIdOrThrow(
    String(formData.get("unit_id") ?? "") || undefined
  );

  const { data: last } = await supabase
    .from("categories")
    .select("order_index")
    .eq("unit_id", unitId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = typeof last?.order_index === "number" ? last.order_index + 1 : 0;

  const { error } = await supabase.from("categories").insert({
    unit_id: unitId,
    name,
    order_index: nextOrder,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/cardapio");
  revalidatePath("/u");
}

export async function updateCategory(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  const name = normalizeName(String(formData.get("name") ?? ""));

  if (!id) throw new Error("ID inválido.");
  if (!name) throw new Error("Nome é obrigatório.");

  const { error } = await supabase.from("categories").update({ name }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/cardapio");
  revalidatePath("/u");
}

export async function deleteCategory(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("ID inválido.");

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/cardapio");
  revalidatePath("/u");
}

/* =========================
   PRODUTOS (para <form action={...}>)
   schema: price_type + base_price + urls + order_index
========================= */

export async function createProduct(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const categoryId = String(formData.get("category_id") ?? "");
  const name = normalizeName(String(formData.get("name") ?? ""));
  const description = normalizeText(String(formData.get("description") ?? ""));
  const priceType =
    String(formData.get("price_type") ?? "fixed") === "variable" ? "variable" : "fixed";
  const basePriceInput = String(formData.get("base_price") ?? "");
  const thumbnailUrl = normalizeText(String(formData.get("thumbnail_url") ?? ""));
  const videoUrl = normalizeText(String(formData.get("video_url") ?? ""));

  if (!categoryId) throw new Error("category_id é obrigatório.");
  if (!name) throw new Error("Nome do produto é obrigatório.");

  const base_price = parsePrice(basePriceInput) ?? 0;

  const { data: last } = await supabase
    .from("products")
    .select("order_index")
    .eq("category_id", categoryId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = typeof last?.order_index === "number" ? last.order_index + 1 : 0;

  const { error } = await supabase.from("products").insert({
    category_id: categoryId,
    name,
    description: description || null,
    price_type: priceType,
    base_price,
    thumbnail_url: thumbnailUrl || null,
    video_url: videoUrl || null,
    order_index: nextOrder,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/cardapio");
  revalidatePath("/u");
}

export async function updateProduct(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  const name = normalizeName(String(formData.get("name") ?? ""));
  const description = normalizeText(String(formData.get("description") ?? ""));
  const priceType =
    String(formData.get("price_type") ?? "fixed") === "variable" ? "variable" : "fixed";
  const basePriceInput = String(formData.get("base_price") ?? "");
  const thumbnailUrl = normalizeText(String(formData.get("thumbnail_url") ?? ""));
  const videoUrl = normalizeText(String(formData.get("video_url") ?? ""));

  if (!id) throw new Error("ID inválido.");
  if (!name) throw new Error("Nome do produto é obrigatório.");

  const base_price = parsePrice(basePriceInput) ?? 0;

  const { error } = await supabase
    .from("products")
    .update({
      name,
      description: description || null,
      price_type: priceType,
      base_price,
      thumbnail_url: thumbnailUrl || null,
      video_url: videoUrl || null,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/cardapio");
  revalidatePath("/u");
}

export async function deleteProduct(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("ID inválido.");

  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/cardapio");
  revalidatePath("/u");
}

export async function addUpsellItem(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const productId = String(formData.get("product_id") ?? "");
  const upsellProductId = String(formData.get("upsell_product_id") ?? "");

  if (!productId || !upsellProductId) throw new Error("IDs inválidos.");

  // Garante que existe um grupo de upsell para o produto
  let { data: group } = await supabase
    .from("product_upsells")
    .select("id")
    .eq("product_id", productId)
    .maybeSingle();

  if (!group) {
    const { data: created, error: groupErr } = await supabase
      .from("product_upsells")
      .insert({ product_id: productId })
      .select("id")
      .single();
    if (groupErr || !created) throw new Error(groupErr?.message ?? "Erro ao criar grupo de upsell.");
    group = created;
  }

  // Conta itens existentes
  const { count } = await supabase
    .from("product_upsell_items")
    .select("id", { count: "exact", head: true })
    .eq("upsell_id", group.id);

  if ((count ?? 0) >= 3) throw new Error("Máximo de 3 sugestões atingido.");

  // Evita duplicata
  const { data: existing } = await supabase
    .from("product_upsell_items")
    .select("id")
    .eq("upsell_id", group.id)
    .eq("product_id", upsellProductId)
    .maybeSingle();

  if (existing) return; // já existe, silencia

  const { error } = await supabase.from("product_upsell_items").insert({
    upsell_id: group.id,
    product_id: upsellProductId,
    position: count ?? 0,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/cardapio");
  revalidatePath("/u");
}

export async function removeUpsellItem(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("ID inválido.");

  const { error } = await supabase
    .from("product_upsell_items")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/cardapio");
  revalidatePath("/u");
}