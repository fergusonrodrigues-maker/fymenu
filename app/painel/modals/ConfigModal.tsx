"use client";

import { useState } from "react";
import { updateProfile } from "../actions";
import { Profile, Restaurant } from "../types";

const inp: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: 12,
  border: "1px solid var(--dash-input-border)",
  background: "var(--dash-input-bg)",
  color: "var(--dash-text)", fontSize: 16, boxSizing: "border-box",
  outline: "none",
};

export default function ConfigModal({ profile, restaurant }: { profile: Profile; restaurant: Restaurant }) {
  const [view, setView] = useState<"home" | "profile" | "password">("home");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);

  async function handlePasswordChange(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newPw = String(fd.get("password") ?? "");
    const confirm = String(fd.get("confirm") ?? "");
    if (newPw !== confirm) { setPwMsg("Senhas não conferem."); return; }
    if (newPw.length < 6) { setPwMsg("Mínimo 6 caracteres."); return; }
    setPwLoading(true);
    setPwMsg(null);
    try {
      const { createClient: cc } = await import("@/lib/supabase/client");
      const { error } = await cc().auth.updateUser({ password: newPw });
      if (error) { setPwMsg(error.message); } else { setPwMsg("Senha alterada com sucesso!"); setView("home"); }
    } finally { setPwLoading(false); }
  }

  if (view === "profile") return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
      <button onClick={() => setView("home")} style={{ background: "none", border: "none", color: "var(--dash-text-muted)", fontSize: 13, cursor: "pointer", textAlign: "left", padding: 0, marginBottom: 4 }}>← Voltar</button>
      <form action={updateProfile} onSubmit={() => setTimeout(() => setView("home"), 300)} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[
          { name: "first_name", label: "Nome", value: profile.first_name ?? "" },
          { name: "last_name", label: "Sobrenome", value: profile.last_name ?? "" },
          { name: "phone", label: "Telefone", value: profile.phone ?? "" },
          { name: "address", label: "Endereço (opcional)", value: profile.address ?? "" },
          { name: "city", label: "Cidade (opcional)", value: profile.city ?? "" },
        ].map((f) => (
          <div key={f.name}>
            <div style={{ color: "var(--dash-text-muted)", fontSize: 11, marginBottom: 4 }}>{f.label}</div>
            <input name={f.name} defaultValue={f.value} style={inp} />
          </div>
        ))}
        <button type="submit" style={{ marginTop: 4, padding: "13px", borderRadius: 12, border: "none", background: "rgba(0,255,174,0.15)", color: "#00ffae", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Salvar perfil</button>
      </form>
    </div>
  );

  if (view === "password") return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
      <button onClick={() => { setView("home"); setPwMsg(null); }} style={{ background: "none", border: "none", color: "var(--dash-text-muted)", fontSize: 13, cursor: "pointer", textAlign: "left", padding: 0, marginBottom: 4 }}>← Voltar</button>
      <form onSubmit={handlePasswordChange} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[
          { name: "password", label: "Nova senha", placeholder: "Mínimo 6 caracteres" },
          { name: "confirm", label: "Confirmar senha", placeholder: "Digite novamente" },
        ].map((f) => (
          <div key={f.name}>
            <div style={{ color: "var(--dash-text-muted)", fontSize: 11, marginBottom: 4 }}>{f.label}</div>
            <input type="password" name={f.name} placeholder={f.placeholder} required style={inp} />
          </div>
        ))}
        {pwMsg && <div style={{ fontSize: 13, color: pwMsg.includes("sucesso") ? "#00ffae" : "#f87171", padding: "8px 12px", borderRadius: 8, background: pwMsg.includes("sucesso") ? "rgba(0,255,174,0.08)" : "rgba(248,113,113,0.08)" }}>{pwMsg}</div>}
        <button type="submit" disabled={pwLoading} style={{ padding: "13px", borderRadius: 12, border: "none", background: "rgba(0,255,174,0.15)", color: "#00ffae", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: pwLoading ? 0.6 : 1 }}>
          {pwLoading ? "Alterando..." : "Alterar senha"}
        </button>
      </form>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
      <div className="modal-neon-card" style={{ borderRadius: 16, padding: "18px 20px", background: "var(--dash-card)" }}>
        <div style={{ color: "var(--dash-text-muted)", fontSize: 12, marginBottom: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>Conta</div>
        <div className="dash-gradient-text" style={{ fontSize: 16, fontWeight: 700 }}>{[profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Sem nome"}</div>
        <div style={{ color: "var(--dash-text-muted)", fontSize: 13, marginTop: 4 }}>{profile.email}</div>
        {profile.phone && <div style={{ color: "var(--dash-text-muted)", fontSize: 13, marginTop: 2 }}>{profile.phone}</div>}
        {(profile.address || profile.city) && <div style={{ color: "var(--dash-text-muted)", fontSize: 13, marginTop: 2 }}>{[profile.address, profile.city].filter(Boolean).join(", ")}</div>}
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--dash-card-border)", display: "flex", gap: 10 }}>
          <div style={{ flex: 1, borderRadius: 10, padding: "10px 12px", background: restaurant.plan === "pro" ? "rgba(0,255,174,0.06)" : "rgba(255,255,255,0.04)", border: `1px solid ${restaurant.plan === "pro" ? "rgba(0,255,174,0.2)" : "var(--dash-card-border)"}` }}>
            <div style={{ color: "var(--dash-text-muted)", fontSize: 11, marginBottom: 4 }}>📦 Plano atual</div>
            <div style={{ color: restaurant.plan === "pro" ? "#00ffae" : "var(--dash-text)", fontSize: 15, fontWeight: 800 }}>{restaurant.plan === "pro" ? "Pro ⭐" : restaurant.plan === "trial" ? "Trial" : "Basic"}</div>
          </div>
          <div style={{ flex: 1, borderRadius: 10, padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--dash-card-border)" }}>
            <div style={{ color: "var(--dash-text-muted)", fontSize: 11, marginBottom: 4 }}>📊 Status</div>
            <div style={{ color: "var(--dash-text)", fontSize: 15, fontWeight: 800, textTransform: "capitalize" }}>{restaurant.status === "trial" ? "Trial ativo" : restaurant.status === "active" ? "Ativo" : restaurant.status}</div>
          </div>
        </div>
      </div>
      <button onClick={() => setView("profile")} className="modal-neon-card" style={{ padding: "14px 20px", borderRadius: 14, background: "var(--dash-card)", color: "var(--dash-text)", fontSize: 14, fontWeight: 600, cursor: "pointer", textAlign: "left" }}>
        ✏️ Editar perfil
      </button>
      <button onClick={() => setView("password")} className="modal-neon-card" style={{ padding: "14px 20px", borderRadius: 14, background: "var(--dash-card)", color: "var(--dash-text)", fontSize: 14, fontWeight: 600, cursor: "pointer", textAlign: "left" }}>
        🔑 Alterar senha
      </button>
      <form action="/api/auth/signout" method="post">
        <button type="submit" style={{ width: "100%", padding: "14px 20px", borderRadius: 14, border: "none", background: "rgba(255,80,80,0.08)", color: "#f87171", fontSize: 14, fontWeight: 600, cursor: "pointer", textAlign: "left" }}>
          🚪 Sair da conta
        </button>
      </form>
    </div>
  );
}
