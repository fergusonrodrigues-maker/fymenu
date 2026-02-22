"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

/* ============================= */
/* HELPERS */
/* ============================= */

function cleanSlug(input: string) {
  return (input || "").trim();
}

function normalizeWhatsapp(input: string) {
  const raw = (input || "").trim();
  if (!raw) return "";

  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;

  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";

  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}`;
}

/* ============================= */
/* UPDATE UNIT */
/* ============================= */

export async function updateUnitAction(formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) redirect("/login");

  const unitId = String(formData.get("unitId") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const slug = cleanSlug(String(formData.get("slug") || ""));
  const address = String(formData.get("address") || "").trim();
  const instagram = String(formData.get("instagram") || "").trim();
  const whatsappInput = String(formData.get("whatsapp") || "").trim();

  if (!unitId) redirect("/dashboard?err=unitId vazio.");
  if (!slug) redirect("/dashboard?err=Slug não pode ficar vazio.");

  const { data: rest, error: restErr } = await supabase
    .from("restaurants")
    .select("id")
    .eq("owner_id", auth.user.id)
    .single();

  if (restErr || !rest?.id) redirect("/dashboard?err=Restaurante não encontrado.");

  const { data: unitCheck, error: unitErr } = await supabase
    .from("units")
    .select("id")
    .eq("id", unitId)
    .eq("restaurant_id", rest.id)
    .single();

  if (unitErr || !unitCheck?.id)
    redirect("/dashboard?err=Unidade não pertence a este usuário.");

  const whatsapp = normalizeWhatsapp(whatsappInput);

  const { error: updErr } = await supabase
    .from("units")
    .update({
      name: name || null,
      slug,
      address: address || null,
      instagram: instagram || null,
      whatsapp: whatsapp || null,
    })
    .eq("id", unitId);

  if (updErr) redirect("/dashboard?err=" + updErr.message);

  revalidatePath("/dashboard");
  redirect("/dashboard?ok=1");
}

/* ============================= */
/* CREATE CATEGORY */
/* ============================= */

export async function createCategoryAction(formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const unitId = String(formData.get("unitId") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const type = String(formData.get("type") || "food").trim();
  const orderIndexRaw = String(formData.get("order_index") || "").trim();
  const order_index = orderIndexRaw === "" ? 0 : Number(orderIndexRaw);

  if (!unitId) redirect("/dashboard?err=unitId vazio.");
  if (!name) redirect("/dashboard?err=Nome da categoria obrigatório.");
  if (!Number.isFinite(order_index)) redirect("/dashboard?err=order_index inválido.");

  const { error } = await supabase.from("categories").insert({
    unit_id: unitId,
    name,
    type,
    order_index,
  });

  if (error) redirect("/dashboard?err=" + error.message);

  revalidatePath("/dashboard");
  redirect("/dashboard?ok=1");
}

/* ============================= */
/* UPDATE CATEGORY */
/* ============================= */

export async function updateCategoryAction(formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const categoryId = String(formData.get("categoryId") || "").trim();
  const unitId = String(formData.get("unitId") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const type = String(formData.get("type") || "food").trim();
  const orderIndexRaw = String(formData.get("order_index") || "").trim();
  const order_index = orderIndexRaw === "" ? 0 : Number(orderIndexRaw);

  if (!categoryId) redirect("/dashboard?err=categoryId vazio.");
  if (!unitId) redirect("/dashboard?err=unitId vazio.");
  if (!name) redirect("/dashboard?err=Nome obrigatório.");
  if (!Number.isFinite(order_index)) redirect("/dashboard?err=order_index inválido.");

  const { error } = await supabase
    .from("categories")
    .update({ name, type, order_index })
    .eq("id", categoryId)
    .eq("unit_id", unitId);

  if (error) redirect("/dashboard?err=" + error.message);

  revalidatePath("/dashboard");
  redirect("/dashboard?ok=1");
}

/* ============================= */
/* DELETE CATEGORY */
/* ============================= */

export async function deleteCategoryAction(formData: FormData) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const categoryId = String(formData.get("categoryId") || "").trim();
  const unitId = String(formData.get("unitId") || "").trim();

  if (!categoryId) redirect("/dashboard?err=categoryId vazio.");
  if (!unitId) redirect("/dashboard?err=unitId vazio.");

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId)
    .eq("unit_id", unitId);

  if (error) redirect("/dashboard?err=" + error.message);

  revalidatePath("/dashboard");
  redirect("/dashboard?ok=1");
}

/* ============================= */
/* UPLOAD LOGO */
/* ============================= */

export async function uploadLogoAction(
  formData: FormData
): Promise<{ ok: boolean; message?: string; publicUrl?: string }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const unitId = String(formData.get("unitId") || "").trim();
  const file = formData.get("file") as File | null;

  if (!unitId) return { ok: false, message: "unitId vazio." };
  if (!file) return { ok: false, message: "Arquivo não enviado." };

  if (!file.type?.startsWith("image/"))
    return { ok: false, message: "Envie uma imagem válida." };

  if (file.size > 3 * 1024 * 1024)
    return { ok: false, message: "Imagem muito grande (máx 3MB)." };

  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const fileName = `logo-${Date.now()}.${ext}`;
  const path = `${unitId}/${fileName}`;

  const { error: uploadErr } = await supabase.storage
    .from("logos")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    });

  if (uploadErr) return { ok: false, message: uploadErr.message };

  const { data } = supabase.storage.from("logos").getPublicUrl(path);
  const publicUrl = data.publicUrl;

  const { error: dbErr } = await supabase
    .from("units")
    .update({ logo_url: publicUrl })
    .eq("id", unitId);

  if (dbErr) return { ok: false, message: dbErr.message };

  revalidatePath("/dashboard");
  return { ok: true, publicUrl };
}