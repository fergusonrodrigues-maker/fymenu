"use client";

import { useState } from "react";
import type { OnboardingData } from "./OnboardingClient";

export default function StepCompany({
  initial,
  onNext,
  onBack,
}: {
  initial: OnboardingData;
  onNext: (v: Partial<OnboardingData>) => void;
  onBack: () => void;
}) {
  const [form, setForm] = useState({
    restaurant_name: initial.restaurant_name || "",
    whatsapp: initial.whatsapp || "",
    instagram: initial.instagram || "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onNext(form);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 20 }}>
      <div>
        <h2 style={{ color: "#fff", fontSize: 26, fontWeight: 900, margin: 0 }}>
          Seu restaurante
        </h2>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, marginTop: 6 }}>
          Como seu estabelecimento aparece no cardápio.
        </p>
      </div>

      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <label style={labelStyle}>Nome do restaurante *</label>
          <input
            style={inputStyle}
            value={form.restaurant_name}
            onChange={(e) => set("restaurant_name", e.target.value)}
            placeholder="Ex: Burger do Zé"
            required
          />
        </div>

        <div>
          <label style={labelStyle}>WhatsApp</label>
          <input
            style={inputStyle}
            value={form.whatsapp}
            onChange={(e) => set("whatsapp", e.target.value)}
            placeholder="(11) 99999-9999"
            type="tel"
          />
        </div>

        <div>
          <label style={labelStyle}>Instagram</label>
          <input
            style={inputStyle}
            value={form.instagram}
            onChange={(e) => set("instagram", e.target.value)}
            placeholder="@seurestaurante"
          />
        </div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <button
          type="submit"
          style={{
            padding: "16px",
            borderRadius: 14,
            background: "#fff",
            color: "#000",
            fontWeight: 900,
            fontSize: 16,
            border: "none",
            cursor: "pointer",
            width: "100%",
          }}
        >
          Continuar →
        </button>

        <button
          type="button"
          onClick={onBack}
          style={{
            padding: "14px",
            borderRadius: 14,
            background: "transparent",
            color: "rgba(255,255,255,0.5)",
            fontWeight: 700,
            fontSize: 14,
            border: "1px solid rgba(255,255,255,0.12)",
            cursor: "pointer",
            width: "100%",
          }}
        >
          ← Voltar
        </button>
      </div>
    </form>
  );
}
