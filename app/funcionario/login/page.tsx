"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FuncionarioLoginPage() {
  const router = useRouter();
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleCpfChange(e: React.ChangeEvent<HTMLInputElement>) {
    let v = e.target.value.replace(/\D/g, "").slice(0, 11);
    if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, "$1.$2.$3-$4");
    else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, "$1.$2.$3");
    else if (v.length > 3) v = v.replace(/(\d{3})(\d{1,3})/, "$1.$2");
    setCpf(v);
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

      const slug = emp.unit_slug;
      if (!slug) { router.push("/funcionario"); return; }

      const role = (emp.role ?? "").toLowerCase();
      if (role === "garcom" || role === "waiter") router.push(`/garcom/${slug}`);
      else if (role === "cozinha" || role === "kitchen") router.push(`/cozinha/${slug}`);
      else if (role === "pdv" || role === "caixa") router.push(`/pdv/${slug}`);
      else if (role === "entregador" || role === "delivery") router.push(`/entrega/${slug}`);
      else if (role === "gerente" || role === "hub" || role === "manager") router.push(`/hub/${slug}`);
      else router.push(`/funcionario/${slug}`);
    } catch { setError("Erro de conexão"); setLoading(false); }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: #050505; }
        .fy-inp:focus { border-color: #00ffae !important; outline: none; }
        .fy-btn:not(:disabled):active { transform: scale(0.97); }
        .fy-btn { transition: opacity 0.2s, transform 0.15s; }
      `}</style>
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #050505 0%, #0a0a0a 100%)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: 20,
        fontFamily: "'Montserrat', system-ui, sans-serif",
      }}>
        {/* Logo */}
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: "#fff", letterSpacing: -1 }}>
            Fy<span style={{ color: "#00ffae" }}>Menu</span>
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>Portal do Funcionário</div>
        </div>

        {/* Card */}
        <form onSubmit={handleLogin} style={{
          width: "100%", maxWidth: 380,
          padding: 24, borderRadius: 20,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}>
          {/* CPF */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>CPF</label>
            <input
              className="fy-inp"
              type="text"
              value={cpf}
              onChange={handleCpfChange}
              placeholder="000.000.000-00"
              autoFocus
              inputMode="numeric"
              style={{
                width: "100%", padding: "14px 16px", borderRadius: 14,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#fff", fontSize: 16, fontWeight: 600,
                outline: "none", boxSizing: "border-box", letterSpacing: 1,
                transition: "border-color 0.2s",
              }}
            />
          </div>

          {/* Senha */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>Senha</label>
            <input
              className="fy-inp"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Sua senha"
              style={{
                width: "100%", padding: "14px 16px", borderRadius: 14,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#fff", fontSize: 16,
                outline: "none", boxSizing: "border-box",
                transition: "border-color 0.2s",
              }}
            />
          </div>

          {/* Erro */}
          {error && (
            <div style={{
              padding: "10px 14px", borderRadius: 12, marginBottom: 14,
              background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.15)",
              color: "#f87171", fontSize: 13,
            }}>{error}</div>
          )}

          {/* Botão */}
          <button
            type="submit"
            className="fy-btn"
            disabled={loading || !cpf || !password}
            style={{
              width: "100%", padding: 16, borderRadius: 14, border: "none",
              background: "rgba(0,255,174,0.1)", color: "#00ffae",
              fontSize: 16, fontWeight: 800, cursor: loading || !cpf || !password ? "not-allowed" : "pointer",
              boxShadow: "0 1px 0 rgba(0,255,174,0.12) inset, 0 -1px 0 rgba(0,0,0,0.2) inset",
              opacity: loading || !cpf || !password ? 0.4 : 1,
            }}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        {/* Suporte */}
        <div style={{ marginTop: 24, textAlign: "center" }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
            Problemas pra entrar? Fale com o gerente do restaurante.
          </span>
        </div>
      </div>
    </>
  );
}
