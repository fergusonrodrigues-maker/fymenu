"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Clock } from "lucide-react";
import { listActivitiesForEntity, ActivityRecord } from "@/app/painel/historicoActions";

// ─── Shared helpers (scoped to this file) ────────────────────────────────────
function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "agora mesmo";
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "ontem";
  if (d < 30) return `há ${d} dias`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

const MODULE_LABELS: Record<string, string> = {
  menu: "Cardápio", financial: "Financeiro", team: "Equipe",
  members: "Sócios", orders: "Pedidos", inventory: "Estoque",
  crm: "CRM", settings: "Configurações", import: "Importação",
  comanda: "Comandas", plan: "Plano",
};

const MODULE_COLORS: Record<string, string> = {
  menu: "#8b5cf6", financial: "#16a34a", team: "#3b82f6",
  members: "#f97316", settings: "#6b7280", inventory: "#ca8a04",
  crm: "#ec4899", import: "#4f46e5", comanda: "#06b6d4", orders: "#dc2626",
};

const FIELD_LABELS: Record<string, string> = {
  name: "Nome", base_price: "Preço", price: "Preço", amount: "Valor",
  category: "Categoria", is_recurring: "Recorrente", is_active: "Ativo",
  description: "Descrição", address: "Endereço", city: "Cidade",
  neighborhood: "Bairro", whatsapp: "WhatsApp", instagram: "Instagram",
  maps_url: "Maps", is_published: "Publicado",
};

function fmtField(field: string, value: any): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if ((field === "price" || field === "base_price" || field === "amount") && typeof value === "number") {
    return `R$ ${(value / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  }
  return String(value);
}

function actionText(a: ActivityRecord): string {
  const actor = a.actor_name || "Alguém";
  switch (`${a.module}/${a.action}`) {
    case "menu/create_product":    return `${actor} criou o produto`;
    case "menu/update_product":    return `${actor} editou o produto`;
    case "menu/delete_product":    return `${actor} excluiu o produto`;
    case "menu/create_category":   return `${actor} criou a categoria`;
    case "menu/update_category":   return `${actor} editou a categoria`;
    case "menu/delete_category":   return `${actor} excluiu a categoria`;
    case "financial/create_expense": return `${actor} lançou o custo`;
    case "financial/delete_expense": return `${actor} excluiu o custo`;
    case "members/invite_member":  return `${actor} convidou como sócio`;
    case "members/revoke_invite":  return `${actor} cancelou o convite`;
    case "members/remove_member":  return `${actor} removeu o sócio`;
    case "settings/update_unit":
    case "settings/update_unit_settings": return `${actor} alterou as configurações`;
    default: return `${actor} executou "${a.action}"`;
  }
}

// ─── Timeline item ────────────────────────────────────────────────────────────
function TimelineItem({ a }: { a: ActivityRecord }) {
  const initials = (a.actor_name || "?").charAt(0).toUpperCase();
  const color = MODULE_COLORS[a.module] ?? "#6b7280";
  const label = MODULE_LABELS[a.module] ?? a.module;

  return (
    <div style={{ display: "flex", gap: 12, paddingBottom: 16, borderBottom: "1px solid var(--dash-border)" }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
        background: "linear-gradient(135deg, #f472b6, #fb923c)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 700, color: "#fff",
      }}>{initials}</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "var(--dash-text)", lineHeight: 1.4 }}>
          {actionText(a)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: `${color}22`, color }}>
            {label}
          </span>
          <span style={{ fontSize: 10, color: "var(--dash-text-muted)" }} title={formatDate(a.created_at)}>
            {formatRelative(a.created_at)}
          </span>
        </div>

        {a.changes && Object.keys(a.changes).length > 0 && (
          <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 3 }}>
            {Object.entries(a.changes).map(([field, diff]) => {
              const label = FIELD_LABELS[field] ?? field;
              const isPrice = field === "price" || field === "base_price" || field === "amount";
              return (
                <div key={field} style={{ fontSize: 11, color: "var(--dash-text-muted)", paddingLeft: 8, borderLeft: "2px solid var(--dash-border)" }}>
                  {isPrice ? "💰" : "📝"} <strong style={{ color: "var(--dash-text-secondary)" }}>{label}:</strong>{" "}
                  <span style={{ textDecoration: "line-through", opacity: 0.6 }}>{fmtField(field, diff.from)}</span>
                  {" → "}
                  <span style={{ color: "var(--dash-accent)" }}>{fmtField(field, diff.to)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
interface Props {
  restaurantId: string;
  entityType: string;
  entityId: string;
  entityName: string;
  onClose: () => void;
}

export default function HistoricoEntityModal({ restaurantId, entityType, entityId, entityName, onClose }: Props) {
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listActivitiesForEntity(restaurantId, entityType, entityId).then(res => {
      setActivities(res.activities);
      setLoading(false);
    });
  }, [restaurantId, entityType, entityId]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const content = (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", justifyContent: "flex-end",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }}
      />

      {/* Drawer */}
      <div style={{
        position: "relative", zIndex: 1,
        width: "min(480px, 100vw)",
        height: "100%",
        background: "var(--dash-card, #1a1a1a)",
        display: "flex", flexDirection: "column",
        boxShadow: "-8px 0 40px rgba(0,0,0,0.3)",
        overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", borderBottom: "1px solid var(--dash-border)",
          position: "sticky", top: 0,
          background: "var(--dash-card, #1a1a1a)", zIndex: 1,
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Clock size={16} style={{ color: "var(--dash-text-muted)" }} />
              <span style={{ fontWeight: 700, fontSize: 15, color: "var(--dash-text)" }}>Histórico</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--dash-text-muted)", marginTop: 2 }}>{entityName}</div>
          </div>
          <button
            onClick={onClose}
            style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: "rgba(239,68,68,0.12)", color: "#f87171", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--dash-text-muted)", fontSize: 13 }}>
              Carregando...
            </div>
          ) : activities.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <Clock size={32} style={{ color: "var(--dash-text-muted)", opacity: 0.4, marginBottom: 8 }} />
              <div style={{ fontSize: 13, color: "var(--dash-text-muted)" }}>Nenhum histórico registrado</div>
            </div>
          ) : (
            activities.map(a => <TimelineItem key={a.id} a={a} />)
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(content, document.body) : null;
}
