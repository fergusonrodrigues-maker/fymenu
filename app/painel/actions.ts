"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { invalidateMenuCache } from "@/lib/cache/invalidateMenuCache";

function normalizeName(name: string) {
  return name.trim();
}

function normalizeText(v: string) {
  return v.trim();
}

function normalizeSlug(v: string) {
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

  if (unitIdFromForm) {
    const { data, error } = await supabase
      .from("units")
      .select("id")
      .eq("id", unitIdFromForm)
      .maybeSingle();
    if (error || !data?.id) throw new Error("Unidade não encontrada ou sem permissão.");
    return data.id as string;
  }

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

/* ========================= UNIT ========================= */

export async function updateUnit(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const rawId = String(formData.get("unit_id") ?? formData.get("id") ?? "").trim();
  const unitId = await getUnitIdOrThrow(rawId || undefined);

  const name = normalizeName(String(formData.get("name") ?? ""));
  const address = normalizeText(String(formData.get("address") ?? ""));
  const city = normalizeText(String(formData.get("city") ?? ""));
  const neighborhood = normalizeText(String(formData.get("neighborhood") ?? ""));
  const instagram = normalizeText(String(formData.get("instagram") ?? ""));
  const whatsapp = normalizeText(String(formData.get("whatsapp") ?? ""));
  const mapsUrl = normalizeText(String(formData.get("maps_url") ?? ""));
  const isPublishedRaw = formData.get("is_published");
  const isPublished = isPublishedRaw === "true" || isPublishedRaw === "on";

  if (!name) throw new Error("Nome da unidade é obrigatório.");

  const { error } = await supabase
    .from("units")
    .update({
      name,
      address: address || null,
      city: city || null,
      neighborhood: neighborhood || null,
      instagram: instagram || null,
      whatsapp: whatsapp || null,
      maps_url: mapsUrl || null,
      is_published: isPublished,
    })
    .eq("id", unitId);

  if (error) throw new Error(error.message);

  revalidatePath("/painel");
  revalidatePath("/u");
}

/* ========================= UPLOAD LOGO ========================= */

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

    if (uploadError) return { ok: false, message: uploadError.message };

    const { data: pub } = supabase.storage.from("logos").getPublicUrl(filePath);
    const publicUrl = pub?.publicUrl ?? "";

    const { error: updateError } = await supabase
      .from("units")
      .update({ logo_url: publicUrl })
      .eq("id", unitId);

    if (updateError) return { ok: false, message: updateError.message };

    revalidatePath("/painel");
    revalidatePath("/u");

    return { ok: true, publicUrl };
  } catch (e: any) {
    return { ok: false, message: e?.message || "Falha ao enviar logo." };
  }
}

/* ========================= CATEGORIAS ========================= */

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

  const categoryType = normalizeText(String(formData.get("category_type") ?? "food"));
  const isAlcoholic = formData.get("is_alcoholic") === "true";

  const { error } = await supabase.from("categories").insert({
    unit_id: unitId,
    name,
    order_index: nextOrder,
    category_type: categoryType || "food",
    is_alcoholic: isAlcoholic,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/painel");
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

  revalidatePath("/painel");
  revalidatePath("/u");
}

export async function deleteCategory(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("ID inválido.");

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/painel");
  revalidatePath("/u");
}

/* ========================= PRODUTOS ========================= */

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

  const base_price = Math.round((parsePrice(basePriceInput) ?? 0) * 100);

  // Obter unit_id a partir da categoria
  const { data: category, error: catErr } = await supabase
    .from("categories")
    .select("unit_id")
    .eq("id", categoryId)
    .single();

  if (catErr || !category?.unit_id) throw new Error("Categoria não encontrada.");

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
    unit_id: category.unit_id,
    name,
    description: description || null,
    price_type: priceType,
    base_price,
    thumbnail_url: thumbnailUrl || null,
    video_url: videoUrl || null,
    order_index: nextOrder,
  });

  if (error) throw new Error(error.message);

  try {
    await invalidateMenuCache(category.unit_id);
  } catch {}

  revalidatePath("/painel");
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

  const base_price = Math.round((parsePrice(basePriceInput) ?? 0) * 100);

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

  try {
    const { data: prod } = await supabase
      .from("products")
      .select("category_id")
      .eq("id", id)
      .single();
    if (prod?.category_id) {
      const { data: cat } = await supabase
        .from("categories")
        .select("unit_id")
        .eq("id", prod.category_id)
        .single();
      if (cat?.unit_id) await invalidateMenuCache(cat.unit_id);
    }
  } catch {}

  revalidatePath("/painel");
  revalidatePath("/u");
}

