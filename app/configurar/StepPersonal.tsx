"use client";

import { useState } from "react";
import type { OnboardingData } from "./OnboardingClient";

export default function StepPersonal({
  initial,
  onNext,
}: {
  initial: OnboardingData;
  onNext: (v: Partial<OnboardingData>) => void;
}) {
  const [form, setForm] = useState({
    first_name: initial.first_name,
    last_name: initial.last_name,
    phone: initial.phone,
    email: initial.email,
    document: initial.document,
  });

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div>
        <h2 style={{ color: "#fff", fontSize: 26, fontWeight: 900, margin: 0 }}>
          Seus dados
        </h2>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, marginTop: 6 }}>
          Informações pessoais do responsável
        </p>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <input placeholder="Nome" value={form.first_name}
            onChange={(e) => set("first_name", e.target.value)} style={inp} />
          <input placeholder="Sobrenome" value={form.last_name}
            onChange={(e) => set("last_name", e.target.value)} style={inp} />
        </div>
        <input placeholder="Email" type="email" value={form.email}
          onChange={(e) => set("email", e.target.value)} style={inp} />
        <input placeholder="Telefone" value={form.phone}
          onChange={(e) => set("phone", e.target.value)} style={inp} />
        <input placeholder="CPF ou CNPJ" value={form.document}
          onChange={(e) => set("document", e.target.value)} style={inp} />
      </div>

      <button
        onClick={() => onNext(form)}
        disabled={!form.first_name || !form.last_name || !form.email}
        style={btn}
      >
        Continuar →
      </button>
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
