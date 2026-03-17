"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type ThemeType = "light" | "dark";
type OverlayType = "cardapio" | "unidade" | "conta" | "planos" | "analytics" | null;

const THEMES = {
  light: {
    bg: "#f5f5f7",
    text: "#000",
    muted: "#666",
    surf: "#fff",
    border: "#e5e5e7",
    chip: "#f2f2f7",
  },
  dark: {
    bg: "#1a1a1a",
    text: "#fff",
    muted: "#888",
    surf: "#2a2a2a",
    border: "#333",
    chip: "#333",
  },
};

const F = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const G1 = "#00ffcd";
const GRAD_R = "linear-gradient(135deg, #00ffcd 0%, #00d9b8 100%)";

function DashboardContent() {
  const supabase = createClient();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [units, setUnits] = useState<any[]>([]);
  const [activeUnit, setActiveUnit] = useState<any>(null);
  const [stats, setStats] = useState({ totalProducts: 0, totalCategories: 0 });
  const [th, setTh] = useState<ThemeType>("dark");
  const [open, setOpen] = useState<OverlayType>(null);
  const [planLabel, setPlanLabel] = useState("BASIC");

  // Verificar autenticação
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);
      await loadData(user.id);
      setLoading(false);
    };
    checkAuth();
  }, [supabase, router]);

  const loadData = async (userId: string) => {
    const { data: restaurantData } = await supabase
      .from("restaurants")
      .select("*")
      .eq("owner_id", userId)
      .single();

    if (restaurantData) {
      setRestaurant(restaurantData);
      setPlanLabel(restaurantData.plan || "BASIC");

      const { data: unitsData } = await supabase
        .from("units")
        .select("*")
        .eq("restaurant_id", restaurantData.id);

      if (unitsData) {
        setUnits(unitsData);
        if (unitsData.length > 0) {
          setActiveUnit(unitsData[0]);

          const { count: prodCount } = await supabase
            .from("products")
            .select("id", { count: "exact", head: true })
            .eq("unit_id", unitsData[0].id);

          const { count: catCount } = await supabase
            .from("categories")
            .select("id", { count: "exact", head: true })
            .eq("unit_id", unitsData[0].id);

          setStats({
            totalProducts: prodCount || 0,
            totalCategories: catCount || 0,
          });
        }
      }
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#1a1a2e", color: "#fff" }}>
        <div>Carregando...</div>
      </div>
    );
  }

  const t = THEMES[th];

  return (
    <div style={{ minHeight: "100vh", background: t.bg, color: t.text, fontFamily: F, padding: "32px 20px" }}>
      <style>{`
        .fy-bento {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
          max-width: 980px;
          margin: 0 auto;
        }

        @media (min-width: 768px) {
          .fy-bento {
            grid-template-columns: repeat(4, 1fr);
          }
        }
      `}</style>

      {/* HEADER */}
      <div style={{ maxWidth: 980, margin: "0 auto 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 900, margin: 0, letterSpacing: "-0.5px" }}>
            Dashboard
          </h1>
          <p style={{ fontSize: 14, color: t.muted, margin: "8px 0 0" }}>
            {restaurant?.name || user?.email}
          </p>
        </div>
        <button
          onClick={() => setTh(th === "dark" ? "light" : "dark")}
          style={{
            padding: "8px 16px",
            borderRadius: 12,
            border: `1px solid ${t.border}`,
            background: t.surf,
            color: t.text,
            cursor: "pointer",
            fontFamily: F,
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          {th === "dark" ? "☀️" : "🌙"}
        </button>
      </div>

      {/* BENTO GRID */}
      <div className="fy-bento">
        {/* Stats */}
        <div>
          <CardLayout label="Visão Geral" onOpen={() => setOpen("analytics")} th={th}>
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ background: t.chip, borderRadius: 10, padding: "8px 10px" }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: G1, lineHeight: 1 }}>
                  {stats.totalCategories}
                </div>
                <div style={{ fontSize: 8, color: t.muted, marginTop: 3, fontWeight: 700, textTransform: "uppercase" }}>
                  Categorias
                </div>
              </div>
              <div style={{ background: t.chip, borderRadius: 10, padding: "8px 10px" }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#fb923c", lineHeight: 1 }}>
                  {stats.totalProducts}
                </div>
                <div style={{ fontSize: 8, color: t.muted, marginTop: 3, fontWeight: 700, textTransform: "uppercase" }}>
                  Produtos
                </div>
              </div>
            </div>
            <div style={{ marginTop: 20 }} />
          </CardLayout>
        </div>

        {/* Plano */}
        <div>
          <CardLayout label="Plano" onOpen={() => setOpen("planos")} th={th}>
            <div style={{ fontSize: 26, fontWeight: 900, color: t.text, marginBottom: 8 }}>
              {planLabel}
            </div>
            <div style={{ fontSize: 9, color: t.muted, marginBottom: 16 }}>
              {planLabel === "BASIC" ? "1 Unidade" : "Múltiplas Unidades"}
            </div>
            <button
              onClick={() => setOpen("planos")}
              style={{
                width: "100%",
                padding: "7px",
                borderRadius: 10,
                border: "none",
                background: GRAD_R,
                color: "#000",
                fontFamily: F,
                fontWeight: 800,
                fontSize: 10,
                cursor: "pointer",
              }}
            >
              VER PLANOS
            </button>
            <div style={{ marginBottom: 28 }} />
          </CardLayout>
        </div>

        {/* Unidade */}
        <div style={{ gridRow: "span 2" }}>
          <CardLayout label="Unidade" onOpen={() => setOpen("unidade")} th={th}>
            <div style={{ fontSize: 13, fontWeight: 900, color: t.text, marginBottom: 12 }}>
              {activeUnit?.name || "–"}
            </div>
            {["Slug", "WhatsApp", "Instagram"].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0", borderBottom: i < 2 ? `1px solid ${t.border}` : "none" }}>
                <div style={{ width: 3, height: 3, borderRadius: "50%", background: "#818cf8", flexShrink: 0 }} />
                <span style={{ fontSize: 9, color: t.muted, fontWeight: 600 }}>{item}</span>
              </div>
            ))}
            <div style={{ marginBottom: 28 }} />
          </CardLayout>
        </div>

        {/* Cardápio Link */}
        <div style={{ gridRow: "span 2" }}>
          <a
            href="#"
            onClick={() => setOpen("cardapio")}
            style={{
              display: "block",
              height: "100%",
              textDecoration: "none",
            }}
          >
            <CardLayout label="Cardápio" th={th}>
              <div style={{ fontSize: 13, fontWeight: 900, color: t.text, marginBottom: 6 }}>
                Gerenciar
              </div>
              {["Categorias", "Produtos", "Variações"].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0", borderBottom: i < 2 ? `1px solid ${t.border}` : "none" }}>
                  <div style={{ width: 3, height: 3, borderRadius: "50%", background: "#00ffcd", flexShrink: 0 }} />
                  <span style={{ fontSize: 9, color: t.muted, fontWeight: 600 }}>{item}</span>
                </div>
              ))}
              <div style={{ marginBottom: 28 }} />
            </CardLayout>
          </a>
        </div>

        {/* Conta Link */}
        <div style={{ gridRow: "span 2" }}>
          <a
            href="#"
            onClick={() => setOpen("conta")}
            style={{
              display: "block",
              height: "100%",
              textDecoration: "none",
            }}
          >
            <CardLayout label="Conta" th={th}>
              <div style={{ fontSize: 13, fontWeight: 900, color: t.text, marginBottom: 6 }}>
                Minha Conta
              </div>
              {["Dados pessoais", "Senha", "Plano"].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0", borderBottom: i < 2 ? `1px solid ${t.border}` : "none" }}>
                  <div style={{ width: 3, height: 3, borderRadius: "50%", background: "#818cf8", flexShrink: 0 }} />
                  <span style={{ fontSize: 9, color: t.muted, fontWeight: 600 }}>{item}</span>
                </div>
              ))}
              <div style={{ marginBottom: 28 }} />
            </CardLayout>
          </a>
        </div>
        {/* Modo TV */}
        <div>
          <a
            href="/dashboard/tv"
            style={{ display: "block", height: "100%", textDecoration: "none" }}
          >
            <CardLayout label="Modo TV" th={th}>
              <div style={{ fontSize: 13, fontWeight: 900, color: t.text, marginBottom: 6 }}>
                📺 Tela de TV
              </div>
              {["Mídia ativa", "Slides", "Gerenciar"].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0", borderBottom: i < 2 ? `1px solid ${t.border}` : "none" }}>
                  <div style={{ width: 3, height: 3, borderRadius: "50%", background: "#fb923c", flexShrink: 0 }} />
                  <span style={{ fontSize: 9, color: t.muted, fontWeight: 600 }}>{item}</span>
                </div>
              ))}
              <div style={{ marginBottom: 28 }} />
            </CardLayout>
          </a>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ textAlign: "center", marginTop: 32, maxWidth: 980, margin: "32px auto 0" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 20, background: "rgba(0,255,205,.08)", border: "1px solid rgba(0,255,205,.14)" }}>
          <div style={{ width: 4, height: 4, borderRadius: "50%", background: G1, boxShadow: `0 0 4px ${G1}`, animation: "pulse 2s ease infinite" }} />
          <span style={{ fontSize: 9, color: G1, fontWeight: 700, fontFamily: F }}>
            fymenu.app/u/{activeUnit?.slug}
          </span>
        </div>
      </div>

      {/* OVERLAYS */}
      {open && (
        <Overlay onClose={() => setOpen(null)} th={th}>
          {open === "cardapio" && <OverlayCardapio th={th} />}
          {open === "unidade" && <OverlayUnidade unit={activeUnit} th={th} />}
          {open === "conta" && <OverlayConta restaurant={restaurant} user={user} th={th} />}
          {open === "planos" && <OverlayPlanos th={th} />}
          {open === "analytics" && <OverlayAnalytics stats={stats} th={th} />}
        </Overlay>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#1a1a2e", color: "#fff" }}>Carregando...</div>}>
      <DashboardContent />
    </Suspense>
  );
}