export async function updateProductVariations(
  productId: string,
  variations: { id?: string; name: string; price: number }[]
): Promise<void> {
  const supabase = await createClient();

  // Delete existing variations and reinsert (simpler than upsert with partial ids)
  await supabase.from("product_variations").delete().eq("product_id", productId);

  if (variations.length > 0) {
    const rows = variations.map((v, i) => ({
      product_id: productId,
      name: v.name.trim(),
      price: v.price,
      order_index: i,
    }));
    const { error } = await supabase.from("product_variations").insert(rows);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/painel");
  revalidatePath("/u");
}

export async function deleteProduct(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("ID inválido.");

  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/painel");
  revalidatePath("/u");
}

/* ========================= UPSELL ========================= */

export async function addUpsellItem(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const productId = String(formData.get("product_id") ?? "");
  const upsellProductId = String(formData.get("upsell_product_id") ?? "");

  if (!productId || !upsellProductId) throw new Error("IDs inválidos.");

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

  const { count } = await supabase
    .from("product_upsell_items")
    .select("id", { count: "exact", head: true })
    .eq("upsell_id", group.id);

  if ((count ?? 0) >= 3) throw new Error("Máximo de 3 sugestões atingido.");

  const { data: existing } = await supabase
    .from("product_upsell_items")
    .select("id")
    .eq("upsell_id", group.id)
    .eq("product_id", upsellProductId)
    .maybeSingle();

  if (existing) return;

  const { error } = await supabase.from("product_upsell_items").insert({
    upsell_id: group.id,
    product_id: upsellProductId,
    position: count ?? 0,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/painel");
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

  revalidatePath("/painel");
  revalidatePath("/u");
}

/* ========================= ESTOQUE ========================= */

export async function updateProductStock(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("ID inválido.");

  const unlimited = formData.get("unlimited") === "true";
  const stock = unlimited ? 999 : (parseInt(String(formData.get("stock") ?? "0"), 10) || 0);
  const stockMinimum = parseInt(String(formData.get("stock_minimum") ?? "10"), 10) || 10;
  const sku = normalizeText(String(formData.get("sku") ?? ""));

  const { error } = await supabase
    .from("products")
    .update({ unlimited, stock, stock_minimum: stockMinimum, sku: sku || null })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/painel");
  revalidatePath("/u");
}

export async function adjustStock(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const productId = String(formData.get("product_id") ?? "");
  const unitId = String(formData.get("unit_id") ?? "");
  const quantityChange = parseInt(String(formData.get("quantity_change") ?? "0"), 10);
  const reason = normalizeText(String(formData.get("reason") ?? "manual"));
  const notes = normalizeText(String(formData.get("notes") ?? ""));

  if (!productId || !unitId) throw new Error("IDs inválidos.");
  if (isNaN(quantityChange) || quantityChange === 0) throw new Error("Quantidade inválida.");

  // Insert movement record
  const { error: movErr } = await supabase.from("stock_movements").insert({
    product_id: productId,
    unit_id: unitId,
    quantity_change: quantityChange,
    reason: reason || "manual",
    notes: notes || null,
    created_by: user.id,
  });
  if (movErr) throw new Error(movErr.message);

  // Update product stock
  const { data: prod, error: prodErr } = await supabase
    .from("products")
    .select("stock, unlimited")
    .eq("id", productId)
    .single();
  if (prodErr || !prod) throw new Error("Produto não encontrado.");

  if (!prod.unlimited) {
    const newStock = Math.max(0, (prod.stock ?? 0) + quantityChange);
    await supabase.from("products").update({ stock: newStock }).eq("id", productId);
  }

  revalidatePath("/painel");
  revalidatePath("/u");
}

export async function updateProductNutrition(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("ID inválido.");

  const parseNum = (v: string) => { const n = parseFloat(v.replace(",", ".")); return isNaN(n) ? null : n; };

  const nutrition = {
    calories: parseNum(String(formData.get("calories") ?? "")),
    protein: parseNum(String(formData.get("protein") ?? "")),
    fat: parseNum(String(formData.get("fat") ?? "")),
    carbs: parseNum(String(formData.get("carbs") ?? "")),
  };
  const preparationTime = parseInt(String(formData.get("preparation_time") ?? "0"), 10) || 0;
  const allergensRaw = normalizeText(String(formData.get("allergens") ?? ""));
  const allergens = allergensRaw ? allergensRaw.split(",").map((a) => a.trim()).filter(Boolean) : [];

  const { error } = await supabase
    .from("products")
    .update({ nutrition, preparation_time: preparationTime, allergens })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/painel");
  revalidatePath("/u");
}

/* ========================= PROFILE ========================= */

export async function updateProfile(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const firstName = normalizeText(String(formData.get("first_name") ?? ""));
  const lastName = normalizeText(String(formData.get("last_name") ?? ""));
  const phone = normalizeText(String(formData.get("phone") ?? ""));
  const address = normalizeText(String(formData.get("address") ?? ""));
  const city = normalizeText(String(formData.get("city") ?? ""));

  const { error } = await supabase
    .from("profiles")
    .update({ first_name: firstName || null, last_name: lastName || null, phone: phone || null, address: address || null, city: city || null })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/painel");
}

/* ========================= PLAN ========================= */

export async function changePlan(newPlan: "basic" | "pro"): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { error } = await supabase
    .from("restaurants")
    .update({ plan: newPlan, status: "active" })
    .eq("owner_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/painel");
}
