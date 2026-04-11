import { NextRequest, NextResponse } from "next/server";
import { deleteFromR2, getR2KeyFromUrl } from "@/lib/r2";

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

  // Só deletar se for URL do R2 (não mexer em URLs antigas do Supabase Storage)
  const r2PublicUrl = process.env.R2_PUBLIC_URL || "";
  const isR2Url =
    (r2PublicUrl && url.includes(r2PublicUrl)) ||
    url.includes("r2.dev") ||
    url.includes("media.fymenu.com");

  if (!isR2Url) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const key = getR2KeyFromUrl(url);
  if (key) await deleteFromR2(key);

  return NextResponse.json({ ok: true });
}
