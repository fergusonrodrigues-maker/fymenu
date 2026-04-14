"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { buildMenuCache, uploadMenuCacheToStorage } from "./buildMenuCache";

export async function invalidateMenuCache(unitId: string) {
  const supabase = await createClient();

  const { menu_json, checksum } = await buildMenuCache(unitId);

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  await supabase.from("menu_cache").upsert(
    {
      unit_id: unitId,
      menu_json,
      checksum,
      expires_at: expiresAt.toISOString(),
      last_built_at: new Date().toISOString(),
    },
    { onConflict: "unit_id" }
  );

  // Also write to Supabase Storage so the CDN JSON is always fresh.
  // Wrapped in try/catch — a Storage failure must never block a client save.
  try {
    await uploadMenuCacheToStorage(menu_json.unit.slug, menu_json);
  } catch {}

  const slug = menu_json.unit.slug;
  revalidatePath(`/delivery/${slug}`);
  revalidatePath(`/menu/${slug}`);
  revalidatePath(`/tv/${slug}`);

  return { success: true };
}
