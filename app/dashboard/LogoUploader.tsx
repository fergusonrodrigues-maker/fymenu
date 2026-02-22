"use client";

import { useRef, useState } from "react";
import { uploadLogoAction } from "./actions";

type Props = {
  unitId: string;
  currentLogoUrl?: string | null;
  onUpdated?: (newUrl: string) => void;
};

export default function LogoUploader({ unitId, currentLogoUrl, onUpdated }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [uploading, setUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>(currentLogoUrl ?? "");
  const [err, setErr] = useState<string>("");

  async function handleFile(file: File) {
    setErr("");
    setUploading(true);

    try {
      // validações simples
      if (!file.type.startsWith("image/")) throw new Error("Envie uma imagem (PNG/JPG/WebP).");
      if (file.size > 3 * 1024 * 1024) throw new Error("Imagem muito grande. Limite: 3MB.");

      const formData = new FormData();
      formData.append("unitId", unitId);
      formData.append("file", file);

      const res = await uploadLogoAction(formData);

      if (!res?.ok) {
        throw new Error(res?.message || "Falha ao enviar logo.");
      }

      const newUrl = res.publicUrl || "";
      setLogoUrl(newUrl);
      onUpdated?.(newUrl);
    } catch (e: any) {
      setErr(e?.message ?? "Falha ao enviar logo.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 14,
        padding: 14,
        background: "rgba(20,20,20,0.55)",
      }}
    >
      <div style={{ fontWeight: 900, marginBottom: 10 }}>Logo da unidade</div>

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 12,
            overflow: "hidden",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            display: "grid",
            placeItems: "center",
          }}
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ fontSize: 12, opacity: 0.7, textAlign: "center" }}>Sem logo</div>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.08)",
              color: "#fff",
              fontWeight: 900,
              cursor: uploading ? "not-allowed" : "pointer",
            }}
          >
            {uploading ? "Enviando..." : "Enviar logo"}
          </button>

          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>PNG/JPG/WebP • até 3MB</div>

          {!!err && (
            <div style={{ marginTop: 8, fontSize: 12, color: "salmon" }}>
              {err}
            </div>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          handleFile(f);
          e.currentTarget.value = "";
        }}
      />
    </div>
  );
}