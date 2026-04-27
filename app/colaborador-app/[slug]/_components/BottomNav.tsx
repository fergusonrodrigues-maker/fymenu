"use client";

import { useRouter, useParams } from "next/navigation";
import { Home, ListChecks, User, LogOut } from "lucide-react";
import { revokeSession } from "@/app/colaborador-app/actions";
import { useState } from "react";

type Tab = "home" | "tarefas" | "perfil";

export default function BottomNav({ active, pendingCount }: { active: Tab; pendingCount?: number }) {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const token = sessionStorage.getItem("fy_emp_token") ?? "";
      await revokeSession(token);
    } catch { /* */ }
    try {
      sessionStorage.removeItem("fy_emp_token");
      sessionStorage.removeItem("fy_emp_id");
      sessionStorage.removeItem("fy_emp_unit");
      sessionStorage.removeItem("fy_emp_roles");
      sessionStorage.removeItem("fy_emp_name");
    } catch { /* */ }
    router.replace("/colaborador");
  }

  function go(tab: Tab) {
    if (tab === "home")    router.push("/colaborador/home");
    if (tab === "tarefas") router.push("/colaborador/tarefas");
    if (tab === "perfil")  router.push("/colaborador/home");
  }

  const itemStyle = (isActive: boolean): React.CSSProperties => ({
    flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    gap: 4, padding: "10px 4px",
    background: "transparent", border: "none",
    color: isActive ? "#16a34a" : "#9ca3af",
    fontSize: 11, fontWeight: 600, fontFamily: "inherit",
    cursor: "pointer", position: "relative",
  });

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
      background: "#fff", borderTop: "1px solid #e5e7eb",
      display: "flex", paddingBottom: "env(safe-area-inset-bottom, 0)",
      boxShadow: "0 -2px 12px rgba(0,0,0,0.04)",
    }}>
      <button onClick={() => go("home")} style={itemStyle(active === "home")}>
        <Home size={22} strokeWidth={active === "home" ? 2.5 : 2} />
        <span>Início</span>
      </button>
      <button onClick={() => go("tarefas")} style={itemStyle(active === "tarefas")}>
        <div style={{ position: "relative" }}>
          <ListChecks size={22} strokeWidth={active === "tarefas" ? 2.5 : 2} />
          {pendingCount && pendingCount > 0 ? (
            <span style={{
              position: "absolute", top: -4, right: -8,
              minWidth: 16, height: 16, padding: "0 4px",
              borderRadius: 10, background: "#dc2626", color: "#fff",
              fontSize: 10, fontWeight: 800, lineHeight: "16px",
              textAlign: "center",
            }}>
              {pendingCount > 9 ? "9+" : pendingCount}
            </span>
          ) : null}
        </div>
        <span>Tarefas</span>
      </button>
      <button onClick={() => go("perfil")} style={itemStyle(active === "perfil")}>
        <User size={22} strokeWidth={active === "perfil" ? 2.5 : 2} />
        <span>Perfil</span>
      </button>
      <button onClick={handleLogout} disabled={loggingOut} style={itemStyle(false)}>
        <LogOut size={22} strokeWidth={2} color="#dc2626" />
        <span style={{ color: "#dc2626" }}>{loggingOut ? "Saindo…" : "Sair"}</span>
      </button>
    </nav>
  );
}
