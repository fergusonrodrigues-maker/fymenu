"use client";

import React, { useMemo } from "react";
import Link from "next/link";

type Props = {
  restaurant: any;
  units: any[];
  activeUnit: any;
  stats: {
    totalProducts: number;
    totalCategories: number;
    planLabel: string;
    trialDaysLeft: number | null;
  };
};

function StatCard({
  label, value, sub, accent,
}: {
  label: string; value: string | number; sub?: string; accent?: string;
}) {
  return (
    <div style={{
      borderRadius: 20,
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      padding: "20px 22px",
      display: "flex",
      flexDirection: "column",
      gap: 6,
      position: "relative",
      overflow: "hidden",
    }}>
      {accent && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: accent,
          borderRadius: "20px 20px 0 0",
        }} />
      )}
      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ color: "#fff", fontSize: 32, fontWeight: 900, lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, fontWeight: 600 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function QuickAction({
  href, icon, label, sub,
}: {
  href: string; icon: string; label: string; sub: string;
}) {
  return (
    <Link href={href} style={{
      borderRadius: 18,
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      padding: "18px 20px",
      display: "flex",
      alignItems: "center",
      gap: 16,
      textDecoration: "none",
      transition: "background 200ms, border-color 200ms",
    }}>
      <div style={{
        width: 44, height: 44,
        borderRadius: 14,
        background: "rgba(255,255,255,0.07)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 20, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>{label}</div>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 }}>{sub}</div>
      </div>
      <div style={{ marginLeft: "auto", color: "rgba(255,255,255,0.25)", fontSize: 18 }}>→</div>
    </Link>
  );
}

export default function DashboardClient({ restaurant, units, activeUnit, stats }: Props) {
  const { totalProducts, totalCategories, planLabel, trialDaysLeft } = stats;

  const isBasic = planLabel === "BASIC";
  const isTrial = trialDaysLeft !== null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28, maxWidth: 720 }}>

      {/* ── HEADER ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
            Bem-vindo de volta
          </div>
          <h1 style={{ color: "#fff", fontSize: 26, fontWeight: 900, margin: 0, lineHeight: 1.1 }}>
            {activeUnit?.name ?? "Dashboard"}
          </h1>
        </div>

        {/* Badge plano */}
        <div style={{
          padding: "6px 14px",
          borderRadius: 999,
          background: isBasic ? "rgba(255,255,255,0.07)" : "rgba(99,102,241,0.20)",
          border: isBasic ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(99,102,241,0.40)",
          color: isBasic ? "rgba(255,255,255,0.7)" : "#a5b4fc",
          fontSize: 12, fontWeight: 800, letterSpacing: 0.5,
        }}>
          {planLabel}
        </div>
      </div>

      {/* ── TRIAL BANNER ── */}
      {isTrial && trialDaysLeft !== null && trialDaysLeft <= 7 && (
        <div style={{
          borderRadius: 16,
          background: trialDaysLeft <= 2 ? "rgba(239,68,68,0.12)" : "rgba(251,191,36,0.10)",
          border: `1px solid ${trialDaysLeft <= 2 ? "rgba(239,68,68,0.30)" : "rgba(251,191,36,0.25)"}`,
          padding: "14px 18px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        }}>
          <div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>
              {trialDaysLeft <= 0
                ? "Seu período de teste expirou"
                : `${trialDaysLeft} dia${trialDaysLeft !== 1 ? "s" : ""} restantes no teste`}
            </div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 3 }}>
              Ative um plano para continuar publicado
            </div>
          </div>
          <Link href="/dashboard/planos" style={{
            padding: "8px 16px", borderRadius: 10,
            background: "#fff", color: "#000",
            fontWeight: 800, fontSize: 12, textDecoration: "none", whiteSpace: "nowrap",
          }}>
            Ver planos
          </Link>
        </div>
      )}

      {/* ── STATS GRID ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <StatCard
          label="Produtos"
          value={totalProducts}
          sub="no cardápio"
          accent="linear-gradient(90deg, #6366f1, #8b5cf6)"
        />
        <StatCard
          label="Categorias"
          value={totalCategories}
          sub="organizadas"
          accent="linear-gradient(90deg, #06b6d4, #3b82f6)"
        />
        <StatCard
          label="Unidades"
          value={units.length}
          sub={isBasic ? "máx. 1 no Basic" : "plano Pro"}
          accent="linear-gradient(90deg, #10b981, #06b6d4)"
        />
      </div>

      {/* ── UNIDADE ATIVA ── */}
      <div style={{
        borderRadius: 20,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        padding: "20px 22px",
      }}>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
          Unidade ativa
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 17 }}>{activeUnit?.name}</div>
            <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, marginTop: 3 }}>
              fymenu.vercel.app/u/{activeUnit?.slug}
            </div>
          </div>
          <a
            href={`/u/${activeUnit?.slug}`}
            target="_blank"
            rel="noreferrer"
            style={{
              padding: "8px 16px", borderRadius: 10,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#fff", fontWeight: 700, fontSize: 12,
              textDecoration: "none", whiteSpace: "nowrap",
            }}
          >
            Ver ao vivo ↗
          </a>
        </div>

        {/* outras units */}
        {units.length > 1 && (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
              Outras unidades
            </div>
            {units.filter(u => u.id !== activeUnit?.id).map((unit) => (
              <Link key={unit.id} href={`/dashboard?unit=${unit.id}`} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 14px", borderRadius: 12,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                textDecoration: "none",
              }}>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{unit.name}</div>
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>/u/{unit.slug}</div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── AÇÕES RÁPIDAS ── */}
      <div>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
          Ações rápidas
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <QuickAction href="/dashboard/cardapio" icon="📋" label="Gerenciar cardápio" sub="Categorias, produtos e preços" />
          <QuickAction href="/dashboard/unit" icon="🏪" label="Configurar unidade" sub="Logo, slug, WhatsApp, Instagram" />
          <QuickAction href="/dashboard/account" icon="👤" label="Minha conta" sub="Dados pessoais e plano" />
        </div>
      </div>

    </div>
  );
}
