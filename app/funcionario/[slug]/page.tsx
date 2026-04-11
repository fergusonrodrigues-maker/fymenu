"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

const supabase = createClient();

export default function FuncionarioHubPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [unit, setUnit] = useState<any>(null);
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const empId = localStorage.getItem("fy_employee_id");
    const empName = localStorage.getItem("fy_employee_name") ?? "";
    const empRole = localStorage.getItem("fy_employee_role") ?? "";

    if (!empId) { router.replace("/funcionario/login"); return; }
    setEmployee({ id: empId, name: empName, role: empRole });

    async function load() {
      const { data: unitData } = await supabase
        .from("units")
        .select("id, name, slug, restaurant_id, is_published")
        .eq("slug", slug)
        .single();

      if (unitData) setUnit(unitData);
      setLoading(false);
    }
    load();
  }, [slug, router]);

  function logout() {
    localStorage.removeItem("fy_employee_id");
    localStorage.removeItem("fy_employee_name");
    localStorage.removeItem("fy_employee_role");
    localStorage.removeItem("fy_employee_unit_id");
    router.replace("/funcionario/login");
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#050505", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.3)" }}>
      Carregando...
    </div>
  );

  if (!unit) return (
    <div style={{ minHeight: "100vh", background: "#050505", display: "flex", alignItems: "center", justifyContent: "center", color: "#f87171" }}>
      Unidade não encontrada
    </div>
  );

  const portals = [
    { href: `/garcom/${slug}`,   icon: "🍽️", label: "Garçom",      desc: "Pedidos e comandas" },
    { href: `/cozinha/${slug}`,  icon: "👨‍🍳", label: "Cozinha",     desc: "Fila de preparo" },
    { href: `/pdv/${slug}`,      icon: "💳", label: "PDV / Caixa", desc: "Pagamentos" },
    { href: `/hub/${slug}`,      icon: "📡", label: "Hub Central", desc: "Visão geral" },
    { href: `/entrega/${slug}`,  icon: "🛵", label: "Entrega",     desc: "Pedidos para entrega" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{unit.name}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>
            Olá, {employee?.name ?? "Funcionário"}{employee?.role ? ` · ${employee.role}` : ""}
          </div>
        </div>
        <button onClick={logout} style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(248,113,113,0.06)", border: "none", color: "#f87171", fontSize: 11, cursor: "pointer" }}>
          Sair
        </button>
      </div>

      {/* Portal grid */}
      <div style={{ padding: 20, maxWidth: 500, margin: "0 auto" }}>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.06em" }}>Portais</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {portals.map(p => (
            <Link key={p.href} href={p.href} style={{ textDecoration: "none" }}>
              <div style={{
                padding: "14px 18px", borderRadius: 14,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                display: "flex", alignItems: "center", gap: 14,
                transition: "background 0.15s",
              }}>
                <div style={{ fontSize: 24, width: 36, textAlign: "center" }}>{p.icon}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{p.label}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>{p.desc}</div>
                </div>
                <div style={{ marginLeft: "auto", color: "rgba(255,255,255,0.2)", fontSize: 16 }}>›</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick links */}
        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <Link href={`/funcionario/${slug}/ponto`} style={{ textDecoration: "none", flex: 1 }}>
            <div style={{ padding: "12px", borderRadius: 12, background: "rgba(0,255,174,0.06)", border: "1px solid rgba(0,255,174,0.12)", textAlign: "center" }}>
              <div style={{ fontSize: 18 }}>⏰</div>
              <div style={{ fontSize: 12, color: "#00ffae", fontWeight: 600, marginTop: 4 }}>Ponto</div>
            </div>
          </Link>
          <Link href={`/funcionario/${slug}/perfil`} style={{ textDecoration: "none", flex: 1 }}>
            <div style={{ padding: "12px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", textAlign: "center" }}>
              <div style={{ fontSize: 18 }}>👤</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 600, marginTop: 4 }}>Perfil</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
