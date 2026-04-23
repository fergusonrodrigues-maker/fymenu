"use client";

import React from "react";
import { Tv, Clapperboard } from "lucide-react";
import { Unit } from "../types";

export default function TVModal({ unit, tvCount }: { unit: Unit | null; tvCount: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
      <div style={{ borderRadius: 16, padding: "20px", background: "var(--dash-card)", border: "1px solid var(--dash-card-border)", textAlign: "center" }}>
        <div style={{ marginBottom: 12, display: "flex", justifyContent: "center", color: "var(--dash-text-muted)" }}><Tv size={40} /></div>
        <div style={{ color: "var(--dash-text)", fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{tvCount} vídeo{tvCount !== 1 ? "s" : ""} ativo{tvCount !== 1 ? "s" : ""}</div>
        <div style={{ color: "var(--dash-text-muted)", fontSize: 13, marginBottom: 16 }}>Exiba seus produtos em modo fullscreen para TV, totem ou projetor.</div>
        {unit && (
          <a href={`/tv/${unit.slug}`} target="_blank" rel="noreferrer" style={{ display: "block", padding: "12px", borderRadius: 12, background: "var(--dash-link-bg)", border: "1px solid var(--dash-card-border)", color: "var(--dash-text-secondary)", fontSize: 14, fontWeight: 600, textDecoration: "none", marginBottom: 10 }}>
            Abrir display público ↗
          </a>
        )}
        <a href="/painel/tv" style={{ display: "block", padding: "12px", borderRadius: 12, border: "none", background: "var(--dash-accent-soft)", color: "var(--dash-accent)", fontSize: 14, fontWeight: 700, textDecoration: "none", boxShadow: "0 1px 0 rgba(0,255,174,0.08) inset, 0 -1px 0 rgba(0,0,0,0.15) inset" }}>
          Gerenciar vídeos →
        </a>
      </div>
      <div style={{ borderRadius: 14, padding: "14px 16px", background: "var(--dash-card-subtle)", border: "1px solid var(--dash-card-border)" }}>
        <div style={{ color: "var(--dash-text-muted)", fontSize: 13 }}>
          Vídeos até 15 segundos · Sem som · Autoplay · Vertical ou horizontal
        </div>
      </div>
    </div>
  );
}
