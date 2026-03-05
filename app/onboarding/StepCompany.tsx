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
    restaurant_name: initial.restaurant_name,
    whatsapp: initial.whatsapp,
    instagram: initial.instagram,
  });

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div>
        <h2 style={{ color: "#fff", fontSize: 26, fontWeight: 900, margin: 0 }}>
          Seu restaurante
        </h2>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, marginTop: 6 }}>
          Dados do seu estabelecimento
        </p>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        <input placeholder="Nome do restaurante" value={form.restaurant_name}
          onChange={(e) => set("restaurant_name", e.target.value)} style={inp} />
        <input placeholder="WhatsApp (ex: 62999999999)" value={form.whatsapp}
          onChange={(e) => set("whatsapp", e.target.value)} style={inp} />
        <div style={{ position: "relative" }}>
          <span style={{
            position: "absolute", left: 16, top: "50%",
            transform: "translateY(-50%)",
            color: "rgba(255,255,255,0.4)", fontSize: 15,
          }}>@</span>
          <input placeholder="instagram" value={form.instagram}
            onChange={(e) => set("instagram", e.target.value)}
            style={{ ...inp, paddingLeft: 32 }} />
        </div>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <button
          onClick={() => onNext(form)}
          disabled={!form.restaurant_name}
          style={btn}
        >
          Continuar →
        </button>
        <button onClick={onBack} style={btnBack}>
          ← Voltar
        </button>
      </div>
    </div>
  );
}

const inp: React.CSSProperties = {
  padding: "14px 16px", borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "#fff", fontSize: 15, outline: "none", width: "100%",
};
const btn: React.CSSProperties = {
  padding: "16px", borderRadius: 14, width: "100%",
  background: "#fff", color: "#000",
  fontWeight: 900, fontSize: 16, cursor: "pointer", border: "none",
};
const btnBack: React.CSSProperties = {
  padding: "12px", borderRadius: 14, width: "100%",
  background: "transparent", color: "rgba(255,255,255,0.5)",
  fontWeight: 700, fontSize: 14, cursor: "pointer",
  border: "1px solid rgba(255,255,255,0.10)",
};
