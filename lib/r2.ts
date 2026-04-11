import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const BUCKET = process.env.R2_BUCKET_NAME || "fymenu-media";
const PUBLIC_URL = process.env.R2_PUBLIC_URL || `https://${BUCKET}.r2.dev`;

function getR2Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

export function isR2Configured(): boolean {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY
  );
}

export async function uploadToR2(
  file: Buffer,
  key: string,
  contentType: string,
): Promise<string> {
  const r2 = getR2Client();
  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: file,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return `${PUBLIC_URL}/${key}`;
}

export async function deleteFromR2(key: string): Promise<void> {
  try {
    const r2 = getR2Client();
    await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch (err) {
    console.error("R2 delete error:", err);
  }
}

export function getR2KeyFromUrl(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.pathname.startsWith("/") ? u.pathname.slice(1) : u.pathname;
  } catch {
    return null;
  }
}

export function generateMediaKey(
  scope: string,
  type: "video" | "thumb" | "cover" | "logo",
  filename: string,
): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "bin";
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  return `${scope}/${type}/${timestamp}-${random}.${ext}`;
}