// ─── COMPONENTS ───

interface CardLayoutProps {
  label: string;
  onOpen?: () => void;
  th: ThemeType;
  children: React.ReactNode;
}

function CardLayout({ label, onOpen, th, children }: CardLayoutProps) {
  const t = THEMES[th];
  return (
    <div
      onClick={onOpen}
      style={{
        padding: 16,
        background: t.surf,
        border: `1px solid ${t.border}`,
        borderRadius: 16,
        cursor: onOpen ? "pointer" : "default",
        transition: "all 0.2s ease",
        minHeight: 200,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
      }}
      onMouseEnter={(e) => onOpen && (e.currentTarget.style.borderColor = "#00ffcd")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = t.border)}
    >
      <div style={{ fontSize: 10, color: t.muted, fontWeight: 700, textTransform: "uppercase", marginBottom: 12 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

interface OverlayProps {
  onClose: () => void;
  th: ThemeType;
  children: React.ReactNode;
}

function Overlay({ onClose, th, children }: OverlayProps) {
  const t = THEMES[th];
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 998,
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: t.surf,
          border: `1px solid ${t.border}`,
          borderRadius: 20,
          padding: 32,
          maxWidth: 500,
          width: "90%",
          maxHeight: "80vh",
          overflowY: "auto",
          zIndex: 999,
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "none",
            border: "none",
            fontSize: 20,
            cursor: "pointer",
            color: t.text,
          }}
        >
          ✕
        </button>
        {children}
      </div>
    </>
  );
}

