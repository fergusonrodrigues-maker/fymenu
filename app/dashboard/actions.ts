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