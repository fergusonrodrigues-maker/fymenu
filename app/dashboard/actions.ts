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

function parsePrice(input: string): number | null {
  const raw = input.trim();
  if (!raw) return null;

  const normalized = raw.replace(/\./g, "").replace(",", ".");
  const num = Number(normalized);

  if (!Number.isFinite(num)) return null;
  return num;
}

async function getUnitIdOrThrow() {
  const supabase = await createClient();

  const { data: unit, error } = await supabase
    .from("units")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (error || !unit?.id) {
    throw new Error(error?.message || "Nenhuma unidade encontrada.");
  }

  return unit.id as string;
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
    const unitId = String(formData.get("unitId") ?? "") || (await getUnitIdOrThrow());

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

  const unitId = await getUnitIdOrThrow();

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
  revalidatePath("/u");
}

export async function deleteCategory(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("ID inválido.");

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
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
  revalidatePath("/u");
}

export async function deleteProduct(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("ID inválido.");

  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/u");
}
/* =========================
   UNIT (Configurações da Unidade)
========================= */

export async function getUnitForDashboard() {
  const supabase = await createClient();

  const { data: unit, error } = await supabase
    .from("units")
    .select("id, name, slug, address, instagram, whatsapp, logo_url")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return unit;
}

export async function updateUnitInfo(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const unitId = await getUnitIdOrThrow();

  const name = normalizeName(String(formData.get("name") ?? ""));
  const slug = normalizeText(String(formData.get("slug") ?? "")).replace(/[\r\n]/g, "");
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
  revalidatePath(`/u/${slug}`);
}