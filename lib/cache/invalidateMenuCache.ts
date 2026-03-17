"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { buildMenuCache } from "./buildMenuCache";

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

  const { data: unit } = await supabase
    .from("units")
    .select("slug")
    .eq("id", unitId)
    .single();

  if (unit?.slug) {
    revalidatePath(`/u/${unit.slug}`);
    revalidatePath(`/u/${unit.slug}/menu`);
    revalidatePath(`/u/${unit.slug}/tv`);
  }

  return { success: true };
}
