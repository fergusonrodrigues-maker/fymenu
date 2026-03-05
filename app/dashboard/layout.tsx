// FILE: /app/dashboard/layout.tsx
// ACTION: REPLACE ENTIRE FILE

import type { ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTenantContext } from "@/lib/tenant/getTenantContext";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();

  let logoUrl = "";
  let unitName = "FyMenu";
  let slug = "";

  try {
    const { units } = await getTenantContext();
    const unit = units?.[0];
    logoUrl = unit?.logo_url ?? "";
    unitName = unit?.name ?? "FyMenu";
    slug = unit?.slug ?? "";
  } catch {}

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080808",
      color: "#fff",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
      display: "flex",
    }}>
      {/* ── SIDEBAR ── */}
      <aside style={{
        width: 72,
        flexShrink: 0,
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "16px 0",
        gap: 8,
        background: "rgba(255,255,255,0.03)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{
          width: 44, height: 44,
          borderRadius: 14,
          overflow: "hidden",
          background: "rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 8,
          flexShrink: 0,
        }}>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={unitName}
              style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: 20 }}>🍽️</span>
          )}
        </div>

        <div style={{ width: 32, height: 1, background: "rgba(255,255,255,0.08)", marginBottom: 4 }} />

        <NavItem href="/dashboard" icon="⬛" label="Home" />
        <NavItem href="/dashboard/cardapio" icon="📋" label="Cardápio" />
        <NavItem href="/dashboard/unit" icon="🏪" label="Unidade" />
        <NavItem href="/dashboard/account" icon="👤" label="Conta" />

        {/* Preview link na base */}
        <div style={{ flex: 1 }} />
        {slug && (
          <a
            href={`/u/${slug}`}
            target="_blank"
            rel="noreferrer"
            title="Ver cardápio público"
            style={{
              width: 44, height: 44,
              borderRadius: 14,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              textDecoration: "none",
              fontSize: 18,
              transition: "background 200ms",
            }}
          >
            ↗
          </a>
        )}
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main style={{
        flex: 1,
        marginLeft: 72,
        minHeight: "100vh",
        padding: "32px 28px",
        maxWidth: "calc(100vw - 72px)",
        boxSizing: "border-box",
      }}>
        {children}
      </main>
    </div>
  );
}

function NavItem({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      title={label}
      style={{
        width: 44, height: 44,
        borderRadius: 14,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
        textDecoration: "none",
        fontSize: 18,
        transition: "all 200ms ease",
        color: "#fff",
      }}
    >
      {icon}
    </Link>
  );
}
