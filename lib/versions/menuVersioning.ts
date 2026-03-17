"use server";

import { createClient } from "@/lib/supabase/server";
import type { MenuCacheData } from "@/lib/cache/buildMenuCache";

export async function createMenuVersion(
  unitId: string,
  menuJson: MenuCacheData,
  description: string
) {
  const supabase = await createClient();

  const { data: lastVersion } = await supabase
    .from("menu_versions")
    .select("version_number")
    .eq("unit_id", unitId)
    .order("version_number", { ascending: false })
    .limit(1)
    .single();

  const newVersionNumber = (lastVersion?.version_number || 0) + 1;

  const { data: version, error } = await supabase
    .from("menu_versions")
    .insert({
      unit_id: unitId,
      menu_json: menuJson,
      version_number: newVersionNumber,
      description,
    })
    .select()
    .single();

  if (error) throw new Error("Erro ao criar versão");

  // Manter apenas últimas 10 versões
  const { data: oldVersions } = await supabase
    .from("menu_versions")
    .select("id")
    .eq("unit_id", unitId)
    .order("version_number", { ascending: false })
    .range(10, 999);

  if (oldVersions && oldVersions.length > 0) {
    await supabase
      .from("menu_versions")
      .delete()
      .in("id", oldVersions.map((v) => v.id));
  }

  return version;
}

export async function restoreMenuVersion(unitId: string, versionNumber: number) {
  const supabase = await createClient();

  const { data: version, error } = await supabase
    .from("menu_versions")
    .select("menu_json")
    .eq("unit_id", unitId)
    .eq("version_number", versionNumber)
    .single();

  if (error || !version) throw new Error("Versão não encontrada");

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  await supabase.from("menu_cache").upsert(
    {
      unit_id: unitId,
      menu_json: version.menu_json,
      expires_at: expiresAt.toISOString(),
    },
    { onConflict: "unit_id" }
  );

  await createMenuVersion(unitId, version.menu_json, `Restaurado de versão ${versionNumber}`);

  return { success: true };
}

export async function listMenuVersions(unitId: string) {
  const supabase = await createClient();

  const { data: versions, error } = await supabase
    .from("menu_versions")
    .select("version_number, description, created_at")
    .eq("unit_id", unitId)
    .order("version_number", { ascending: false })
    .limit(10);

  if (error) throw new Error("Erro ao listar versões");

  return versions || [];
}
