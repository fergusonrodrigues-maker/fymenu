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
    <>
      <style>{`
        /* ── Sidebar desktop ── */
        .fy-layout { min-height:100vh; background:#080808; color:#fff; font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif; display:flex; }
        .fy-sidebar { width:72px; flex-shrink:0; position:fixed; top:0; left:0; bottom:0; display:flex; flex-direction:column; align-items:center; padding:16px 0; gap:8px; background:rgba(255,255,255,0.03); border-right:1px solid rgba(255,255,255,0.06); z-index:100; }
        .fy-main { flex:1; margin-left:72px; min-height:100vh; padding:32px 28px; max-width:calc(100vw - 72px); box-sizing:border-box; }
        /* ── Mobile bottom nav ── */
        .fy-bottom-nav { display:none; }
        @media(max-width:640px){
          .fy-sidebar { display:none; }
          .fy-main { margin-left:0; max-width:100vw; padding:16px 12px 80px; }
          .fy-bottom-nav {
            display:flex; position:fixed; bottom:0; left:0; right:0; z-index:100;
            background:rgba(8,8,8,0.92); border-top:1px solid rgba(255,255,255,0.08);
            backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px);
            padding:8px 0 env(safe-area-inset-bottom,8px);
            justify-content:space-around; align-items:center;
          }
          .fy-bottom-nav a { display:flex; flex-direction:column; align-items:center; gap:3px; text-decoration:none; color:rgba(255,255,255,0.45); font-size:10px; padding:4px 16px; transition:color .15s; }
          .fy-bottom-nav a:hover { color:#fff; }
          .fy-bottom-nav .nav-icon { font-size:20px; line-height:1; }
        }
        /* ── iPad ── */
        @media(min-width:641px) and (max-width:900px){
          .fy-sidebar { width:56px; }
          .fy-main { margin-left:56px; max-width:calc(100vw - 56px); padding:20px 16px 32px; }
        }
      `}</style>

      <div className="fy-layout">
        {/* ── SIDEBAR (desktop + tablet) ── */}
        <aside className="fy-sidebar">
          {/* Logo */}
          <div style={{
            width: 44, height: 44, borderRadius: 14, overflow: "hidden",
            background: "rgba(255,255,255,0.08)",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 8, flexShrink: 0,
          }}>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={unitName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: 20 }}>🍽️</span>
            )}
          </div>

          <div style={{ width: 32, height: 1, background: "rgba(255,255,255,0.08)", marginBottom: 4 }} />

          <NavItem href="/dashboard" icon="⬛" label="Home" />
          <NavItem href="/dashboard/cardapio" icon="📋" label="Cardápio" />
          <NavItem href="/dashboard/unit" icon="🏪" label="Unidade" />
          <NavItem href="/dashboard/account" icon="👤" label="Conta" />

          <div style={{ flex: 1 }} />
          {slug && (
            <>
              <a
                href={`/u/${slug}/tv`}
                target="_blank"
                rel="noreferrer"
                title="Modo TV"
                style={{
                  width: 44, height: 44, borderRadius: 14,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  textDecoration: "none", fontSize: 18, transition: "background 200ms",
                }}
              >
                📺
              </a>
              <a
                href={`/u/${slug}`}
                target="_blank"
                rel="noreferrer"
                title="Ver cardápio público"
                style={{
                  width: 44, height: 44, borderRadius: 14,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  textDecoration: "none", fontSize: 18, transition: "background 200ms",
                }}
              >
                ↗
              </a>
            </>
          )}
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main className="fy-main">
          {children}
        </main>

        {/* ── BOTTOM NAV (mobile only) ── */}
        <nav className="fy-bottom-nav">
          <Link href="/dashboard">
            <span className="nav-icon">⬛</span>
            <span>Home</span>
          </Link>
          <Link href="/dashboard/cardapio">
            <span className="nav-icon">📋</span>
            <span>Cardápio</span>
          </Link>
          <Link href="/dashboard/unit">
            <span className="nav-icon">🏪</span>
            <span>Unidade</span>
          </Link>
          <Link href="/dashboard/account">
            <span className="nav-icon">👤</span>
            <span>Conta</span>
          </Link>
          {slug && (
            <a href={`/u/${slug}/tv`} target="_blank" rel="noreferrer">
              <span className="nav-icon">📺</span>
              <span>TV</span>
            </a>
          )}
        </nav>
      </div>
    </>
  );
}

function NavItem({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      title={label}
      style={{
        width: 44, height: 44, borderRadius: 14,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
        textDecoration: "none", fontSize: 18,
        transition: "all 200ms ease", color: "#fff",
      }}
    >
      {icon}
    </Link>
  );
}