function OverlayCardapio({ th }: { th: ThemeType }) {
  const t = THEMES[th];
  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 900, color: t.text, marginBottom: 16 }}>
        Gerenciar Cardápio
      </h2>
      <p style={{ color: t.muted, marginBottom: 12 }}>
        Adicione categorias e produtos ao seu cardápio.
      </p>
      <button
        style={{
          width: "100%",
          padding: 12,
          background: "linear-gradient(135deg, #00ffcd 0%, #00d9b8 100%)",
          color: "#000",
          border: "none",
          borderRadius: 8,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Editar Cardápio
      </button>
    </div>
  );
}

function OverlayUnidade({ unit, th }: { unit: any; th: ThemeType }) {
  const t = THEMES[th];
  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 900, color: t.text, marginBottom: 16 }}>
        Configurar Unidade
      </h2>
      <div style={{ display: "grid", gap: 12, marginBottom: 20 }}>
        <div>
          <label style={{ fontSize: 12, color: t.muted, fontWeight: 600, display: "block", marginBottom: 6 }}>
            Nome
          </label>
          <input
            type="text"
            defaultValue={unit?.name}
            style={{
              width: "100%",
              padding: "8px 12px",
              background: t.bg,
              border: `1px solid ${t.border}`,
              borderRadius: 8,
              color: t.text,
              fontFamily: F,
            }}
          />
        </div>
      </div>
      <button
        style={{
          width: "100%",
          padding: 12,
          background: "linear-gradient(135deg, #00ffcd 0%, #00d9b8 100%)",
          color: "#000",
          border: "none",
          borderRadius: 8,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Salvar
      </button>
    </div>
  );
}

