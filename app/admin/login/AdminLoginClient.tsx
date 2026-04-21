"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      const res = await fetch("/api/admin/verify", { method: "POST", headers: { "Content-Type": "application/json" } });
      if (!res.ok) {
        await supabase.auth.signOut();
        throw new Error("Acesso negado. Você não tem permissão de administrador.");
      }
      sessionStorage.setItem("fy_admin_session", "true");
      window.location.href = "/admin";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      <div style={{
        width: "100%",
        maxWidth: 380,
        background: "#111",
        borderRadius: 24,
        border: "1px solid rgba(255,255,255,0.08)",
        padding: "40px 32px",
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: "linear-gradient(135deg, #7c3aed, #4c1d95)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px", fontSize: 22,
          }}>
            🔒
          </div>
          <h1 style={{ color: "#fff", fontSize: 20, fontWeight: 800, margin: 0 }}>
            Admin FyMenu
          </h1>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, marginTop: 4 }}>
            Acesso restrito
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email do admin"
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
            <div style={{
              padding: "10px 14px", borderRadius: 10,
              background: "rgba(248,113,113,0.08)",
              border: "1px solid rgba(248,113,113,0.2)",
              color: "#f87171", fontSize: 13,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", cursor: loading ? "not-allowed" : "pointer", background: loading ? "rgba(124,58,237,0.3)" : "linear-gradient(135deg, #7c3aed, #4c1d95)", color: "#fff", fontSize: 15, fontWeight: 700, opacity: loading ? 0.6 : 1 }}
          >
            {loading ? "Verificando..." : "Entrar como Admin"}
          </button>
        </form>

        <p style={{
          color: "rgba(255,255,255,0.15)", fontSize: 11,
          textAlign: "center", marginTop: 24,
        }}>
          Este painel é exclusivo para administradores do FyMenu.
        </p>
      </div>
    </div>
  );
}
