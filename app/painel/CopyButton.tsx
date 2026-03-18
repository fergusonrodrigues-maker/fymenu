"use client";

import React from "react";

export default function CopyButton({ text }: { text: string }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      alert("Link copiado ✅");
    } catch {
      // fallback bem simples
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      alert("Link copiado ✅");
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      style={{
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.16)",
        background: "rgba(255,255,255,0.10)",
        color: "#fff",
        cursor: "pointer",
        fontWeight: 900,
      }}
    >
      Copiar link
    </button>
  );
}