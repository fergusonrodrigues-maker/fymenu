"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import FyLoader from "@/components/FyLoader";

const supabase = createClient();

function roleLabel(role: string) {
  const r = role.toLowerCase();
  if (r === "garcom" || r === "waiter") return "Garçom";
  if (r === "cozinha" || r === "kitchen") return "Cozinha";
  if (r === "gerente" || r === "manager" || r === "hub") return "Gerente";
  if (r === "pdv" || r === "caixa") return "PDV / Caixa";
  if (r === "entregador" || r === "delivery") return "Entregador";
  return role;
}

function isWaiter(role: string) {
  const r = role.toLowerCase();
  return r === "garcom" || r === "waiter";
}
function isKitchen(role: string) {
  const r = role.toLowerCase();
  return r === "cozinha" || r === "kitchen";
}
function isPDV(role: string) {
  const r = role.toLowerCase();
  return r === "pdv" || r === "caixa";
}
function isDelivery(role: string) {
  const r = role.toLowerCase();
  return r === "entregador" || r === "delivery";
}
function isManager(role: string) {
  const r = role.toLowerCase();
  return r === "gerente" || r === "manager" || r === "hub";
}

export default function FuncionarioHubPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [unit, setUnit] = useState<any>(null);
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const empId = localStorage.getItem("fy_employee_id");
    if (!empId) { router.replace("/funcionario/login"); return; }

    async function load() {
      // Fetch full employee from supabase (includes current_status)
      const { data: empData } = await supabase
        .from("employees")
        .select("id, name, role, current_status, unit_id")
        .eq("id", empId!)
        .single();

      if (empData) {
        setEmployee(empData);
      } else {
        // Fallback to localStorage
        setEmployee({
          id: empId,
          name: localStorage.getItem("fy_employee_name") ?? "",
          role: localStorage.getItem("fy_employee_role") ?? "",
          current_status: "off",
        });
      }

      const { data: unitData } = await supabase
        .from("units")
        .select("id, name, slug, is_published")
        .eq("slug", slug)
        .single();

      if (unitData) setUnit(unitData);
      setLoading(false);
    }
    load();
  }, [slug, router]);

  function handleLogout() {
    localStorage.removeItem("fy_employee_id");
    localStorage.removeItem("fy_employee_name");
    localStorage.removeItem("fy_employee_role");
    localStorage.removeItem("fy_employee_unit_id");
    router.replace("/funcionario/login");
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#050505", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <FyLoader size="md" />
    </div>
  );

  if (!unit) return (
    <div style={{ minHeight: "100vh", background: "#050505", display: "flex", alignItems: "center", justifyContent: "center", color: "#f87171", fontFamily: "'Montserrat', system-ui, sans-serif" }}>
      Unidade não encontrada
    </div>
  );

  const role = employee?.role ?? "";
  const firstName = (employee?.name ?? "Funcionário").split(" ")[0];
  const status = employee?.current_status ?? "off";

  const statusConfig: Record<string, { label: string; color: string }> = {
    working: { label: "● Trabalhando", color: "#00ffae" },
    break:   { label: "☕ Descanso",   color: "#fbbf24" },
    lunch:   { label: "🍽️ Almoço",    color: "#60a5fa" },
    off:     { label: "○ Fora",        color: "rgba(255,255,255,0.3)" },
  };
  const sc = statusConfig[status] || statusConfig.off;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: #050505; }
        .fy-card { transition: opacity 0.15s; }
        .fy-card:active { opacity: 0.75; }
      `}</style>
      <div style={{
        minHeight: "100vh",
        background: "#050505",
        color: "#fff",
        padding: "20px 16px",
        fontFamily: "'Montserrat', system-ui, sans-serif",
      }}>
        <div style={{ maxWidth: 500, margin: "0 auto" }}>

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900 }}>Olá, {firstName}!</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
                {roleLabel(role)} · {unit.name}
              </div>
            </div>
            <button onClick={handleLogout} style={{
              padding: "6px 14px", borderRadius: 8, border: "none",
              background: "rgba(248,113,113,0.06)",
              color: "#f87171", fontSize: 11, cursor: "pointer",
              fontFamily: "inherit",
            }}>Sair</button>
          </div>

          {/* Clock + status */}
          <div style={{
            padding: 20, borderRadius: 18,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            textAlign: "center", marginBottom: 20,
            boxShadow: "0 1px 0 rgba(255,255,255,0.02) inset, 0 -1px 0 rgba(0,0,0,0.15) inset",
          }}>
            <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: -1 }}>
              {currentTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>
              {currentTime.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            </div>
            <div style={{
              marginTop: 10, display: "inline-flex", padding: "4px 12px", borderRadius: 8,
              background: `${sc.color}18`,
              color: sc.color,
              fontSize: 10, fontWeight: 700,
            }}>
              {sc.label}
            </div>
          </div>

          {/* Ações por role */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>

            {/* Garçom */}
            {(isWaiter(role) || isManager(role)) && (
              <a href={`/garcom/${unit.slug}`} className="fy-card" style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 8, padding: "24px 12px", borderRadius: 16,
                background: "rgba(0,255,174,0.04)", border: "1px solid rgba(0,255,174,0.08)",
                textDecoration: "none",
                boxShadow: "0 1px 0 rgba(255,255,255,0.02) inset, 0 -1px 0 rgba(0,0,0,0.15) inset",
              }}>
                <span style={{ fontSize: 28 }}>🧑‍🍳</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#00ffae" }}>Mesas</span>
              </a>
            )}

            {/* Cozinha */}
            {(isKitchen(role) || isManager(role)) && (
              <a href={`/cozinha/${unit.slug}`} className="fy-card" style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 8, padding: "24px 12px", borderRadius: 16,
                background: "rgba(251,191,36,0.04)", border: "1px solid rgba(251,191,36,0.08)",
                textDecoration: "none",
                boxShadow: "0 1px 0 rgba(255,255,255,0.02) inset, 0 -1px 0 rgba(0,0,0,0.15) inset",
              }}>
                <span style={{ fontSize: 28 }}>👨‍🍳</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#fbbf24" }}>Cozinha</span>
              </a>
            )}

            {/* PDV */}
            {(isPDV(role) || isManager(role)) && (
              <a href={`/pdv/${unit.slug}`} className="fy-card" style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 8, padding: "24px 12px", borderRadius: 16,
                background: "rgba(168,85,247,0.04)", border: "1px solid rgba(168,85,247,0.08)",
                textDecoration: "none",
                boxShadow: "0 1px 0 rgba(255,255,255,0.02) inset, 0 -1px 0 rgba(0,0,0,0.15) inset",
              }}>
                <span style={{ fontSize: 28 }}>💳</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa" }}>PDV / Caixa</span>
              </a>
            )}

            {/* Entrega */}
            {(isDelivery(role) || isManager(role)) && (
              <a href={`/entrega/${unit.slug}`} className="fy-card" style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 8, padding: "24px 12px", borderRadius: 16,
                background: "rgba(251,146,60,0.04)", border: "1px solid rgba(251,146,60,0.08)",
                textDecoration: "none",
                boxShadow: "0 1px 0 rgba(255,255,255,0.02) inset, 0 -1px 0 rgba(0,0,0,0.15) inset",
              }}>
                <span style={{ fontSize: 28 }}>🛵</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#fb923c" }}>Entrega</span>
              </a>
            )}

            {/* Ponto — sempre visível */}
            <a href={`/funcionario/${unit.slug}/ponto`} className="fy-card" style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 8, padding: "24px 12px", borderRadius: 16,
              background: "rgba(96,165,250,0.04)", border: "1px solid rgba(96,165,250,0.08)",
              textDecoration: "none",
              boxShadow: "0 1px 0 rgba(255,255,255,0.02) inset, 0 -1px 0 rgba(0,0,0,0.15) inset",
            }}>
              <span style={{ fontSize: 28 }}>⏰</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#60a5fa" }}>Ponto</span>
            </a>

            {/* Perfil — sempre visível */}
            <a href={`/funcionario/${unit.slug}/perfil`} className="fy-card" style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 8, padding: "24px 12px", borderRadius: 16,
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
              textDecoration: "none",
              boxShadow: "0 1px 0 rgba(255,255,255,0.02) inset, 0 -1px 0 rgba(0,0,0,0.15) inset",
            }}>
              <span style={{ fontSize: 28 }}>👤</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>Perfil</span>
            </a>

            {/* Hub Central — só gerente, ocupa linha inteira */}
            {isManager(role) && (
              <a href={`/hub/${unit.slug}`} className="fy-card" style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 8, padding: "24px 12px", borderRadius: 16,
                background: "rgba(168,85,247,0.04)", border: "1px solid rgba(168,85,247,0.08)",
                textDecoration: "none", gridColumn: "1 / -1",
                boxShadow: "0 1px 0 rgba(255,255,255,0.02) inset, 0 -1px 0 rgba(0,0,0,0.15) inset",
              }}>
                <span style={{ fontSize: 28 }}>🏠</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa" }}>Hub Central</span>
              </a>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
