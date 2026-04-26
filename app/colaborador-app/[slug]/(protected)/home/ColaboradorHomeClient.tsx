"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { revokeSession } from "@/app/colaborador-app/actions";
import { getRoleLabel } from "@/app/colaborador-app/roleUtils";

interface Props {
  slug: string;
}

export default function ColaboradorHomeClient({ slug }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    try {
      setName(sessionStorage.getItem("fy_emp_name") ?? "");
      const raw = sessionStorage.getItem("fy_emp_roles");
      setRoles(raw ? JSON.parse(raw) : []);
    } catch { /* */ }
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      const token = sessionStorage.getItem("fy_emp_token") ?? "";
      await revokeSession(token);
    } catch { /* best-effort */ }
    try {
      sessionStorage.removeItem("fy_emp_token");
      sessionStorage.removeItem("fy_emp_id");
      sessionStorage.removeItem("fy_emp_unit");
      sessionStorage.removeItem("fy_emp_roles");
      sessionStorage.removeItem("fy_emp_name");
    } catch { /* */ }
    router.replace("/colaborador");
  }

  const roleLabels = roles.map(getRoleLabel).join(", ") || "—";

  return (
    <div style={{
      minHeight: "100vh",
      background: "#fafafa",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      {/* Header */}
      <header style={{
        background: "#fff",
        borderBottom: "1px solid #e5e7eb",
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>
          Portal do Colaborador
        </span>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 14px", borderRadius: 8,
            border: "1.5px solid #e5e7eb", background: "#fff",
            color: "#dc2626", fontSize: 13, fontWeight: 600,
            cursor: loggingOut ? "not-allowed" : "pointer",
          }}
        >
          <LogOut size={15} />
          {loggingOut ? "Saindo…" : "Sair"}
        </button>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 520, margin: "0 auto", padding: "32px 16px" }}>
        <div style={{
          background: "#fff",
          borderRadius: 16,
          padding: "28px 24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>👋</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: "0 0 6px" }}>
            Bem-vindo{name ? `, ${name}` : ""}!
          </h1>
          <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>
            Você está logado no portal do colaborador.
          </p>
        </div>

        <div style={{
          background: "#fff",
          borderRadius: 16,
          padding: "20px 24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
            Suas funções
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {roles.length > 0 ? roles.map((role) => (
              <span
                key={role}
                style={{
                  background: "#f0fdf4", color: "#16a34a",
                  border: "1px solid #bbf7d0",
                  borderRadius: 20, padding: "5px 12px",
                  fontSize: 13, fontWeight: 600,
                }}
              >
                {getRoleLabel(role)}
              </span>
            )) : (
              <span style={{ fontSize: 13, color: "#9ca3af" }}>Nenhuma função atribuída</span>
            )}
          </div>
        </div>

        {/* Placeholder for future modules */}
        <div style={{ marginTop: 20, padding: "16px 20px", borderRadius: 12, background: "#fefce8", border: "1px solid #fef08a" }}>
          <p style={{ margin: 0, fontSize: 13, color: "#854d0e" }}>
            Mais funcionalidades chegando em breve — pedidos, comandas e muito mais.
          </p>
        </div>
      </main>
    </div>
  );
}
