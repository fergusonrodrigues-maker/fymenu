"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FuncionarioLoginPage() {
  const router = useRouter();
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function formatCpf(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/funcionario/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf, password }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Erro ao fazer login"); setLoading(false); return; }

      const emp = json.employee;
      localStorage.setItem("fy_employee_id", emp.id);
      localStorage.setItem("fy_employee_name", emp.name);
      localStorage.setItem("fy_employee_role", emp.role ?? "");
      localStorage.setItem("fy_employee_unit_id", emp.unit_id ?? "");

      // Redirect based on role
      const slug = emp.unit_slug;
      if (!slug) { router.push("/funcionario"); return; }

      const role = (emp.role ?? "").toLowerCase();
      if (role === "garcom" || role === "waiter") router.push(`/garcom/${slug}`);
      else if (role === "cozinha" || role === "kitchen") router.push(`/cozinha/${slug}`);
      else if (role === "pdv" || role === "caixa") router.push(`/pdv/${slug}`);
      else if (role === "entregador" || role === "delivery") router.push(`/entrega/${slug}`);
      else if (role === "gerente" || role === "hub") router.push(`/hub/${slug}`);
      else router.push(`/funcionario/${slug}`);
    } catch { setError("Erro de conexão"); setLoading(false); }
  }

  const inp: React.CSSProperties = {
    width: "100%", padding: "14px 16px", borderRadius: 14,
    background: "rgba(255,255,255,0.04)", border: "none",
    color: "#fff", fontSize: 16, outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#050505", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg, #00ffae, #00d9ff)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 22 }}>👤</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>Área do Funcionário</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>FyMenu — Acesso restrito</div>
        </div>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>CPF</label>
            <input
              type="text" inputMode="numeric" value={cpf}
              onChange={e => setCpf(formatCpf(e.target.value))}
              placeholder="000.000.000-00" autoFocus
              style={inp}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>Senha</label>
            <input
              type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Sua senha"
              style={inp}
            />
          </div>

          {error && (
            <div style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(248,113,113,0.08)", color: "#f87171", fontSize: 13 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !cpf || !password}
            style={{
              width: "100%", padding: 16, borderRadius: 14, border: "none",
              background: "var(--dash-accent-soft)", color: "var(--dash-accent)",
              fontSize: 16, fontWeight: 800, cursor: "pointer",
              opacity: loading || !cpf || !password ? 0.5 : 1, marginTop: 4,
              boxShadow: "0 1px 0 rgba(0,255,174,0.08) inset, 0 -1px 0 rgba(0,0,0,0.15) inset", transition: "all 0.2s",
            }}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p style={{ color: "rgba(255,255,255,0.15)", fontSize: 11, textAlign: "center", marginTop: 24 }}>
          Acesso exclusivo para funcionários cadastrados.
        </p>
      </div>
    </div>
  );
}
