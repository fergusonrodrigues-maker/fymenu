"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginClient() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleLogin() {
    setError(null);
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: window.location.origin + "/admin",
      },
    });
    if (authError) {
      setError(authError.message);
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

        {error && (
          <div style={{
            padding: "10px 14px", borderRadius: 10, marginBottom: 14,
            background: "rgba(248,113,113,0.08)",
            border: "1px solid rgba(248,113,113,0.2)",
            color: "#f87171", fontSize: 13,
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%", padding: "14px", borderRadius: 12,
            border: "none", cursor: loading ? "not-allowed" : "pointer",
            background: loading
              ? "rgba(124,58,237,0.3)"
              : "linear-gradient(135deg, #7c3aed, #4c1d95)",
            color: "#fff", fontSize: 15, fontWeight: 700,
            opacity: loading ? 0.6 : 1,
            transition: "all 0.2s ease",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          {loading ? "Redirecionando..." : "Entrar com GitHub"}
        </button>

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
