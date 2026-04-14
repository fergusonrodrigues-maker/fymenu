"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Staff = {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: Record<string, boolean>;
};

const ROLE_LABELS: Record<string, string> = {
  moderator: "Moderador",
  admin: "Admin",
  viewer: "Viewer",
  support: "Suporte",
  manager: "Gerente",
  super_admin: "Super Admin",
};

const PERMISSION_LABELS: Record<string, string> = {
  view_orders: "Ver pedidos",
  view_products: "Ver produtos/cardápios",
  view_units: "Ver unidades",
  view_crm: "Ver CRM",
  view_financial: "Ver financeiro",
  edit_products: "Editar produtos",
  manage_features: "Gerenciar features",
};

export default function SuportePage() {
  const router = useRouter();
  const [staff, setStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("suporte_token");
    if (!token) { router.replace("/suporte/login"); return; }

    fetch("/api/suporte/me", { headers: { "x-suporte-token": token } })
      .then((r) => r.json())
      .then((json) => {
        if (json.staff) setStaff(json.staff);
        else router.replace("/suporte/login");
      })
      .catch(() => router.replace("/suporte/login"))
      .finally(() => setLoading(false));
  }, [router]);

  function handleLogout() {
    localStorage.removeItem("suporte_token");
    localStorage.removeItem("suporte_staff");
    router.replace("/suporte/login");
  }

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", background: "#0a0a0a",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "rgba(255,255,255,0.4)", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
      }}>
        Carregando...
      </div>
    );
  }

  if (!staff) return null;

  const activePermissions = Object.entries(staff.permissions ?? {})
    .filter(([, v]) => v)
    .map(([k]) => k);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0a",
      fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
      color: "#fff",
    }}>
      {/* Header */}
      <div style={{
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        padding: "16px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #7c3aed, #4c1d95)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16,
          }}>🛡️</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Portal de Suporte</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>FyMenu</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{staff.name}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
              {ROLE_LABELS[staff.role] ?? staff.role}
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: "8px 14px", borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "none", color: "rgba(255,255,255,0.5)",
              cursor: "pointer", fontSize: 13,
            }}
          >
            Sair
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Welcome card */}
        <div style={{
          background: "rgba(124,58,237,0.08)",
          border: "1px solid rgba(124,58,237,0.2)",
          borderRadius: 16, padding: "20px 24px",
        }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Olá, {staff.name.split(" ")[0]} 👋</div>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 4 }}>
            Você está logado como <strong style={{ color: "rgba(255,255,255,0.7)" }}>{ROLE_LABELS[staff.role] ?? staff.role}</strong> · {staff.email}
          </div>
        </div>

        {/* Permissions */}
        <div style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16, padding: "20px 24px",
        }}>
          <div style={{ fontWeight: 700, marginBottom: 16 }}>Suas permissões</div>
          {activePermissions.length === 0 ? (
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Nenhuma permissão ativa.</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {activePermissions.map((p) => (
                <span key={p} style={{
                  padding: "4px 12px", borderRadius: 20,
                  background: "rgba(124,58,237,0.15)",
                  border: "1px solid rgba(124,58,237,0.3)",
                  color: "#c4b5fd", fontSize: 12, fontWeight: 500,
                }}>
                  {PERMISSION_LABELS[p] ?? p}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Access restricted notice */}
        <div style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 16, padding: "20px 24px",
          color: "rgba(255,255,255,0.3)", fontSize: 13, textAlign: "center",
        }}>
          O painel de suporte está em desenvolvimento. As funcionalidades serão liberadas conforme suas permissões.
        </div>
      </div>
    </div>
  );
}