function OverlayConta({ restaurant, user, th }: { restaurant: any; user: any; th: ThemeType }) {
  const t = THEMES[th];
  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 900, color: t.text, marginBottom: 16 }}>
        Minha Conta
      </h2>
      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, color: t.muted, fontWeight: 600, display: "block", marginBottom: 6 }}>
            Email
          </label>
          <input type="text" disabled defaultValue={user?.email} style={{ width: "100%", padding: "8px 12px", background: t.bg, border: `1px solid ${t.border}`, borderRadius: 8, color: t.text }} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: t.muted, fontWeight: 600, display: "block", marginBottom: 6 }}>
            Nome do Restaurante
          </label>
          <input type="text" defaultValue={restaurant?.name} style={{ width: "100%", padding: "8px 12px", background: t.bg, border: `1px solid ${t.border}`, borderRadius: 8, color: t.text }} />
        </div>
      </div>
    </div>
  );
}

function OverlayPlanos({ th }: { th: ThemeType }) {
  const t = THEMES[th];
  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 900, color: t.text, marginBottom: 20 }}>
        Planos
      </h2>
      <div style={{ display: "grid", gap: 16 }}>
        <div style={{ padding: 16, background: t.bg, borderRadius: 12, border: `1px solid ${t.border}` }}>
          <h3 style={{ fontSize: 16, fontWeight: 900, color: t.text, marginBottom: 4 }}>
            Basic
          </h3>
          <div style={{ fontSize: 18, color: G1, fontWeight: 900, marginBottom: 12 }}>
            R$ 49/mês
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
            {["1 unidade", "WhatsApp", "Link público"].map((f) => (
              <li key={f} style={{ fontSize: 12, color: t.text }}>
                ✓ {f}
              </li>
            ))}
          </ul>
        </div>
        <div style={{ padding: 16, background: t.bg, borderRadius: 12, border: `1px solid #00ffcd` }}>
          <h3 style={{ fontSize: 16, fontWeight: 900, color: t.text, marginBottom: 4 }}>
            Pro
          </h3>
          <div style={{ fontSize: 18, color: G1, fontWeight: 900, marginBottom: 12 }}>
            R$ 99/mês
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
            {["Múltiplas unidades", "Tudo do Basic", "Subdomínio"].map((f) => (
              <li key={f} style={{ fontSize: 12, color: t.text }}>
                ✓ {f}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function OverlayAnalytics({ stats, th }: { stats: any; th: ThemeType }) {
  const t = THEMES[th];
  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 900, color: t.text, marginBottom: 20 }}>
        Visão Geral
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ padding: 16, background: t.bg, borderRadius: 12, border: `1px solid ${t.border}`, textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: G1 }}>
            {stats.totalCategories}
          </div>
          <div style={{ fontSize: 12, color: t.muted, marginTop: 4 }}>
            Categorias
          </div>
        </div>
        <div style={{ padding: 16, background: t.bg, borderRadius: 12, border: `1px solid ${t.border}`, textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#fb923c" }}>
            {stats.totalProducts}
          </div>
          <div style={{ fontSize: 12, color: t.muted, marginTop: 4 }}>
            Produtos
          </div>
        </div>
      </div>
    </div>
  );
}