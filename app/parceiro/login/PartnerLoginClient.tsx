"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PartnerLoginClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/parceiro/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao fazer login");
      sessionStorage.setItem("partner_token", json.token);
      sessionStorage.setItem("partner_id", json.partner.id);
      sessionStorage.setItem("partner_name", json.partner.name);
      router.push("/parceiro/painel");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 380, background: "#111", borderRadius: 24, border: "1px solid rgba(255,255,255,0.08)", padding: "40px 32px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg, #00ffae, #00d9ff)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 22 }}>🤝</div>
          <h1 style={{ color: "#fff", fontSize: 20, fontWeight: 800, margin: 0 }}>Painel do Parceiro</h1>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, marginTop: 4 }}>FyMenu — Área do parceiro</p>
        </div>
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha"
            required
            style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
          />
          {error && (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171", fontSize: 13 }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", cursor: loading ? "not-allowed" : "pointer", background: "var(--dash-accent-soft)", color: "var(--dash-accent)", fontSize: 15, fontWeight: 700, opacity: loading ? 0.6 : 1, boxShadow: "0 1px 0 rgba(0,255,174,0.08) inset, 0 -1px 0 rgba(0,0,0,0.15) inset", transition: "all 0.2s" }}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <p style={{ color: "rgba(255,255,255,0.15)", fontSize: 11, margin: "0 0 12px" }}>
            Acesso exclusivo para parceiros FyMenu.
          </p>
          <a
            href="https://wa.me/5562982301642?text=Olá! Sou parceiro FyMenu e preciso de suporte."
            target="_blank" rel="noopener noreferrer"
            style={{ color: "rgba(37,211,102,0.5)", fontSize: 12, textDecoration: "none" }}
          >
            💬 Suporte via WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
