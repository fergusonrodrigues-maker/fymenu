import { NextRequest, NextResponse } from "next/server";
import { uploadToR2, generateMediaKey, isR2Configured } from "@/lib/r2";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_TYPES: Record<string, string[]> = {
  video: ["video/mp4", "video/webm", "video/quicktime"],
  thumb: ["image/jpeg", "image/png", "image/webp"],
  cover: ["image/jpeg", "image/png", "image/webp"],
  logo:  ["image/jpeg", "image/png", "image/webp"],
};

const MAX_SIZE: Record<string, number> = {
  video: 100 * 1024 * 1024, // 100 MB
  thumb:  10 * 1024 * 1024, //  10 MB
  cover:  10 * 1024 * 1024,
  logo:   10 * 1024 * 1024,
};

export async function POST(req: NextRequest) {
  if (!isR2Configured()) {
    return NextResponse.json(
      { error: "R2 not configured, use Supabase Storage" },
      { status: 501 },
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const scope = (formData.get("scope") as string) || (formData.get("unitId") as string);
    const type = (formData.get("type") as string) || "thumb";

    if (!file || !scope) {
      return NextResponse.json({ error: "file and scope/unitId required" }, { status: 400 });
    }

    if (!ALLOWED_TYPES[type]?.includes(file.type)) {
      return NextResponse.json({ error: `Invalid file type: ${file.type}` }, { status: 400 });
    }

    if (file.size > (MAX_SIZE[type] ?? 10 * 1024 * 1024)) {
      return NextResponse.json(
        { error: `File too large. Max: ${type === "video" ? "100MB" : "10MB"}` },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const key = generateMediaKey(scope, type as any, file.name);
    const url = await uploadToR2(buffer, key, file.type);

    return NextResponse.json({ url, key, size: file.size });
  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
