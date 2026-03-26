"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function EmployeeLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subdomain = searchParams.get("subdomain") ?? "";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    const session = localStorage.getItem("employee_session");
    if (session) {
      router.replace("/employee-dashboard");
    }
  }, [router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/employees/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, subdomain: subdomain || undefined }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Erro ao fazer login");
        return;
      }

      localStorage.setItem("employee_session", JSON.stringify(json.employee));
      router.replace("/employee-dashboard");
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const inp: React.CSSProperties = {
    width: "100%", padding: "14px 16px", borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff", fontSize: 16, boxSizing: "border-box",
    outline: "none", fontFamily: "inherit",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #080808 0%, #111 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
      padding: "24px 16px",
    }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
          <div style={{ color: "#fff", fontSize: 24, fontWeight: 900, letterSpacing: "-0.5px" }}>Portal do Funcionário</div>
          {subdomain && (
            <div style={{ marginTop: 8, color: "#888", fontSize: 13 }}>
              Acessando: <span style={{ color: "#00ffae" }}>{subdomain}</span>
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ color: "#888", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>USUÁRIO</label>
            <input
              style={inp}
              type="text"
              placeholder="seu.usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div>
            <label style={{ color: "#888", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>SENHA</label>
            <input
              style={inp}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div style={{ padding: "11px 14px", borderRadius: 10, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171", fontSize: 13 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 8, padding: "15px", borderRadius: 14, border: "none",
              background: loading ? "rgba(0,255,174,0.1)" : "linear-gradient(135deg, #00d9b8, #00ffae)",
              color: loading ? "#00ffae" : "#000",
              fontSize: 16, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer",
              transition: "opacity 0.15s",
            }}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 24, color: "#555", fontSize: 12 }}>
          Problemas? Fale com seu gerente.
        </div>
      </div>
    </div>
  );
}

export default function EmployeeLoginPage() {
  return (
    <Suspense>
      <EmployeeLoginContent />
    </Suspense>
  );
}
