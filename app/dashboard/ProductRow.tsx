"use client";

import { useState, useRef, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateProduct, deleteProduct } from "./actions";

type Product = {
  id: string;
  name: string;
  description?: string | null;
  base_price?: number | null;
  price_type?: string | null;
  thumbnail_url?: string | null;
  video_url?: string | null;
};

const BUCKET = "products";

export default function ProductRow({ product }: { product: Product }) {
  const [expanded, setExpanded] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState(product.thumbnail_url ?? "");
  const [videoUrl, setVideoUrl] = useState(product.video_url ?? "");
  const [uploading, setUploading] = useState<"thumb" | "video" | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const thumbRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const supabase = createClient();

  async function handleFileUpload(
    file: File,
    type: "thumb" | "video"
  ): Promise<string | null> {
    setUploading(type);
    setUploadError(null);

    const ext = file.name.split(".").pop();
    const path = `products/${product.id}/${type}-${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: true });

    if (error) {
      setUploadError(`Erro ao enviar: ${error.message}`);
      setUploading(null);
      return null;
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    setUploading(null);
    return data.publicUrl;
  }

  return (
    <div style={{
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12,
      marginBottom: 8,
      overflow: "hidden",
      background: "rgba(255,255,255,0.03)",
    }}>
      {/* Header row */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          cursor: "pointer",
        }}
      >
        {/* Thumbnail preview */}
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 8,
          background: "rgba(255,255,255,0.06)",
          flexShrink: 0,
          overflow: "hidden",
        }}>
          {thumbnailUrl && (
            <img
              src={thumbnailUrl}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {product.name}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
            {product.price_type === "variable"
              ? "Preço variável"
              : product.base_price
              ? `R$ ${Number(product.base_price).toFixed(2)}`
              : "Sem preço"}
          </div>
        </div>

        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 18 }}>
          {expanded ? "▲" : "▼"}
        </span>
      </div>

      {/* Expanded form */}
      {expanded && (
        <form
          action={async (formData) => {
            formData.set("thumbnail_url", thumbnailUrl);
            formData.set("video_url", videoUrl);
            startTransition(() => updateProduct(formData));
            setExpanded(false);
          }}
          style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}
        >
          <input type="hidden" name="id" value={product.id} />

          {/* Nome */}
          <input
            name="name"
            defaultValue={product.name}
            placeholder="Nome do produto"
            style={inputStyle}
          />

          {/* Descrição */}
          <textarea
            name="description"
            defaultValue={product.description ?? ""}
            placeholder="Descrição (opcional)"
            rows={2}
            style={{ ...inputStyle, resize: "vertical" }}
          />

          {/* Preço */}
          <div style={{ display: "flex", gap: 8 }}>
            <select name="price_type" defaultValue={product.price_type ?? "fixed"} style={{ ...inputStyle, flex: 1 }}>
              <option value="fixed">Preço fixo</option>
              <option value="variable">Preço variável</option>
            </select>
            <input
              name="base_price"
              type="number"
              step="0.01"
              defaultValue={product.base_price ?? ""}
              placeholder="Preço (R$)"
              style={{ ...inputStyle, flex: 1 }}
            />
          </div>

          {/* Thumbnail */}
          <div>
            <label style={labelStyle}>Foto do produto</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {thumbnailUrl ? (
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <img
                    src={thumbnailUrl}
                    alt="thumb"
                    style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8 }}
                  />
                  <button
                    type="button"
                    onClick={() => setThumbnailUrl("")}
                    style={removeBtnStyle}
                  >×</button>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => thumbRef.current?.click()}
                disabled={uploading === "thumb"}
                style={uploadBtnStyle}
              >
                {uploading === "thumb" ? "Enviando…" : thumbnailUrl ? "Trocar foto" : "📷 Escolher foto"}
              </button>

              <input
                ref={thumbRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const url = await handleFileUpload(file, "thumb");
                  if (url) setThumbnailUrl(url);
                }}
              />
            </div>
          </div>

          {/* Vídeo */}
          <div>
            <label style={labelStyle}>Vídeo do produto (opcional)</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {videoUrl ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    🎬 {videoUrl.split("/").pop()}
                  </span>
                  <button type="button" onClick={() => setVideoUrl("")} style={removeBtnStyle}>×</button>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => videoRef.current?.click()}
                disabled={uploading === "video"}
                style={uploadBtnStyle}
              >
                {uploading === "video" ? "Enviando…" : videoUrl ? "Trocar vídeo" : "🎬 Escolher vídeo"}
              </button>

              <input
                ref={videoRef}
                type="file"
                accept="video/*"
                style={{ display: "none" }}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const url = await handleFileUpload(file, "video");
                  if (url) setVideoUrl(url);
                }}
              />
            </div>
          </div>

          {uploadError && (
            <p style={{ color: "#f87171", fontSize: 12, margin: 0 }}>{uploadError}</p>
          )}

          {/* Ações */}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button
              type="submit"
              disabled={isPending || uploading !== null}
              style={{
                flex: 1,
                padding: "10px 0",
                background: "#10b981",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 14,
                cursor: isPending ? "not-allowed" : "pointer",
                opacity: isPending ? 0.6 : 1,
              }}
            >
              {isPending ? "Salvando…" : "Salvar"}
            </button>

            <form action={deleteProduct}>
              <input type="hidden" name="id" value={product.id} />
              <button
                type="submit"
                style={{
                  padding: "10px 16px",
                  background: "rgba(239,68,68,0.15)",
                  color: "#f87171",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Excluir
              </button>
            </form>
          </div>
        </form>
      )}
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 10,
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.05)",
  color: "#fff",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "rgba(255,255,255,0.5)",
  marginBottom: 6,
  fontWeight: 500,
};

const uploadBtnStyle: React.CSSProperties = {
  padding: "8px 14px",
  background: "rgba(255,255,255,0.08)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8,
  fontSize: 13,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const removeBtnStyle: React.CSSProperties = {
  position: "absolute" as const,
  top: -6,
  right: -6,
  width: 18,
  height: 18,
  borderRadius: "50%",
  background: "#ef4444",
  color: "#fff",
  border: "none",
  fontSize: 12,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  lineHeight: 1,
};