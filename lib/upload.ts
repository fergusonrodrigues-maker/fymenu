import { createClient } from "@/lib/supabase/client";

// Mapeamento de tipo para bucket Supabase (fallback)
const SUPABASE_BUCKET: Record<string, string> = {
  video: "products",
  thumb: "products",
  cover: "logos",
  logo:  "logos",
};

/**
 * Faz upload de mídia — tenta R2 primeiro, fallback automático pro Supabase Storage.
 * @param file      Arquivo a enviar
 * @param scope     unitId ou productId usado como prefixo do path
 * @param type      "video" | "thumb" | "cover" | "logo"
 */
export async function uploadMedia(
  file: File,
  scope: string,
  type: "video" | "thumb" | "cover" | "logo",
): Promise<string | null> {
  // --- R2 ---
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("scope", scope);
    formData.append("type", type);

    const res = await fetch("/api/upload", { method: "POST", body: formData });

    if (res.ok) {
      const json = await res.json();
      return json.url as string;
    }

    if (res.status !== 501) {
      // Erro real no R2 (não é "not configured")
      const text = await res.text().catch(() => "");
      console.error("R2 upload failed:", text);
    }
  } catch (err) {
    console.error("R2 upload error:", err);
  }

  // --- Fallback: Supabase Storage ---
  try {
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const path = `${type === "video" || type === "thumb" ? `products/${scope}` : `${type}s/${scope}`}/${type}-${Date.now()}.${ext}`;
    const bucket = SUPABASE_BUCKET[type] ?? "products";

    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      contentType: file.type,
      upsert: true,
    });

    if (error) {
      console.error("Supabase upload error:", error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
    return publicUrl;
  } catch (err) {
    console.error("Supabase upload fallback error:", err);
    return null;
  }
}

