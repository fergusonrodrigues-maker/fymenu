"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";

type TabName = "home" | "cardapio" | "unidade" | "conta" | "planos";

const TABS: { id: TabName; label: string; icon: string }[] = [
  { id: "home", label: "Home", icon: "⬛" },
  { id: "cardapio", label: "Cardápio", icon: "📋" },
  { id: "unidade", label: "Unidade", icon: "🏪" },
  { id: "conta", label: "Conta", icon: "👤" },
  { id: "planos", label: "Planos", icon: "💳" },
];

function DashboardContent() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [activeTab, setActiveTab] = useState<TabName>("home");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Verificar autenticação
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);
      setLoading(false);
    };
    checkAuth();
  }, [supabase, router]);

  // Verificar tab na URL
  useEffect(() => {
    const tab = searchParams.get("tab") as TabName;
    if (tab && TABS.find(t => t.id === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#1a1a2e", color: "#fff" }}>
        <div>Carregando...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#1a1a2e", color: "#fff", padding: "20px" }}>
      <style>{`
        .dashboard-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .tabs-nav {
          display: flex;
          gap: 8px;
          margin-bottom: 32px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          overflow-x: auto;
          padding-bottom: 16px;
        }

        .tab-button {
          padding: 10px 18px;
          border: none;
          background: transparent;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          white-space: nowrap;
          transition: all 0.3s ease;
          border-bottom: 2px solid transparent;
          margin-bottom: -16px;
          padding-bottom: 26px;
        }

        .tab-button:hover {
          color: rgba(255, 255, 255, 0.9);
        }

        .tab-button.active {
          color: #00ffcd;
          border-bottom-color: #00ffcd;
        }

        .tab-content {
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      <div className="dashboard-container">
        {/* TAB NAVIGATION */}
        <div className="tabs-nav">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => {
                setActiveTab(tab.id);
                window.history.replaceState({}, "", `?tab=${tab.id}`);
              }}
            >
              <span style={{ marginRight: "6px" }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB CONTENT */}
        <div className="tab-content">
          {activeTab === "home" && <TabHome user={user} />}
          {activeTab === "cardapio" && <TabCardapio />}
          {activeTab === "unidade" && <TabUnidade />}
          {activeTab === "conta" && <TabConta user={user} />}
          {activeTab === "planos" && <TabPlanos />}
        </div>
      </div>
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

// ─── TAB: HOME ───
function TabHome({ user }: { user: any }) {
  const supabase = createClient();
  const [stats, setStats] = useState({ products: 0, categories: 0, units: 0 });

  useEffect(() => {
    const load = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) return;

      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("id")
        .eq("owner_id", u.id)
        .single();

      if (!restaurant) return;

      const [products, categories, units] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }).eq("unit_id", restaurant.id),
        supabase.from("categories").select("id", { count: "exact", head: true }).eq("unit_id", restaurant.id),
        supabase.from("units").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurant.id),
      ]);

      setStats({
        products: products.count || 0,
        categories: categories.count || 0,
        units: units.count || 0,
      });
    };
    load();
  }, [supabase]);

  return (
    <div>
      <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8 }}>Bem-vindo!</h1>
      <p style={{ color: "rgba(255, 255, 255, 0.6)", marginBottom: 32 }}>
        {user?.email}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        <StatCard icon="📋" label="Categorias" value={stats.categories} />
        <StatCard icon="🍔" label="Produtos" value={stats.products} />
        <StatCard icon="🏪" label="Unidades" value={stats.units} />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div style={{
      padding: "20px",
      background: "rgba(255, 255, 255, 0.05)",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      borderRadius: "12px",
    }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.6)" }}>{label}</div>
    </div>
  );
}

// ─── TAB: CARDÁPIO ───
function TabCardapio() {
  const supabase = createClient();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!restaurant) return;

      const { data: units } = await supabase
        .from("units")
        .select("id")
        .eq("restaurant_id", restaurant.id);

      if (!units?.length) return;

      const { data } = await supabase
        .from("categories")
        .select("*")
        .in("unit_id", units.map(u => u.id))
        .order("order_index");

      setCategories(data || []);
      setLoading(false);
    };
    load();
  }, [supabase]);

  if (loading) return <div>Carregando...</div>;

  return (
    <div>
      <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 20 }}>Gerenciar Cardápio</h2>
      
      {categories.length === 0 ? (
        <div style={{ padding: "40px", textAlign: "center", color: "rgba(255, 255, 255, 0.6)" }}>
          Nenhuma categoria. Crie uma para começar!
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {categories.map((cat) => (
            <div
              key={cat.id}
              style={{
                padding: "16px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "12px",
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 700 }}>{cat.name}</div>
              <div style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.6)", marginTop: 4 }}>
                ID: {cat.id}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── TAB: UNIDADE ───
function TabUnidade() {
  const supabase = createClient();
  const [unit, setUnit] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!restaurant) return;

      const { data } = await supabase
        .from("units")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .single();

      setUnit(data);
      setLoading(false);
    };
    load();
  }, [supabase]);

  if (loading) return <div>Carregando...</div>;
  if (!unit) return <div>Nenhuma unidade encontrada</div>;

  return (
    <div>
      <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 20 }}>Configuração da Unidade</h2>
      
      <div style={{ display: "grid", gap: 16 }}>
        <InfoField label="Nome" value={unit.name} />
        <InfoField label="Slug" value={unit.slug} />
        <InfoField label="WhatsApp" value={unit.whatsapp || "Não configurado"} />
        <InfoField label="Instagram" value={unit.instagram || "Não configurado"} />
        <InfoField label="Endereço" value={unit.address || "Não configurado"} />
      </div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.6)", marginBottom: 6, textTransform: "uppercase", fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ padding: "12px 16px", background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "8px" }}>
        {value}
      </div>
    </div>
  );
}

// ─── TAB: CONTA ───
function TabConta({ user }: { user: any }) {
  const supabase = createClient();
  const [restaurant, setRestaurant] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("restaurants")
        .select("*")
        .eq("owner_id", user.id)
        .single();
      setRestaurant(data);
    };
    load();
  }, [supabase, user]);

  return (
    <div>
      <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 20 }}>Minha Conta</h2>
      
      <div style={{ display: "grid", gap: 20 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Informações Pessoais</h3>
          <div style={{ display: "grid", gap: 12 }}>
            <InfoField label="Email" value={user?.email || "–"} />
            <InfoField label="Nome do Restaurante" value={restaurant?.name || "–"} />
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Segurança</h3>
          <button style={{
            padding: "12px 24px",
            background: "rgba(0, 255, 205, 0.1)",
            border: "1px solid rgba(0, 255, 205, 0.3)",
            color: "#00ffcd",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: 600,
          }}>
            ↗ Mudar Senha
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TAB: PLANOS ───
function TabPlanos() {
  return (
    <div>
      <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 20 }}>Planos</h2>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <PlanCard name="Basic" price="R$ 49/mês" features={["1 unidade", "WhatsApp", "Link público"]} />
        <PlanCard name="Pro" price="R$ 99/mês" features={["Múltiplas unidades", "Tudo do Basic", "Subdomínio"]} highlight />
      </div>
    </div>
  );
}

function PlanCard({ name, price, features, highlight }: any) {
  return (
    <div style={{
      padding: "24px",
      background: highlight ? "rgba(0, 255, 205, 0.1)" : "rgba(255, 255, 255, 0.05)",
      border: highlight ? "1px solid rgba(0, 255, 205, 0.3)" : "1px solid rgba(255, 255, 255, 0.1)",
      borderRadius: "12px",
    }}>
      <h3 style={{ fontSize: 20, fontWeight: 900, marginBottom: 4 }}>{name}</h3>
      <div style={{ fontSize: 24, color: "#00ffcd", fontWeight: 900, marginBottom: 16 }}>{price}</div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
        {features.map((f: string) => (
          <li key={f} style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.8)" }}>✓ {f}</li>
        ))}
      </ul>
      <button style={{
        width: "100%",
        padding: "12px",
        marginTop: 16,
        background: "#00ffcd",
        color: "#000",
        border: "none",
        borderRadius: "8px",
        fontWeight: 700,
        cursor: "pointer",
      }}>
        {highlight ? "Escolher" : "Mais info"}
      </button>
    </div>
  );
}