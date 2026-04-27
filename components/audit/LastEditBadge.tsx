"use client";

import React, { useState } from "react";
import { Clock, ChevronRight } from "lucide-react";
import type { LastEditInfo } from "@/app/painel/historicoActions";
import dynamic from "next/dynamic";

const HistoricoEntityModal = dynamic(
  () => import("@/app/painel/modals/HistoricoEntityModal"),
  { ssr: false }
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "agora";
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "ontem";
  if (d < 30) return `há ${d} dias`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function truncateName(name: string, max = 20): string {
  return name.length > max ? name.slice(0, max) + "…" : name;
}

function badgeVerb(action: string): string {
  return action.startsWith("create_") ? "Criado" : "Editado";
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  lastEdit: LastEditInfo | null | undefined;
  restaurantId: string;
  entityType: string;
  entityId: string;
  entityName: string;
  variant?: "inline" | "block";
}

export default function LastEditBadge({
  lastEdit,
  restaurantId,
  entityType,
  entityId,
  entityName,
  variant = "inline",
}: Props) {
  const [open, setOpen] = useState(false);

  if (!lastEdit) return null;

  const verb = badgeVerb(lastEdit.action);
  const actor = truncateName(lastEdit.actorName || "alguém");
  const when = formatRelative(lastEdit.createdAt);
  const text = `${verb} por ${actor} ${when}`;

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  }

  return (
    <>
      {variant === "inline" ? (
        <div
          onClick={handleClick}
          title="Ver histórico completo"
          style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            fontSize: 11, color: "var(--dash-text-muted)", cursor: "pointer",
            marginTop: 2,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = "var(--dash-text-secondary)";
            (e.currentTarget as HTMLElement).style.textDecoration = "underline";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = "var(--dash-text-muted)";
            (e.currentTarget as HTMLElement).style.textDecoration = "none";
          }}
        >
          <Clock size={11} style={{ flexShrink: 0 }} />
          <span>{text}</span>
        </div>
      ) : (
        <div
          onClick={handleClick}
          title="Ver histórico completo"
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "8px 12px", borderRadius: 8, cursor: "pointer",
            background: "rgba(0,0,0,0.03)",
            transition: "background 0.15s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.06)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.03)"; }}
        >
          <Clock size={14} style={{ color: "var(--dash-text-muted)", flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 12, color: "var(--dash-text-muted)" }}>{text}</span>
          <ChevronRight size={13} style={{ color: "var(--dash-text-muted)", flexShrink: 0 }} />
        </div>
      )}

      {open && (
        <HistoricoEntityModal
          restaurantId={restaurantId}
          entityType={entityType}
          entityId={entityId}
          entityName={entityName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
