import { NextRequest, NextResponse } from "next/server";
import { buildMenuCache, uploadMenuCacheToStorage } from "@/lib/cache/buildMenuCache";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/menu/generate-cache?unit_id=<id>
 *
 * Rebuilds the menu cache for a unit and writes it to both the menu_cache
 * table and the public Supabase Storage bucket (menu-cache/{slug}.json).
 *
 * Called by dashboard save actions (Opção B) after every product / category /
 * unit change.  Also useful for manual re-generation or cron jobs.
 *
 * Auth: requires a valid CRON_SECRET header  OR  that the caller is the
 * service_role (server-to-server).  No session cookie required so it can be
 * called from any server action without the user being logged in.
 */
export async function POST(req: NextRequest) {
  // ── Auth check ────────────────────────────────────────────────────────────
  const secret = req.headers.get("x-cron-secret");
  const expectedSecret = process.env.CRON_SECRET;

  // If a CRON_SECRET is configured, validate it.
  // If not configured (dev), skip validation to avoid blocking local work.
  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const unitId = searchParams.get("unit_id");

  if (!unitId) {
    return NextResponse.json({ error: "unit_id is required" }, { status: 400 });
  }

  try {
    const { menu_json, checksum } = await buildMenuCache(unitId);

    const admin = createAdminClient();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Persist in menu_cache table
    const { error: upsertError } = await admin.from("menu_cache").upsert(
      {
        unit_id: unitId,
        menu_json,
        checksum,
        expires_at: expiresAt.toISOString(),
        last_built_at: new Date().toISOString(),
      },
      { onConflict: "unit_id" }
    );

    if (upsertError) {
      console.error("[generate-cache] upsert error:", upsertError.message);
    }

    // Upload to Storage
    await uploadMenuCacheToStorage(menu_json.unit.slug, menu_json);

    return NextResponse.json({
      success: true,
      slug: menu_json.unit.slug,
      generated_at: menu_json.generated_at,
      categories: menu_json.categories.length,
      products: menu_json.categories.reduce((n, c) => n + c.products.length, 0),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[generate-cache] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
