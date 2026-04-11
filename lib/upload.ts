import { createClient } from "@/lib/supabase/client";

// Mapeamento de tipo para bucket Supabase (fallback)
const SUPABASE_BUCKET: Record<string, string> = {
  video: "products",
  thumb: "products",
  cover: "logos",
  logo:  "logos",
};

function isR2Url(url: string): boolean {
  const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";
  return (
    (!!r2PublicUrl && url.includes(r2PublicUrl)) ||
    url.includes("r2.dev") ||
    url.includes("media.fymenu.com")
  );
}

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

/**
 * Deleta mídia — roteia automaticamente para R2 ou Supabase Storage
 * com base na URL. URLs antigas do Supabase são ignoradas (não deletadas via R2).
 */
export async function deleteMedia(url: string): Promise<void> {
  if (!url) return;

  if (isR2Url(url)) {
    try {
      await fetch("/api/upload/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
    } catch (err) {
      console.error("R2 delete error:", err);
    }
    return;
  }

  // URL do Supabase Storage — deletar via SDK
  try {
    const supabase = createClient();
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
    if (pathMatch) {
      const [, bucket, filePath] = pathMatch;
      await supabase.storage.from(bucket).remove([filePath]);
    }
  } catch (err) {
    console.error("Supabase delete error:", err);
  }
}
