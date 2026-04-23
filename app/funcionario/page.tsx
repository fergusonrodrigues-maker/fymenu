"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

// ─── CNPJ formatter ──────────────────────────────────────────────────────────
function formatCnpj(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12)
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function formatCpf(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

const INP: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 14,
  background: "rgba(255,255,255,0.06)",
  border: "1.5px solid rgba(255,255,255,0.1)",
  color: "#fff",
  fontSize: 16,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
  fontFamily: "inherit",
};

const BTN_PRIMARY: React.CSSProperties = {
  width: "100%",
  padding: "15px",
  borderRadius: 14,
  border: "none",
  background: "rgba(0,255,174,0.15)",
  color: "#00ffae",
  fontSize: 16,
  fontWeight: 800,
  cursor: "pointer",
  transition: "opacity 0.15s, transform 0.1s",
  boxShadow: "0 1px 0 rgba(0,255,174,0.1) inset, 0 -1px 0 rgba(0,0,0,0.2) inset",
};

const ERROR_BOX: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  marginBottom: 14,
  background: "rgba(248,113,113,0.08)",
  border: "1px solid rgba(248,113,113,0.15)",
  color: "#f87171",
  fontSize: 13,
};

export default function FuncionarioUnifiedLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [accessCode, setAccessCode] = useState("");
  const [unitName, setUnitName] = useState("");
  const [unitLogo, setUnitLogo] = useState<string | null>(null);
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // If already authenticated, redirect straight to portal
  useEffect(() => {
    fetch("/api/funcionario/me")
      .then(r => {
        if (r.ok) router.replace("/funcionario/portal");
        else setCheckingSession(false);
      })
      .catch(() => setCheckingSession(false));
  }, [router]);

  if (checkingSession) {
    return (
      <div style={{ minHeight: "100vh", background: "#050505", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid rgba(0,255,174,0.2)", borderTop: "3px solid #00ffae", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (accessCode.replace(/\D/g, "").length < 10) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/funcionario/lookup-unit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessCode }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Empresa não encontrada"); setLoading(false); return; }
      setUnitName(json.unit.name);
      setUnitLogo(json.unit.logo_url ?? null);
      setStep(2);
    } catch { setError("Erro de conexão. Tente novamente."); }
    setLoading(false);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!cpf || !password) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/funcionario/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessCode, cpf, password }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "CPF ou senha incorretos"); setLoading(false); return; }
      const emp = json.employee;
      // localStorage for legacy compatibility with existing role-based portals
      localStorage.setItem("fy_employee_id", emp.id);
      localStorage.setItem("fy_employee_name", emp.name);
      localStorage.setItem("fy_employee_role", emp.role ?? "");
      localStorage.setItem("fy_employee_unit_id", emp.unit_id ?? "");
      router.push("/funcionario/portal");
    } catch { setError("Erro de conexão. Tente novamente."); }
    setLoading(false);
  }

  const codeDigits = accessCode.replace(/\D/g, "").length;
  const isCnpj = codeDigits === 14;
  const codeReady = codeDigits >= 10;

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #050505; }
        .fy-inp:focus { border-color: #00ffae !important; }
        .fy-btn:not(:disabled):hover { opacity: 0.85; }
        .fy-btn:not(:disabled):active { transform: scale(0.97); }
        .fy-slide { animation: slideIn 0.3s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes slideIn { from { opacity: 0; transform: translateX(32px); } to { opacity: 1; transform: translateX(0); } }
        .fy-back:hover { color: rgba(255,255,255,0.6) !important; }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "#050505",
        backgroundImage: "radial-gradient(circle, rgba(0,255,174,0.10) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "20px",
        fontFamily: "'Montserrat', system-ui, sans-serif",
      }}>
        {/* Logo */}
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: "#fff", letterSpacing: -1 }}>
            Fy<span style={{ color: "#00ffae" }}>Menu</span>
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 4, letterSpacing: 1 }}>
            PORTAL DO FUNCIONÁRIO
          </div>
        </div>

        {/* ── STEP 1: Company code ── */}
        {step === 1 && (
          <form key="step1" className="fy-slide" onSubmit={handleCodeSubmit} style={{
            width: "100%", maxWidth: 420,
            padding: "32px 28px 28px",
            borderRadius: 20,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
          }}>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 6 }}>
                Qual é sua empresa?
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>
                Digite o CNPJ ou o código de acesso<br />fornecido pelo seu gerente
              </div>
            </div>

            <input
              className="fy-inp"
              type="text"
              inputMode="numeric"
              value={isCnpj ? accessCode : accessCode}
              onChange={e => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 14);
                setAccessCode(digits.length === 14 ? formatCnpj(digits) : digits.slice(0, 10));
              }}
              placeholder="00.000.000/0001-00"
              autoFocus
              autoComplete="off"
              style={{
                ...INP,
                fontSize: 22,
                fontWeight: 700,
                textAlign: "center",
                letterSpacing: 3,
                marginBottom: 14,
              }}
            />

            {error && <div style={ERROR_BOX}>{error}</div>}

            <button
              type="submit"
              className="fy-btn"
              disabled={loading || !codeReady}
              style={{
                ...BTN_PRIMARY,
                opacity: !codeReady ? 0.35 : loading ? 0.6 : 1,
                cursor: !codeReady || loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Buscando..." : "Continuar →"}
            </button>
          </form>
        )}

        {/* ── STEP 2: CPF + Password ── */}
        {step === 2 && (
          <form key="step2" className="fy-slide" onSubmit={handleLogin} style={{
            width: "100%", maxWidth: 420,
            padding: "32px 28px 28px",
            borderRadius: 20,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
          }}>
            {/* Unit header */}
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              {unitLogo && (
                <div style={{ marginBottom: 10 }}>
                  <img
                    src={unitLogo}
                    alt={unitName}
                    style={{ width: 52, height: 52, borderRadius: 14, objectFit: "cover", border: "1px solid rgba(255,255,255,0.1)" }}
                  />
                </div>
              )}
              <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 4 }}>
                {unitName}
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
                Entre com seu CPF e senha
              </div>
            </div>

            {/* CPF */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6, letterSpacing: 0.5 }}>CPF</label>
              <input
                className="fy-inp"
                type="text"
                inputMode="numeric"
                value={cpf}
                onChange={e => setCpf(formatCpf(e.target.value))}
                placeholder="000.000.000-00"
                autoFocus
                style={{ ...INP, letterSpacing: 1 }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6, letterSpacing: 0.5 }}>Senha</label>
              <div style={{ position: "relative" }}>
                <input
                  className="fy-inp"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  style={{ ...INP, paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.35)", cursor: "pointer", fontSize: 16, padding: 4 }}
                  tabIndex={-1}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && <div style={ERROR_BOX}>{error}</div>}

            <button
              type="submit"
              className="fy-btn"
              disabled={loading || !cpf || !password}
              style={{
                ...BTN_PRIMARY,
                opacity: (!cpf || !password) ? 0.35 : loading ? 0.6 : 1,
                cursor: (!cpf || !password) || loading ? "not-allowed" : "pointer",
                marginBottom: 10,
              }}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>

            <button
              type="button"
              className="fy-back"
              onClick={() => { setStep(1); setError(""); setCpf(""); setPassword(""); }}
              style={{ width: "100%", padding: "10px", borderRadius: 10, border: "none", background: "transparent", color: "rgba(255,255,255,0.3)", fontSize: 13, cursor: "pointer", transition: "color 0.15s" }}
            >
              ← Trocar empresa
            </button>

            <div style={{ marginTop: 20, textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.2)", lineHeight: 1.5 }}>
              Esqueceu a senha?<br />Fale com o gerente do seu restaurante.
            </div>
          </form>
        )}
      </div>
    </>
  );
}
