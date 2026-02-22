// FILE: /app/dashboard/unit/UnitLogoUploader.tsx
// ACTION: CREATE NEW FILE
"use client";

import { useMemo, useState } from "react";
import { uploadLogoAction } from "../actions";

export default function UnitLogoUploader({
  unitId,
  initialUrl,
}: {
  unitId: string;
  initialUrl: string;
}) {
  const [preview, setPreview] = useState<string>(initialUrl || "");
  const [busy, setBusy] = useState(false);

  const hint = useMemo(() => {
    if (!preview) return "Nenhuma logo enviada ainda.";
    return "Logo atual (salva no banco).";
  }, [preview]);

  async function onPick(file: File | null) {
    if (!file) return;

    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("unitId", unitId);

      const res = await uploadLogoAction(fd);

      if (!res.ok) {
        alert(res.message || "Erro ao enviar logo.");
        return;
      }

      if (res.publicUrl) setPreview(res.publicUrl);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 14,
        padding: 14,
        background: "rgba(255,255,255,0.03)",
        display: "grid",
        gap: 10,
      }}
    >
      <div style={{ fontWeight: 800 }}>Logo da empresa</div>
      <div style={{ opacity: 0.7, fontSize: 13 }}>{hint}</div>

      {preview ? (
        <div
          style={{
            width: "100%",
            maxWidth: 280,
            borderRadius: 14,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(0,0,0,0.25)",
          }}
        >
          <img
            src={preview}
            alt="Logo"
            style={{ width: "100%", height: "auto", display: "block" }}
          />
        </div>
      ) : null}

      <label
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          width: "fit-content",
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.18)",
          background: "rgba(255,255,255,0.06)",
          cursor: busy ? "not-allowed" : "pointer",
          opacity: busy ? 0.7 : 1,
          userSelect: "none",
        }}
      >
        {busy ? "Enviando..." : "Enviar nova logo"}
        <input
          type="file"
          accept="image/*"
          disabled={busy}
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          style={{ display: "none" }}
        />
      </label>
    </div>
  );
}