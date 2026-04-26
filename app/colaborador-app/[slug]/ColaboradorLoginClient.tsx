"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { authenticateEmployee } from "@/app/colaborador-app/actions";

interface Props {
  slug: string;
  unitName: string;
  logoUrl: string | null;
}

export default function ColaboradorLoginClient({ slug, unitName, logoUrl }: Props) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already logged in for this unit, go straight to home
  useEffect(() => {
    try {
      const token = sessionStorage.getItem("fy_emp_token");
      const unit = sessionStorage.getItem("fy_emp_unit");
      if (token && unit) router.replace("/colaborador/home");
    } catch { /* sessionStorage unavailable (e.g. SSR guard) */ }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await authenticateEmployee(slug, username, password);
      sessionStorage.setItem("fy_emp_token", result.token);
      sessionStorage.setItem("fy_emp_id", result.employeeId);
      sessionStorage.setItem("fy_emp_unit", result.unitId);
      sessionStorage.setItem("fy_emp_roles", JSON.stringify(result.roles));
      sessionStorage.setItem("fy_emp_name", result.name);
      router.push("/colaborador/home");
    } catch (err: any) {
      setError(err.message ?? "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "13px 14px", borderRadius: 10,
    border: "1.5px solid #e5e7eb", background: "#fff",
    color: "#111827", fontSize: 15, boxSizing: "border-box",
    outline: "none", fontFamily: "inherit",
    transition: "border-color 0.15s",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#fafafa",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      padding: "24px 16px",
    }}>
      <div style={{
        background: "#fff",
        borderRadius: 16,
        padding: "32px",
        maxWidth: 380,
        width: "100%",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 4px 20px rgba(0,0,0,0.05)",
      }}>

        {/* Unit branding */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={unitName}
              style={{ width: 64, height: 64, borderRadius: 14, objectFit: "cover", margin: "0 auto 12px" }}
            />
          ) : (
            <div style={{
              width: 64, height: 64, borderRadius: 14, background: "#f3f4f6",
              margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28,
            }}>🍽️</div>
          )}
          <div style={{ fontWeight: 700, fontSize: 16, color: "#111827" }}>{unitName}</div>
          <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>Portal do Colaborador</div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Username */}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Usuário
            </label>
            <input
              style={inputStyle}
              type="text"
              placeholder="seu.usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              disabled={loading}
            />
          </div>

          {/* Password */}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Senha
            </label>
            <div style={{ position: "relative" }}>
              <input
                style={{ ...inputStyle, paddingRight: 44 }}
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", padding: 4,
                  color: "#9ca3af", display: "flex", alignItems: "center",
                }}
                tabIndex={-1}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: "11px 14px", borderRadius: 10,
              background: "#fef2f2", border: "1px solid #fecaca",
              color: "#dc2626", fontSize: 13, lineHeight: 1.4,
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4, padding: "14px",
              borderRadius: 10, border: "none",
              background: loading ? "#dcfce7" : "#16a34a",
              color: loading ? "#16a34a" : "#fff",
              fontSize: 15, fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              width: "100%",
              transition: "background 0.15s",
            }}
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "#d1d5db" }}>
          Problemas? Fale com seu gerente.
        </p>
      </div>
    </div>
  );
}
