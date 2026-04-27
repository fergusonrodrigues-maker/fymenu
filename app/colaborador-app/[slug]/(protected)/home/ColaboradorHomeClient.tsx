"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ListChecks, ChevronRight } from "lucide-react";
import { getRoleLabel } from "@/app/colaborador-app/roleUtils";
import { listMyTasks } from "@/app/colaborador-app/tarefasActions";
import BottomNav from "../_components/BottomNav";

interface Props {
  slug: string;
}

export default function ColaboradorHomeClient({ slug }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  useEffect(() => {
    try {
      setName(sessionStorage.getItem("fy_emp_name") ?? "");
      const raw = sessionStorage.getItem("fy_emp_roles");
      setRoles(raw ? JSON.parse(raw) : []);
    } catch { /* */ }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const token = sessionStorage.getItem("fy_emp_token") ?? "";
        if (!token) return;
        const result = await listMyTasks(token);
        if (!cancelled) setPendingCount(result.hoje.length + result.atrasadas.length);
      } catch { /* silent */ }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const roleLabels = roles.map(getRoleLabel).join(", ") || "—";

  return (
    <div style={{
      minHeight: "100vh",
      background: "#fafafa",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      paddingBottom: 80,
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
      </header>

      {/* Content */}
      <main style={{ maxWidth: 520, margin: "0 auto", padding: "20px 16px" }}>
        {/* Minhas Tarefas card — destacado */}
        <button
          onClick={() => router.push(`/colaborador-app/${slug}/tarefas`)}
          style={{
            width: "100%", textAlign: "left",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: 16,
            padding: "16px 18px",
            marginBottom: 18,
            cursor: "pointer",
            fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: 14,
            boxShadow: "0 1px 3px rgba(22,163,74,0.08)",
          }}
        >
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: "#16a34a", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <ListChecks size={26} strokeWidth={2.2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>
              Minhas tarefas
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", lineHeight: 1.3 }}>
              {pendingCount === null
                ? "Carregando…"
                : pendingCount === 0
                  ? "Tudo em dia! 🎉"
                  : `Você tem ${pendingCount} tarefa${pendingCount !== 1 ? "s" : ""} pendente${pendingCount !== 1 ? "s" : ""} hoje`}
            </div>
          </div>
          <ChevronRight size={20} color="#16a34a" style={{ flexShrink: 0 }} />
        </button>

        {/* Welcome card */}
        <div style={{
          background: "#fff",
          borderRadius: 16,
          padding: "24px 22px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
          marginBottom: 18,
        }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>👋</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: "0 0 6px" }}>
            Bem-vindo{name ? `, ${name}` : ""}!
          </h1>
          <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>
            Você está logado no portal do colaborador.
          </p>
        </div>

        {/* Roles card */}
        <div style={{
          background: "#fff",
          borderRadius: 16,
          padding: "20px 22px",
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
      </main>

      <BottomNav active="home" pendingCount={pendingCount ?? 0} />
    </div>
  );
}
