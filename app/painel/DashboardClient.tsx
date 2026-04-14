"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import { createClient } from "@/lib/supabase/client";
import dynamic from "next/dynamic";
import type { Restaurant, Unit, StockStats, Category, Product, Profile, ReportData } from "./types";
import FyLoader from "@/components/FyLoader";
import { hasPlanFeature, planLabel, maxUnits as planMaxUnits } from "@/lib/plan";

const loadingFallback = <div style={{padding:40,display:"flex",justifyContent:"center"}}><FyLoader size="sm" /></div>;

const RestaurantOperationsModal = dynamic(() => import("./components/RestaurantOperationsModal"), { ssr: false, loading: () => loadingFallback });
const PedidosModal = dynamic(() => import("./components/PedidosModal"), { ssr: false, loading: () => loadingFallback });
const StaffAnalyticsModal = dynamic(() => import("./components/StaffAnalyticsModal"), { ssr: false, loading: () => loadingFallback });
const AnalyticsModal = dynamic(() => import("./modals/AnalyticsModal"), { ssr: false, loading: () => loadingFallback });
const CardapioModal = dynamic(() => import("./modals/CardapioModal"), { ssr: false, loading: () => loadingFallback });
const FinanceiroModal = dynamic(() => import("./modals/FinanceiroModal"), { ssr: false, loading: () => loadingFallback });
const UnidadeModal = dynamic(() => import("./modals/UnidadeModal"), { ssr: false, loading: () => loadingFallback });
const TVModal = dynamic(() => import("./modals/TVModal"), { ssr: false, loading: () => loadingFallback });
const ModoTVModal = dynamic(() => import("./modals/ModoTVModal"), { ssr: false, loading: () => loadingFallback });
const PlanoModal = dynamic(() => import("./modals/PlanoModal"), { ssr: false, loading: () => loadingFallback });
const EstoqueModal = dynamic(() => import("./modals/EstoqueModal"), { ssr: false, loading: () => loadingFallback });
const ConfigModal = dynamic(() => import("./modals/ConfigModal"), { ssr: false, loading: () => loadingFallback });
const PrinterModal = dynamic(() => import("./modals/PrinterModal"), { ssr: false, loading: () => loadingFallback });
const CrmModal = dynamic(() => import("./modals/CrmModal"), { ssr: false, loading: () => loadingFallback });
const WhatsappModal  = dynamic(() => import("./modals/WhatsappModal"),  { ssr: false, loading: () => loadingFallback });
const DeliveryModal  = dynamic(() => import("./modals/DeliveryModal"),  { ssr: false, loading: () => loadingFallback });
const ChatWidget = dynamic(() => import("./components/ChatWidget"), { ssr: false });

// ─── Modal backdrop ─────────────────────────────────────────────────────────
function Modal({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: React.ReactNode; title: string }) {
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const startY = useRef(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
      document.body.style.top = `-${window.scrollY}px`;
      document.body.style.overscrollBehavior = "none";
      setDragY(0);
    } else {
      const scrollY = document.body.style.top;
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
      document.body.style.overscrollBehavior = "";
      if (scrollY) window.scrollTo(0, parseInt(scrollY || "0") * -1);
    }
    return () => {
      const scrollY = document.body.style.top;
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
      document.body.style.overscrollBehavior = "";
      if (scrollY) window.scrollTo(0, parseInt(scrollY || "0") * -1);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !isDesktop) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, isDesktop, onClose]);

  function onTouchStart(e: React.TouchEvent) {
    const content = contentRef.current;
    if (content && content.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
    setDragging(true);
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!dragging) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) {
      setDragY(dy);
    }
  }

  function onTouchEnd() {
    if (!dragging) return;
    setDragging(false);
    if (dragY > 100) {
      onClose();
    }
    setDragY(0);
  }

  if (!open) return null;

  // ── Desktop: inverted glassmorphism — luminous backdrop, dark modal ──────
  if (isDesktop) {
    return (
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.2)",
          backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: "modalBackdropIn 0.2s ease",
        }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          className="modal-desktop-scroll"
          style={{
            width: "90%", maxWidth: 760, maxHeight: "80vh",
            borderRadius: 28,
            background: isDark ? "rgba(8,8,8,0.75)" : "rgba(255,255,255,0.92)",
            backdropFilter: "blur(80px)", WebkitBackdropFilter: "blur(80px)",
            boxShadow: isDark
              ? "0 1px 0 rgba(255,255,255,0.04) inset, 0 -1px 0 rgba(0,0,0,0.4) inset, 0 40px 80px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,255,255,0.06)"
              : "0 1px 0 rgba(255,255,255,0.8) inset, 0 -1px 0 rgba(0,0,0,0.06) inset, 0 40px 80px rgba(0,0,0,0.15), 0 0 0 0.5px rgba(0,0,0,0.08)",
            overflowY: "auto",
            overscrollBehavior: "contain",
            animation: "modalContentIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            position: "relative",
            padding: 0,
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: "sticky", top: 16, float: "right", zIndex: 10,
              width: 36, height: 36, borderRadius: 12,
              background: "rgba(220,38,38,0.12)",
              border: "none",
              color: "#ffffff",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", fontSize: 16, marginRight: 16, marginTop: 16,
              transition: "all 0.2s", flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(220,38,38,0.22)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(220,38,38,0.12)";
            }}
          >✕</button>
          <div style={{ padding: "8px 28px 28px" }}>
            {children}
          </div>
        </div>
      </div>
    );
  }

  // ── Mobile: bottom sheet with swipe-to-close ─────────────────────────────
  const opacity = Math.max(0, 1 - dragY / 300);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: `rgba(0,0,0,${0.7 * opacity})`,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        transition: dragging ? "none" : "background 0.3s ease",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={contentRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          background: isDark ? "#1a1a1a" : "#fff",
          borderRadius: "24px 24px 0 0",
          width: "100%",
          maxWidth: 480,
          maxHeight: "92vh",
          overflowY: "auto",
          overscrollBehavior: "contain",
          WebkitOverflowScrolling: "touch",
          position: "relative",
          transform: `translateY(${dragY}px)`,
          transition: dragging ? "none" : "transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
          opacity,
        }}
      >
        {/* Handle bar visual */}
        <div style={{
          position: "sticky", top: 0, zIndex: 10,
          background: isDark ? "#1a1a1a" : "#fff",
          borderRadius: "24px 24px 0 0",
          padding: "12px 0 8px",
        }}>
          <div style={{
            width: 36, height: 4, borderRadius: 2,
            background: "var(--dash-handle)",
            margin: "0 auto 8px",
          }} />
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0 20px 8px",
            borderBottom: "1px solid var(--dash-card-border)",
          }}>
            <h2 style={{ color: "var(--dash-text)", fontSize: 18, fontWeight: 800, margin: 0 }}>{title}</h2>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 10, border: "none", cursor: "pointer",
                background: "rgba(220,38,38,0.12)", color: "#ffffff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 600, transition: "all 0.2s", flexShrink: 0,
              }}
            >✕</button>
          </div>
        </div>
        <div style={{ padding: "16px 20px 32px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Static layout config — defined once at module level ─────────────────────
const GRID_LAYOUTS: Record<string, Array<{ id: string; cols: number; mobileCols: number }>> = {
  // menu: analytics full-width + 2 rows of 4
  menu: [
    { id: "analytics",   cols: 4, mobileCols: 2 },
    { id: "cardapio",    cols: 1, mobileCols: 1 },
    { id: "pedidos",     cols: 1, mobileCols: 1 },
    { id: "financeiro",  cols: 1, mobileCols: 1 },
    { id: "unidade",     cols: 1, mobileCols: 1 },
    { id: "tv",          cols: 1, mobileCols: 1 },
    { id: "config",      cols: 1, mobileCols: 1 },
    { id: "suporte",     cols: 1, mobileCols: 1 },
    { id: "impressoras", cols: 2, mobileCols: 2 },
  ],
  // menupro: analytics full-width + 3 rows of 4
  menupro: [
    { id: "analytics",   cols: 4, mobileCols: 2 },
    { id: "cardapio",    cols: 1, mobileCols: 1 },
    { id: "pedidos",     cols: 1, mobileCols: 1 },
    { id: "financeiro",  cols: 1, mobileCols: 1 },
    { id: "operacoes",   cols: 1, mobileCols: 1 },
    { id: "unidade",     cols: 1, mobileCols: 1 },
    { id: "equipe",      cols: 1, mobileCols: 1 },
    { id: "estoque",     cols: 1, mobileCols: 1 },
    { id: "crm",         cols: 1, mobileCols: 1 },
    { id: "tv",          cols: 1, mobileCols: 1 },
    { id: "suporte",     cols: 1, mobileCols: 1 },
    { id: "config",      cols: 2, mobileCols: 2 },
    { id: "impressoras", cols: 2, mobileCols: 2 },
  ],
  // business: analytics full-width + 4 rows of 4
  business: [
    { id: "analytics",   cols: 4, mobileCols: 2 },
    { id: "cardapio",    cols: 1, mobileCols: 1 },
    { id: "pedidos",     cols: 1, mobileCols: 1 },
    { id: "financeiro",  cols: 1, mobileCols: 1 },
    { id: "operacoes",   cols: 1, mobileCols: 1 },
    { id: "unidade",     cols: 1, mobileCols: 1 },
    { id: "equipe",      cols: 1, mobileCols: 1 },
    { id: "estoque",     cols: 1, mobileCols: 1 },
    { id: "crm",         cols: 1, mobileCols: 1 },
    { id: "whatsapp",    cols: 2, mobileCols: 2 },
    { id: "delivery",    cols: 1, mobileCols: 1 },
    { id: "tv",          cols: 1, mobileCols: 1 },
    { id: "suporte",     cols: 1, mobileCols: 1 },
    { id: "config",      cols: 1, mobileCols: 1 },
    { id: "impressoras", cols: 2, mobileCols: 2 },
  ],
};

// ─── Main Component ──────────────────────────────────────────────────────────
export default function DashboardClient({
  restaurant, unit, profile, categories, products, upsellItems, analytics, tvCount, stockStats, reportData,
}: {
  restaurant: Restaurant; unit: Unit | null; profile: Profile;
  categories: Category[]; products: Product[];
  upsellItems: any[]; analytics: { views: number; clicks: number; orders: number };
  tvCount: number; stockStats: StockStats;
  reportData: ReportData;
}) {
  const router = useRouter();
  const [modal, setModal] = useState<"analytics" | "cardapio" | "pedidos" | "financeiro" | "unidade" | "plano" | "config" | "tv" | "modotv" | "estoque" | "operacoes" | "equipe" | "impressoras" | "links" | "crm" | "whatsapp" | "delivery" | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const open = (m: typeof modal) => setModal(m);
  const close = () => setModal(null);

  const trialDays = Math.max(0, Math.ceil((new Date(restaurant.trial_ends_at).getTime() - Date.now()) / 86400000));
  const [restaurantState, setRestaurantState] = useState<Restaurant>(restaurant);

  // Refresh plan from DB every 5 min so super-admin plan changes propagate
  useEffect(() => {
    const supabase = createClient();
    async function refreshRestaurant() {
      const { data } = await supabase
        .from("restaurants")
        .select("id, name, plan, status, trial_ends_at, whatsapp, instagram, onboarding_completed, free_access")
        .eq("id", restaurant.id)
        .single();
      if (data) setRestaurantState(data as Restaurant);
    }
    const interval = setInterval(refreshRestaurant, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [restaurant.id]);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Unit selector
  const [allUnits, setAllUnits] = useState<any[]>([]);
  const [showUnitSelector, setShowUnitSelector] = useState(false);
  const canAddUnit = allUnits.length < planMaxUnits(restaurantState.plan);

  useEffect(() => {
    async function loadNotifications() {
      const supabase = createClient();
      const notifs: any[] = [];
      const now = new Date();

      // 1. Estoque baixo (menupro + business)
      if (hasPlanFeature(restaurantState.plan, "analytics_ai")) {
        const { data: lowStock } = await supabase
          .from("inventory_items")
          .select("id, name, current_stock, min_stock, unit_measure")
          .eq("unit_id", unit?.id)
          .eq("is_active", true)
          .gt("min_stock", 0);

        for (const item of lowStock || []) {
          if (item.current_stock <= item.min_stock) {
            notifs.push({
              type: "stock_low",
              icon: "📦",
              title: `${item.name} com estoque baixo`,
              desc: `${item.current_stock} ${item.unit_measure} (mín: ${item.min_stock})`,
              color: "var(--dash-danger)",
              priority: 1,
            });
          }
        }
      }

      // 2. Validade (business only)
      if (hasPlanFeature(restaurantState.plan, "estoque_completo")) {
        const { data: expiringItems } = await supabase
          .from("inventory_items")
          .select("id, name, expiry_date, expiry_alert_days")
          .eq("unit_id", unit?.id)
          .eq("is_active", true)
          .not("expiry_date", "is", null);

        for (const item of expiringItems || []) {
          const expiry = new Date(item.expiry_date);
          const diffDays = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          const alertDays = item.expiry_alert_days || 7;
          if (diffDays < 0) {
            notifs.push({ type: "expired", icon: "🔴", title: `${item.name} VENCIDO`, desc: `Venceu há ${Math.abs(diffDays)} dias`, color: "var(--dash-danger)", priority: 0 });
          } else if (diffDays <= alertDays) {
            notifs.push({ type: "expiring", icon: "🟡", title: `${item.name} vencendo`, desc: `Vence em ${diffDays} dia${diffDays !== 1 ? "s" : ""}`, color: "var(--dash-warning)", priority: 2 });
          }
        }
      }

      // 3. Meta diária (business only)
      if (hasPlanFeature(restaurantState.plan, "financeiro_custos") && (unit as any)?.daily_revenue_goal > 0 && now.getHours() >= 18) {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const { data: todayOrders } = await supabase
          .from("order_intents")
          .select("total")
          .eq("unit_id", unit?.id)
          .eq("status", "confirmed")
          .gte("created_at", todayStart);

        const todayRevenue = (todayOrders || []).reduce((s: number, o: any) => s + parseFloat(o.total || "0"), 0);
        const goal = (unit as any).daily_revenue_goal;
        if (todayRevenue < goal) {
          const falta = goal - todayRevenue;
          const fmtVal = goal > 1000 ? `R$ ${(falta / 100).toFixed(2).replace(".", ",")}` : `R$ ${falta.toFixed(2).replace(".", ",")}`;
          notifs.push({ type: "daily_goal", icon: "🎯", title: "Meta diária não atingida", desc: `Faltam ${fmtVal}`, color: "var(--dash-warning)", priority: 3 });
        }
      }

      // 4. Avaliações negativas últimas 24h (menupro + business)
      if (hasPlanFeature(restaurantState.plan, "analytics_ai")) {
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
        const { data: badReviews } = await supabase
          .from("reviews")
          .select("id, restaurant_rating, comment, waiter_name")
          .eq("unit_id", unit?.id)
          .lte("restaurant_rating", 2)
          .gte("created_at", yesterday);

        for (const r of badReviews || []) {
          notifs.push({
            type: "bad_review",
            icon: "⭐",
            title: `Avaliação ${r.restaurant_rating}★`,
            desc: r.comment ? `"${r.comment.slice(0, 50)}..."` : `Garçom: ${r.waiter_name || "N/A"}`,
            color: "var(--dash-danger)",
            priority: 2,
          });
        }
      }

      // 5. Pagamento
      if (restaurantState?.status === "overdue" || restaurantState?.status === "suspended") {
        notifs.push({
          type: "payment",
          icon: "💳",
          title: restaurant.status === "overdue" ? "Pagamento atrasado" : "Conta suspensa",
          desc: "Ative um plano pra manter o cardápio publicado",
          color: "var(--dash-danger)",
          priority: 0,
        });
      }

      notifs.sort((a, b) => a.priority - b.priority);
      setNotifications(notifs);
    }

    if (unit?.id) loadNotifications();
  }, [unit?.id, restaurantState]);

  useEffect(() => {
    if (!showNotifications) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-notifications]")) setShowNotifications(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [showNotifications]);

  // Fetch all units for the restaurant
  useEffect(() => {
    if (!restaurant?.id) return;
    const supabase = createClient();
    supabase
      .from("units")
      .select("id, name, slug, is_published")
      .eq("restaurant_id", restaurant.id)
      .order("name")
      .then(({ data }) => { if (data) setAllUnits(data); });
  }, [restaurant.id]);

  // Close unit selector on outside click
  useEffect(() => {
    if (!showUnitSelector) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-unit-selector]")) setShowUnitSelector(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [showUnitSelector]);

  const CARD_CONFIGS: Record<string, { icon: string; label: string; sub: string | (() => string); modalKey: string }> = useMemo(() => ({
    analytics: { icon: "📊", label: "Analytics", sub: () => `${analytics.views} visitas · ${analytics.clicks} cliques`, modalKey: "analytics" },
    cardapio: { icon: "📋", label: "Cardápio", sub: () => `${products.length} produto${products.length !== 1 ? "s" : ""}`, modalKey: "cardapio" },
    pedidos: { icon: "🛒", label: "Pedidos", sub: () => `${analytics.orders} pedido${analytics.orders !== 1 ? "s" : ""} hoje`, modalKey: "pedidos" },
    financeiro: { icon: "💰", label: "Financeiro", sub: "Relatórios e receita", modalKey: "financeiro" },
    unidade: { icon: "📍", label: "Unidade", sub: () => unit?.is_published ? "Publicado" : "Não publicado", modalKey: "unidade" },
    tv: { icon: "📺", label: "Modo TV", sub: () => `${tvCount} vídeo${tvCount !== 1 ? "s" : ""} ativo${tvCount !== 1 ? "s" : ""}`, modalKey: "modotv" },
    plano: { icon: "⭐", label: "Plano", sub: () => restaurantState.status === "trial" ? `Trial · ${trialDays}d` : (restaurantState.status === "active" || restaurantState.free_access) ? planLabel(restaurantState.plan) : "Nenhum plano ativo", modalKey: "plano" },
    config: { icon: "⚙️", label: "Configurações", sub: () => `Perfil · ${planLabel(restaurantState.plan)} · Segurança`, modalKey: "config" },
    estoque: { icon: "📦", label: "Estoque", sub: () => stockStats.out > 0 ? `${stockStats.out} esgotado${stockStats.out !== 1 ? "s" : ""}` : stockStats.low > 0 ? `${stockStats.low} baixo${stockStats.low !== 1 ? "s" : ""}` : "Tudo em ordem", modalKey: "estoque" },
    operacoes: { icon: "🎛️", label: "Operações", sub: "Cozinha · Garçom · Andamento", modalKey: "operacoes" },
    equipe: { icon: "👥", label: "Equipe", sub: "Funcionários · Avaliações", modalKey: "equipe" },
    impressoras: { icon: "🖨️", label: "Impressoras", sub: "Roteamento por categoria", modalKey: "impressoras" },
    links: { icon: "🔗", label: "Links Rápidos", sub: "Acessos do sistema", modalKey: "links" },
    crm: { icon: "📇", label: "CRM", sub: "Clientes e contatos", modalKey: "crm" },
    whatsapp: { icon: "💬", label: "WhatsApp", sub: "Mensagens e notificações", modalKey: "whatsapp" },
    delivery: { icon: "🚚", label: "Delivery", sub: "Taxas de entrega por distância", modalKey: "delivery" },
    suporte: { icon: "🎧", label: "Suporte", sub: "Chat com nossa equipe", modalKey: "suporte" },
  }), [analytics, products.length, unit?.is_published, tvCount, restaurantState, trialDays, stockStats]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: var(--dash-bg); }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.5 } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
        .card { transition: transform 0.25s cubic-bezier(0.16,1,0.3,1), background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease; }
        .card:active { transform: scale(0.97) !important; }
        .dark .card:hover { background: rgba(0,255,174,0.03) !important; border-color: rgba(0,255,174,0.15) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.25) !important; transform: translateY(-2px) !important; }
        html:not(.dark) .card:hover { background: rgba(0,179,126,0.02) !important; border-color: rgba(0,179,126,0.15) !important; box-shadow: 0 4px 20px rgba(0,0,0,0.1) !important; transform: translateY(-2px) !important; }
        .dash-dots {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background-size: 22px 22px;
          opacity: 0.9;
        }
        .dark .dash-dots {
          background-image: radial-gradient(rgba(0,255,174,0.25) 1.2px, transparent 1.2px);
          filter: drop-shadow(0 0 4px rgba(0,255,174,0.3));
        }
        html:not(.dark) .dash-dots {
          background-image: radial-gradient(rgba(213,22,89,0.12) 1.2px, transparent 1.2px);
          filter: drop-shadow(0 0 3px rgba(213,22,89,0.15));
        }
        .dash-gradient-text {
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          width: fit-content;
        }
        .dark .dash-gradient-text {
          background: linear-gradient(135deg, #00ffae 0%, #00d9ff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        html:not(.dark) .dash-gradient-text {
          background: linear-gradient(135deg, #d51659 0%, #fe4a2c 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .dark .modal-backdrop {
          background: rgba(0,0,0,0.15) !important;
        }
        html:not(.dark) .modal-backdrop {
          background: rgba(0,0,0,0.08) !important;
        }
        .dark .modal-sheet {
          background: rgba(10,10,10,0.25) !important;
          border-color: rgba(0,255,174,0.08) !important;
          box-shadow: 0 -4px 40px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.03) !important;
        }
        /* ── Light Theme Text Overrides ── */
        html:not(.dark) .card {
          color: #1a1a1a !important;
        }
        html:not(.dark) .card .dash-gradient-text ~ div,
        html:not(.dark) .card .dash-gradient-text ~ span {
          color: rgba(26,26,26,0.55) !important;
        }
        html:not(.dark) .modal-sheet {
          background: rgba(255,255,255,0.3) !important;
          border-color: rgba(213,22,89,0.06) !important;
          box-shadow: 0 -4px 40px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.3) !important;
          color: #1a1a1a !important;
        }
        html:not(.dark) .modal-sheet input {
          color: #1a1a1a !important;
          background: rgba(0,0,0,0.03) !important;
          border-color: rgba(213,22,89,0.1) !important;
        }
        html:not(.dark) .modal-sheet input::placeholder {
          color: rgba(26,26,26,0.3) !important;
        }
        html:not(.dark) .modal-sheet textarea {
          color: #1a1a1a !important;
          background: rgba(0,0,0,0.03) !important;
          border-color: rgba(213,22,89,0.1) !important;
        }
        html:not(.dark) .modal-sheet textarea::placeholder {
          color: rgba(26,26,26,0.3) !important;
        }
        html:not(.dark) .modal-sheet select {
          color: #1a1a1a !important;
          background: rgba(0,0,0,0.03) !important;
          border-color: rgba(213,22,89,0.1) !important;
        }
        html:not(.dark) .modal-neon-card {
          color: #1a1a1a !important;
        }
        html:not(.dark) .modal-sheet .cat-header-arrow {
          color: rgba(26,26,26,0.4) !important;
        }
        html:not(.dark) .modal-sheet input[name="name"] {
          color: #1a1a1a !important;
          border-color: rgba(213,22,89,0.1) !important;
          background: rgba(0,0,0,0.03) !important;
        }
        html:not(.dark) .modal-sheet .delete-btn {
          background: rgba(213,22,89,0.06) !important;
          border-color: rgba(213,22,89,0.12) !important;
        }
        html:not(.dark) .modal-sheet .btn-ai {
          color: #e8dff5 !important;
        }
        html:not(.dark) .modal-sheet a {
          color: rgba(26,26,26,0.6) !important;
          border-color: rgba(213,22,89,0.1) !important;
        }
        html:not(.dark) .modal-sheet a:hover {
          color: #d51659 !important;
          border-color: rgba(213,22,89,0.2) !important;
        }
        html:not(.dark) .modal-sheet button[aria-label],
        html:not(.dark) .modal-close-btn {
          background: rgba(0,0,0,0.04) !important;
          color: rgba(26,26,26,0.5) !important;
          border-color: rgba(213,22,89,0.08) !important;
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--dash-scrollbar); border-radius: 4px; }
        input, textarea, select { outline: none; font-family: inherit; }
        input::placeholder, textarea::placeholder { color: var(--dash-placeholder); }
        .delete-btn {
          position: relative;
          width: 30px;
          height: 30px;
          flex-shrink: 0;
          border: none;
          background: rgba(255, 80, 80, 0.12);
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.3s, transform 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .delete-btn:hover {
          background: rgb(211, 21, 21);
          transform: scale(1.05);
        }
        .delete-btn:active {
          background: rgb(130, 0, 0);
          transform: scale(0.95);
        }
        .delete-btn .x-line {
          position: absolute;
          width: 16px;
          height: 1.5px;
          background-color: #f87171;
          transition: background-color 0.3s;
        }
        .delete-btn:hover .x-line {
          background-color: #fff;
        }
        .delete-btn .x-line:first-child {
          transform: rotate(45deg);
        }
        .delete-btn .x-line:last-child {
          transform: rotate(-45deg);
        }
        .btn-gradient {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 700;
          color: #000;
          font-family: inherit;
          background: linear-gradient(145deg, #00ffae 0%, #00d9ff 50%, #00ffae 100%);
          background-size: 200% 200%;
          box-shadow: 0 3px 12px rgba(0,255,174,0.25), inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -2px 0 rgba(0,0,0,0.08);
          transition: all 0.25s ease;
          transform: translateY(0);
          overflow: hidden;
        }
        .btn-gradient:hover {
          background-position: 100% 50%;
          box-shadow: 0 5px 20px rgba(0,255,174,0.4), inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.06);
          transform: translateY(-1px);
        }
        .btn-gradient:active {
          transform: translateY(1px);
          box-shadow: 0 1px 4px rgba(0,255,174,0.15), inset 0 2px 4px rgba(0,0,0,0.12);
        }
        html:not(.dark) .btn-gradient {
          background: linear-gradient(145deg, #d51659 0%, #fe4a2c 50%, #d51659 100%) !important;
          background-size: 200% 200% !important;
          color: #fff !important;
          box-shadow: 0 3px 12px rgba(213,22,89,0.2), inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -2px 0 rgba(0,0,0,0.08) !important;
        }
        html:not(.dark) .btn-gradient:hover {
          box-shadow: 0 5px 20px rgba(213,22,89,0.35), inset 0 1px 0 rgba(255,255,255,0.25) !important;
        }
        .btn-ai {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px 18px;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 700;
          color: #e8dff5;
          text-decoration: none;
          background: linear-gradient(145deg, #7c3aed 0%, #5b21b6 40%, #4c1d95 100%);
          box-shadow: 0 4px 14px rgba(124,58,237,0.3), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -2px 0 rgba(0,0,0,0.2);
          transition: all 0.2s ease;
          transform: translateY(0);
        }
        .btn-ai:hover {
          background: linear-gradient(145deg, #8b5cf6 0%, #6d28d9 40%, #5b21b6 100%);
          box-shadow: 0 6px 20px rgba(139,92,246,0.4), inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -2px 0 rgba(0,0,0,0.15);
          transform: translateY(-1px);
          color: #fff;
        }
        .btn-ai:active {
          background: linear-gradient(145deg, #4c1d95 0%, #3b0f7a 40%, #2e0a63 100%);
          box-shadow: 0 1px 4px rgba(124,58,237,0.15), inset 0 2px 6px rgba(0,0,0,0.3);
          transform: translateY(1px);
          color: #d4c4f0;
        }
        .type-toggle-container {
          display: flex;
          gap: 0;
          padding: 3px;
          background: rgba(255,255,255,0.04);
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.08);
          position: relative;
        }
        .type-toggle-btn {
          flex: 1;
          padding: 9px 0;
          border-radius: 10px;
          border: none;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          position: relative;
          z-index: 1;
          transition: color 0.3s ease, text-shadow 0.3s ease;
          background: transparent;
        }
        .type-toggle-btn[data-active="true"] {
          color: #fff;
          text-shadow: 0 1px 2px rgba(0,0,0,0.2);
        }
        .type-toggle-btn[data-active="false"] {
          color: rgba(255,255,255,0.45);
        }
        .type-toggle-btn[data-active="false"]:hover {
          color: rgba(255,255,255,0.7);
        }
        .type-toggle-slider {
          position: absolute;
          top: 3px;
          height: calc(100% - 6px);
          width: calc(50% - 3px);
          border-radius: 10px;
          transition: left 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.3s ease;
          z-index: 0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.15);
        }
        .type-toggle-slider[data-type="food"] {
          left: 3px;
          background: linear-gradient(145deg, #00c98a 0%, #00805a 50%, #005f3f 100%);
        }
        .type-toggle-slider[data-type="drink"] {
          left: calc(50%);
          background: linear-gradient(145deg, #7c3aed 0%, #5b21b6 50%, #4c1d95 100%);
        }
        html:not(.dark) .type-toggle-slider[data-type="food"] {
          background: linear-gradient(145deg, #d51659 0%, #fe4a2c 50%, #d51659 100%);
        }
        html:not(.dark) .type-toggle-slider[data-type="drink"] {
          background: linear-gradient(145deg, #7c3aed 0%, #5b21b6 50%, #4c1d95 100%);
        }
        .switch-toggle {
          --sw-w: 36px;
          --sw-h: 20px;
          --sw-bg: rgb(131, 131, 131);
          --sw-checked-bg: rgb(0, 218, 80);
          --sw-offset: 2px;
          --circle-d: 16px;
          --sw-transition: all .2s cubic-bezier(0.27, 0.2, 0.25, 1.51);
          display: inline-block;
          cursor: pointer;
        }
        .switch-toggle input { display: none; }
        .switch-toggle .sw-slider {
          box-sizing: border-box;
          width: var(--sw-w);
          height: var(--sw-h);
          background: var(--sw-bg);
          border-radius: 999px;
          display: flex;
          align-items: center;
          position: relative;
          transition: var(--sw-transition);
          cursor: pointer;
        }
        .switch-toggle .sw-circle {
          width: var(--circle-d);
          height: var(--circle-d);
          background: #fff;
          border-radius: inherit;
          box-shadow: 1px 1px 2px rgba(146,146,146,0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: var(--sw-transition);
          z-index: 1;
          position: absolute;
          left: var(--sw-offset);
        }
        .switch-toggle .sw-check {
          width: 10px;
          color: var(--sw-checked-bg);
          transform: scale(0);
          transition: var(--sw-transition);
          position: absolute;
        }
        .switch-toggle .sw-cross {
          width: 6px;
          color: var(--sw-bg);
          transition: var(--sw-transition);
          position: absolute;
        }
        .switch-toggle .sw-slider::before {
          content: "";
          position: absolute;
          width: 9px;
          height: 3px;
          left: calc(var(--sw-offset) + 4px);
          background: #fff;
          border-radius: 1px;
          transition: var(--sw-transition);
        }
        .switch-toggle input:checked + .sw-slider {
          background: var(--sw-checked-bg);
        }
        .switch-toggle input:checked + .sw-slider .sw-check {
          transform: scale(1);
        }
        .switch-toggle input:checked + .sw-slider .sw-cross {
          transform: scale(0);
        }
        .switch-toggle input:checked + .sw-slider::before {
          left: calc(100% - 9px - 4px - var(--sw-offset));
        }
        .switch-toggle input:checked + .sw-slider .sw-circle {
          left: calc(100% - var(--circle-d) - var(--sw-offset));
          box-shadow: -1px 1px 2px rgba(163,163,163,0.45);
        }
        html:not(.dark) .switch-toggle .sw-slider { --sw-checked-bg: var(--dash-accent); }
        .ios-checkbox {
          position: relative;
          display: inline-block;
          cursor: pointer;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }
        .ios-checkbox input {
          display: none;
        }
        .ios-checkbox .cb-wrap {
          position: relative;
          width: 24px;
          height: 24px;
          border-radius: 7px;
          transition: transform 0.2s ease;
        }
        .ios-checkbox .cb-bg {
          position: absolute;
          inset: 0;
          border-radius: 7px;
          border: 2px solid rgba(255,255,255,0.2);
          background: rgba(255,255,255,0.06);
          transition: all 0.2s ease;
        }
        .ios-checkbox .cb-icon {
          position: absolute;
          inset: 0;
          margin: auto;
          width: 80%;
          height: 80%;
          color: white;
          transform: scale(0);
          transition: all 0.2s ease;
        }
        .ios-checkbox .cb-icon .check-path {
          stroke-dasharray: 40;
          stroke-dashoffset: 40;
          transition: stroke-dashoffset 0.3s ease 0.1s;
        }
        .ios-checkbox input:checked + .cb-wrap .cb-bg {
          background: #ef4444;
          border-color: #ef4444;
        }
        .ios-checkbox input:checked + .cb-wrap .cb-icon {
          transform: scale(1);
        }
        .ios-checkbox input:checked + .cb-wrap .check-path {
          stroke-dashoffset: 0;
        }
        .ios-checkbox:hover .cb-wrap {
          transform: scale(1.05);
        }
        .ios-checkbox:active .cb-wrap {
          transform: scale(0.95);
        }
        .ios-checkbox input:checked + .cb-wrap {
          animation: cb-bounce 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes cb-bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        .btn-ai-sparkle {
          --sz: 32px;
          position: relative;
          width: var(--sz);
          height: var(--sz);
          border: none;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(45deg, #efad21, #ffd60f);
          box-shadow: rgba(60,64,67,0.3) 0 1px 2px 0, rgba(60,64,67,0.15) 0 2px 6px 2px, rgba(0,0,0,0.3) 0 12px 24px -12px, rgba(52,52,52,0.35) 0 -2px 6px 0 inset;
          transition: transform 0.2s;
        }
        .btn-ai-sparkle:active {
          transform: scale(0.92);
        }
        .btn-ai-sparkle:hover {
          box-shadow: rgba(60,64,67,0.3) 0 1px 2px 0, rgba(60,64,67,0.15) 0 2px 6px 2px, rgba(0,0,0,0.4) 0 16px 32px -12px, rgba(52,52,52,0.35) 0 -2px 6px 0 inset;
        }
        .btn-ai-sparkle .sparkle-svg {
          width: 18px;
          height: 18px;
          color: #ffea50;
          transition: all 0.3s;
          animation: sparkle-pulse 2s ease-in-out infinite;
        }
        .btn-ai-sparkle:hover .sparkle-svg {
          color: #fff;
          width: 22px;
          height: 22px;
        }
        .btn-ai-sparkle .ai-label {
          position: absolute;
          font-size: 9px;
          font-weight: 900;
          color: #fff;
          opacity: 1;
          transition: opacity 0.2s;
          bottom: 2px;
          right: 3px;
          text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }
        .btn-ai-sparkle:hover .ai-label {
          opacity: 0;
        }
        @keyframes sparkle-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        .btn-ai-sparkle:disabled {
          opacity: 0.5;
          cursor: wait;
          transform: none;
        }
        .btn-ai-mini {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 5px 10px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 700;
          color: #fff;
          background: linear-gradient(145deg, #d4a017 0%, #b8860b 50%, #8b6914 100%);
          box-shadow: 0 2px 8px rgba(212,160,23,0.3), inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.15);
          transition: all 0.2s ease;
          transform: translateY(0);
        }
        .btn-ai-mini:hover {
          background: linear-gradient(145deg, #e6b422 0%, #c9960f 50%, #a07818 100%);
          box-shadow: 0 3px 12px rgba(212,160,23,0.4), inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.1);
          transform: translateY(-1px);
        }
        .btn-ai-mini:active {
          background: linear-gradient(145deg, #8b6914 0%, #705510 50%, #5a440c 100%);
          box-shadow: 0 1px 3px rgba(212,160,23,0.15), inset 0 2px 4px rgba(0,0,0,0.25);
          transform: translateY(1px);
        }
        .btn-ai-mini:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        .cat-dropdown-content {
          display: grid;
          transition: grid-template-rows 350ms ease, opacity 250ms ease;
        }
        .cat-dropdown-content[data-open="true"] {
          grid-template-rows: 1fr;
          opacity: 1;
        }
        .cat-dropdown-content[data-open="false"] {
          grid-template-rows: 0fr;
          opacity: 0;
          pointer-events: none;
        }
        .cat-dropdown-content > div {
          overflow: hidden;
        }
        .cat-header-arrow {
          transition: transform 350ms ease;
          display: inline-block;
        }
        .cat-header-arrow[data-open="true"] {
          transform: rotate(180deg);
        }
        .cat-header-arrow[data-open="false"] {
          transform: rotate(0deg);
        }
        .dark .modal-neon-card {
          border: 1px solid rgba(0,255,174,0.08) !important;
          box-shadow: 0 0 10px rgba(0,255,174,0.03), inset 0 1px 0 rgba(255,255,255,0.02);
          transition: border-color 0.3s ease, box-shadow 0.3s ease;
          background: rgba(255,255,255,0.02) !important;
          backdrop-filter: blur(60px);
          -webkit-backdrop-filter: blur(60px);
        }
        .dark .modal-neon-card:hover {
          border-color: rgba(0,255,174,0.15) !important;
          box-shadow: 0 0 18px rgba(0,255,174,0.06), inset 0 1px 0 rgba(255,255,255,0.04);
        }
        html:not(.dark) .modal-neon-card {
          border: 1px solid rgba(213,22,89,0.06) !important;
          box-shadow: 0 0 10px rgba(213,22,89,0.02), inset 0 1px 0 rgba(0,0,0,0.01);
          transition: border-color 0.3s ease, box-shadow 0.3s ease;
          background: rgba(0,0,0,0.01) !important;
          backdrop-filter: blur(60px);
          -webkit-backdrop-filter: blur(60px);
        }
        html:not(.dark) .modal-neon-card:hover {
          border-color: rgba(213,22,89,0.12) !important;
          box-shadow: 0 0 18px rgba(213,22,89,0.04), inset 0 1px 0 rgba(0,0,0,0.02);
        }
        .dash-shine {
          background: linear-gradient(to right, var(--dash-text-muted) 0%, var(--dash-text) 10%, var(--dash-text-muted) 20%);
          background-position: 0;
          background-size: 200px;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: dashShine 3s infinite linear;
        }
        @keyframes dashShine {
          0% { background-position: 0; }
          60% { background-position: 200px; }
          100% { background-position: 200px; }
        }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "var(--dash-bg-gradient)",
        fontFamily: "'Montserrat', -apple-system, 'SF Pro Display', BlinkMacSystemFont, sans-serif",
        padding: "env(safe-area-inset-top, 0) 0 env(safe-area-inset-bottom, 0)",
        position: "relative",
      }}>
        <div className="dash-dots" />

        {/* Header */}
        <div style={{ padding: "56px 24px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {unit?.logo_url ? (
                <img src={unit.logo_url} alt="" style={{ width: 36, height: 36, borderRadius: 10, objectFit: "cover" }} />
              ) : (
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--dash-accent-soft)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🍽</div>
              )}
              <div>
                {/* Unit selector dropdown */}
                <div style={{ position: "relative" }} data-unit-selector>
                  <button
                    onClick={() => allUnits.length > 1 && setShowUnitSelector((v) => !v)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      background: "transparent", border: "none", cursor: allUnits.length > 1 ? "pointer" : "default",
                      padding: 0,
                    }}
                  >
                    <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.5px", lineHeight: 1.1, color: "var(--dash-text)" }}>
                      {unit?.name ?? restaurant.name}
                    </span>
                    {allUnits.length > 1 && (
                      <span style={{
                        fontSize: 9, color: "var(--dash-text-muted)",
                        display: "inline-block",
                        transform: showUnitSelector ? "rotate(180deg)" : "none",
                        transition: "transform 0.2s",
                        marginTop: 2,
                      }}>▼</span>
                    )}
                  </button>
                  <div style={{ color: "var(--dash-text-muted)", fontSize: 12 }}>
                    {unit?.is_published ? "● Publicado" : "○ Não publicado"}
                  </div>

                  {showUnitSelector && allUnits.length > 1 && (
                    <div style={{
                      position: "absolute", top: 48, left: 0,
                      minWidth: 230, borderRadius: 14,
                      background: "var(--dash-surface, rgba(12,12,12,0.97))",
                      border: "1px solid var(--dash-border)",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
                      zIndex: 9999, overflow: "hidden",
                      animation: "fadeIn 0.15s ease",
                    }}>
                      <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--dash-border)" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--dash-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Suas unidades</span>
                      </div>
                      {allUnits.map((u) => (
                        <button key={u.id} onClick={() => {
                          localStorage.setItem("fy_active_unit_id", u.id);
                          window.location.href = `/painel?unit_id=${u.id}`;
                        }} style={{
                          display: "flex", alignItems: "center", gap: 10,
                          width: "100%", padding: "11px 14px",
                          background: u.id === unit?.id ? "var(--dash-accent-soft)" : "transparent",
                          border: "none", cursor: "pointer",
                          borderBottom: "1px solid var(--dash-border)",
                          transition: "background 0.15s",
                          textAlign: "left",
                        }}
                          onMouseEnter={(e) => { if (u.id !== unit?.id) e.currentTarget.style.background = "var(--dash-card-hover)"; }}
                          onMouseLeave={(e) => { if (u.id !== unit?.id) e.currentTarget.style.background = "transparent"; }}
                        >
                          <div style={{
                            width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                            background: u.is_published ? "var(--dash-accent)" : "var(--dash-text-muted)",
                          }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ color: u.id === unit?.id ? "var(--dash-accent)" : "var(--dash-text)", fontSize: 13, fontWeight: 600 }}>{u.name}</div>
                            <div style={{ color: "var(--dash-text-muted)", fontSize: 10 }}>/{u.slug}</div>
                          </div>
                          {u.id === unit?.id && (
                            <span style={{ color: "var(--dash-accent)", fontSize: 12, flexShrink: 0 }}>✓</span>
                          )}
                        </button>
                      ))}
                      <button onClick={() => {
                        setShowUnitSelector(false);
                        open("unidade");
                      }} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        width: "100%", padding: "11px 14px",
                        background: "transparent", border: "none", cursor: "pointer",
                        color: "var(--dash-text-muted)", fontSize: 12,
                      }}>
                        <span>+</span> Nova unidade
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* Links Rápidos */}
            <button onClick={() => open("links")} style={{
              width: 36, height: 36, borderRadius: 12,
              background: "var(--dash-card)",
              border: "1px solid var(--dash-border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, cursor: "pointer", color: "var(--dash-text-muted)",
              boxShadow: "var(--dash-shadow)",
            }}>🔗</button>
            {/* Notificações */}
            <div style={{ position: "relative" }} data-notifications>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                style={{
                  width: 36, height: 36, borderRadius: 12,
                  background: notifications.length > 0 ? "var(--dash-danger-soft)" : "var(--dash-card)",
                  border: "1px solid var(--dash-border)", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, position: "relative",
                }}
              >
                🔔
                {notifications.length > 0 && (
                  <div style={{
                    position: "absolute", top: -2, right: -2,
                    width: 18, height: 18, borderRadius: "50%",
                    background: "var(--dash-danger)", color: "#fff",
                    fontSize: 10, fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {notifications.length > 9 ? "9+" : notifications.length}
                  </div>
                )}
              </button>

              {showNotifications && (
                <div style={{
                  position: "absolute", top: 44, right: 0,
                  width: 320, maxHeight: 400,
                  borderRadius: 18, overflow: "hidden",
                  background: "var(--dash-modal-bg)",
                  border: "1px solid var(--dash-border)",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
                  zIndex: 9999,
                }}>
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "14px 16px", borderBottom: "1px solid var(--dash-section-border)",
                  }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: "var(--dash-text)" }}>Notificações</span>
                    <button onClick={() => setShowNotifications(false)} style={{
                      width: 28, height: 28, borderRadius: 8, border: "none", cursor: "pointer",
                      background: "rgba(220,38,38,0.12)", color: "#ffffff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, transition: "all 0.2s", flexShrink: 0,
                    }}>✕</button>
                  </div>

                  <div style={{ maxHeight: 340, overflowY: "auto", padding: "8px" }}>
                    {notifications.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "30px 0", color: "var(--dash-text-muted)", fontSize: 12 }}>
                        Tudo em ordem! Nenhuma notificação.
                      </div>
                    ) : (
                      notifications.map((n, i) => (
                        <div key={i} style={{
                          display: "flex", gap: 10, padding: "10px 12px",
                          borderRadius: 12, marginBottom: 4,
                          background: "var(--dash-card-subtle)",
                          cursor: "pointer",
                          transition: "background 0.2s",
                        }}
                          onClick={() => {
                            if (n.type === "stock_low" || n.type === "expired" || n.type === "expiring") open("estoque");
                            else if (n.type === "daily_goal") open("financeiro");
                            else if (n.type === "bad_review") open("analytics");
                            else if (n.type === "payment") open("plano");
                            setShowNotifications(false);
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--dash-card)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "var(--dash-card-subtle)"; }}
                        >
                          <span style={{ fontSize: 18, flexShrink: 0 }}>{n.icon}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ color: n.color, fontSize: 12, fontWeight: 700 }}>{n.title}</div>
                            <div style={{ color: "var(--dash-text-muted)", fontSize: 10, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.desc}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <ThemeToggle />
            {unit && (
              <a href={`/delivery/${unit.slug}`} target="_blank" rel="noreferrer" style={{
                padding: "8px 14px", borderRadius: 12,
                background: "var(--dash-link-bg)",
                border: "1px solid var(--dash-btn-border)",
                boxShadow: isDark ? "inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -2px 0 rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.15)" : "inset 0 1px 0 rgba(255,255,255,0.8), inset 0 -1px 0 rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.08)",
                color: "var(--dash-text-secondary)", fontSize: 13, fontWeight: 600, textDecoration: "none",
              }}>Ver cardápio ↗</a>
            )}
          </div>
        </div>

        {/* Trial banner */}
        {restaurant.status === "trial" && trialDays <= 5 && (
          <div style={{ margin: "12px 24px", padding: "12px 16px", borderRadius: 14, background: "rgba(255,180,0,0.08)", border: "1px solid rgba(255,180,0,0.2)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ color: "var(--dash-warning)", fontSize: 13, fontWeight: 600 }}>
              ⏳ {trialDays} dia{trialDays !== 1 ? "s" : ""} de trial restante{trialDays !== 1 ? "s" : ""}
            </div>
            <button onClick={() => open("plano")} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "rgba(255,180,0,0.2)", color: "var(--dash-warning)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Ver planos</button>
          </div>
        )}

        {/* Offline banner: sem assinatura ativa */}
        {restaurant.status !== "active" && restaurant.status !== "trial" && !restaurant.free_access && (
          <div style={{ margin: "12px 24px", padding: "12px 16px", borderRadius: 14, background: "rgba(255,80,80,0.06)", border: "1px solid rgba(255,80,80,0.18)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ color: "var(--dash-danger)", fontSize: 13, fontWeight: 600 }}>
              🔒 Seu cardápio está offline. Assine um plano para publicar.
            </div>
            <button onClick={() => router.push("/painel/planos")} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "var(--dash-danger-soft)", color: "var(--dash-danger)", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>Ver planos</button>
          </div>
        )}

        {/* Grid principal */}
        {(() => {
          const currentPlan = restaurant.plan ?? "menu";
          const layout = GRID_LAYOUTS[currentPlan] ?? GRID_LAYOUTS.menu;
          const gridCols = isMobile ? 2 : 4;

          // Icon container color per card category
          const ICON_COLORS: Record<string, string> = {
            cardapio:    "var(--dash-accent-soft)",
            pedidos:     "var(--dash-accent-soft)",
            financeiro:  "var(--dash-warning-soft)",
            operacoes:   "var(--dash-info-soft)",
            unidade:     "var(--dash-danger-soft)",
            equipe:      "var(--dash-purple-soft)",
            estoque:     "var(--dash-purple-soft)",
            crm:         "rgba(0,217,255,0.08)",
            whatsapp:    "rgba(37,211,102,0.08)",
            tv:          "var(--dash-card-hover)",
            plano:       "var(--dash-warning-soft)",
            config:      "var(--dash-card-hover)",
            impressoras: "var(--dash-card-hover)",
            suporte:     "rgba(0,255,174,0.08)",
          };

          const baseCard: React.CSSProperties = {
            borderRadius: 18,
            padding: "18px",
            background: "var(--dash-card)",
            border: "1px solid var(--dash-border)",
            boxShadow: "var(--dash-shadow)",
            backdropFilter: "blur(60px)",
            WebkitBackdropFilter: "blur(60px)",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            position: "relative",
            overflow: "hidden",
            transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          };

          const IconBox = ({ id, bg }: { id: string; bg?: string }) => (
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: bg ?? ICON_COLORS[id] ?? "var(--dash-card-hover)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, marginBottom: 8, flexShrink: 0,
            }}>{CARD_CONFIGS[id]?.icon}</div>
          );

          return (
            <div style={{
              padding: "12px 16px 100px",
              display: "grid",
              gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
              gap: 12,
            }}>
              {layout.map((item) => {
                const config = CARD_CONFIGS[item.id];
                if (!config) return null;
                const colSpan = isMobile ? item.mobileCols : item.cols;
                const subText = typeof config.sub === "function" ? config.sub() : config.sub;

                // ── Analytics — hero full-width card ──────────────────────
                if (item.id === "analytics") {
                  return (
                    <div key="analytics" className="card" onClick={() => open("analytics")} style={{
                      ...baseCard,
                      gridColumn: "1 / -1",
                      padding: "20px 24px",
                      borderRadius: 20,
                      background: "linear-gradient(135deg, var(--dash-card) 0%, var(--dash-accent-soft) 400%)",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--dash-text-muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>Últimos 7 dias</div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--dash-text)" }}>Analytics</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{
                            padding: "3px 10px", borderRadius: 6,
                            background: restaurant?.plan === "business" ? "var(--dash-warning-soft)"
                              : restaurant?.plan === "menupro" ? "rgba(0,217,255,0.08)"
                              : "var(--dash-accent-soft)",
                            color: restaurant?.plan === "business" ? "var(--dash-warning)"
                              : restaurant?.plan === "menupro" ? "#00d9ff"
                              : "var(--dash-accent)",
                            fontSize: 10, fontWeight: 700, textTransform: "capitalize" as const,
                          }}>
                            {restaurant?.plan === "menu" ? "Menu" : restaurant?.plan === "menupro" ? "MenuPro" : restaurant?.plan === "business" ? "Business" : restaurant?.plan}
                          </span>
                          <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--dash-accent-soft)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📊</div>
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                        {[
                          { label: "Visitas", value: analytics.views },
                          { label: "Cliques", value: analytics.clicks },
                          { label: "Pedidos", value: analytics.orders },
                        ].map((stat) => (
                          <div key={stat.label} style={{ textAlign: "center", padding: "12px 8px", borderRadius: 12, background: "var(--dash-card)" }}>
                            <div style={{ color: "var(--dash-accent)", fontSize: 26, fontWeight: 900, lineHeight: 1 }}>{stat.value}</div>
                            <div style={{ color: "var(--dash-text-muted)", fontSize: 11, marginTop: 4 }}>{stat.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                // ── Operações — Realtime badge ────────────────────────────
                if (item.id === "operacoes") {
                  return (
                    <div key="operacoes" className="card" onClick={() => open("operacoes")} style={{
                      ...baseCard,
                      gridColumn: `span ${colSpan}`,
                      background: "linear-gradient(135deg, var(--dash-card) 0%, rgba(96,165,250,0.04) 100%)",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <IconBox id="operacoes" />
                        <span style={{ display: "inline-flex", padding: "3px 8px", borderRadius: 6, background: "var(--dash-accent-soft)", color: "var(--dash-accent)", fontSize: 9, fontWeight: 700 }}>● Realtime</span>
                      </div>
                      <div style={{ color: "var(--dash-text)", fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>Operações</div>
                      <div style={{ color: "var(--dash-text-secondary)", fontSize: 12, lineHeight: 1.3 }}>Cozinha · Garçom · Andamento</div>
                    </div>
                  );
                }

                // ── Unidade — published status dot ───────────────────────
                if (item.id === "unidade") {
                  return (
                    <div key="unidade" className="card" onClick={() => open("unidade")} style={{ ...baseCard, gridColumn: `span ${colSpan}` }}>
                      <IconBox id="unidade" />
                      <div style={{ color: "var(--dash-text)", fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>Unidade</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: unit?.is_published ? "var(--dash-accent)" : "var(--dash-text-subtle)", display: "inline-block", animation: unit?.is_published ? "pulse 2s infinite" : "none", flexShrink: 0 }} />
                        <span style={{ color: unit?.is_published ? "var(--dash-accent)" : "var(--dash-text-muted)", fontSize: 12 }}>{unit?.is_published ? "Publicado" : "Não publicado"}</span>
                      </div>
                    </div>
                  );
                }

                // ── Estoque — alert state ─────────────────────────────────
                if (item.id === "estoque") {
                  const hasOut = stockStats.out > 0;
                  const hasLow = !hasOut && stockStats.low > 0;
                  return (
                    <div key="estoque" className="card" onClick={() => open("estoque")} style={{
                      ...baseCard,
                      gridColumn: `span ${colSpan}`,
                      background: hasOut ? "var(--dash-danger-soft)" : hasLow ? "var(--dash-warning-soft)" : "var(--dash-card)",
                      border: hasOut ? "1px solid rgba(248,113,113,0.15)" : hasLow ? "1px solid rgba(251,191,36,0.15)" : "1px solid var(--dash-border)",
                    }}>
                      <IconBox id="estoque" />
                      <div style={{ color: "var(--dash-text)", fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>Estoque</div>
                      <div style={{ fontSize: 12 }}>
                        {hasOut && <span style={{ color: "var(--dash-danger)" }}>{stockStats.out} esgotado{stockStats.out !== 1 ? "s" : ""}</span>}
                        {hasLow && <span style={{ color: "var(--dash-warning)" }}>{stockStats.low} baixo{stockStats.low !== 1 ? "s" : ""}</span>}
                        {!hasOut && !hasLow && <span style={{ color: "var(--dash-text-secondary)" }}>Tudo em ordem</span>}
                      </div>
                    </div>
                  );
                }

                // ── WhatsApp — Business only ──────────────────────────────
                if (item.id === "whatsapp") {
                  return (
                    <div key="whatsapp" className="card" onClick={() => open("whatsapp")} style={{
                      ...baseCard, gridColumn: `span ${colSpan}`,
                      background: "linear-gradient(135deg, var(--dash-card) 0%, rgba(37,211,102,0.04) 100%)",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 12,
                          background: "rgba(37,211,102,0.12)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          marginBottom: 8, flexShrink: 0,
                        }}>
                          <svg viewBox="0 0 24 24" width="22" height="22" fill="#25D366">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                        </div>
                        <span style={{ display: "inline-flex", padding: "3px 8px", borderRadius: 6, background: "rgba(37,211,102,0.12)", color: "#25D366", fontSize: 9, fontWeight: 700 }}>Business</span>
                      </div>
                      <div style={{ color: "var(--dash-text)", fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>WhatsApp</div>
                      <div style={{ color: "var(--dash-text-secondary)", fontSize: 12, lineHeight: 1.3 }}>Mensagens e notificações</div>
                    </div>
                  );
                }

                // ── Suporte — chat widget ─────────────────────────────────
                if (item.id === "suporte") {
                  return (
                    <div key="suporte" className="card" onClick={() => setChatOpen(true)} style={{ ...baseCard, gridColumn: `span ${colSpan}`, background: "linear-gradient(135deg, var(--dash-card) 0%, rgba(0,255,174,0.03) 100%)" }}>
                      <IconBox id="suporte" />
                      <div style={{ color: "var(--dash-text)", fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>Suporte</div>
                      <div style={{ color: "var(--dash-accent)", fontSize: 12 }}>Falar com equipe</div>
                    </div>
                  );
                }

                // ── Card padrão ───────────────────────────────────────────
                return (
                  <div key={item.id} className="card" onClick={() => open(config.modalKey as any)} style={{ ...baseCard, gridColumn: `span ${colSpan}` }}>
                    <IconBox id={item.id} />
                    <div style={{ color: "var(--dash-text)", fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>{config.label}</div>
                    <div style={{ color: "var(--dash-text-secondary)", fontSize: 12, lineHeight: 1.3 }}>{subText}</div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      <Modal open={modal === "analytics"} onClose={close} title="Analytics">
        <AnalyticsModal analytics={analytics} unit={unit} products={products} categories={categories} restaurant={restaurantState} />
      </Modal>
      <Modal open={modal === "pedidos"} onClose={close} title="Pedidos de hoje">
        {unit && <PedidosModal unitId={unit.id} unit={unit} />}
      </Modal>
      <Modal open={modal === "cardapio"} onClose={close} title="Cardápio">
        <CardapioModal unit={unit} categories={categories} products={products} upsellItems={upsellItems} restaurant={restaurantState} onClose={close} />
      </Modal>
      <Modal open={modal === "financeiro"} onClose={close} title="Financeiro">
        <FinanceiroModal unit={unit} analytics={analytics} reportData={reportData} restaurant={restaurantState} onOpenPlano={() => open("plano")} />
      </Modal>
      <Modal open={modal === "unidade"} onClose={close} title="Unidade">
        <UnidadeModal unit={unit} canAddUnit={canAddUnit} plan={restaurantState.plan} restaurantStatus={restaurantState.status} onClose={close} onOpenPlans={() => open("plano")} />
      </Modal>
      <Modal open={modal === "tv"} onClose={close} title="Modo TV">
        <TVModal unit={unit} tvCount={tvCount} />
      </Modal>
      <Modal open={modal === "modotv"} onClose={close} title="Modo TV">
        {unit && <ModoTVModal unit={unit} onClose={close} />}
      </Modal>
      <Modal open={modal === "plano"} onClose={close} title="Plano">
        <PlanoModal restaurant={restaurantState} trialDays={trialDays} onUpgrade={() => { close(); router.push("/painel/planos"); }} onClose={close} />
      </Modal>
      <Modal open={modal === "config"} onClose={close} title="Configurações">
        <ConfigModal profile={profile} restaurant={restaurantState} />
      </Modal>
      <Modal open={modal === "estoque"} onClose={close} title="Estoque">
        <EstoqueModal unit={unit} restaurant={restaurantState} />
      </Modal>
      <Modal open={modal === "operacoes"} onClose={close} title="Operações">
        {unit && <RestaurantOperationsModal unitId={unit.id} comandaClosePermission={unit.comanda_close_permission ?? "somente_caixa"} />}
      </Modal>
      <Modal open={modal === "impressoras"} onClose={close} title="Impressoras">
        {unit && <PrinterModal unitId={unit.id} categories={categories} />}
      </Modal>
      <Modal open={modal === "equipe"} onClose={close} title="Equipe">
        {unit && <StaffAnalyticsModal unitId={unit.id} plan={restaurantState.plan ?? "menu"} />}
      </Modal>
      <Modal open={modal === "links"} onClose={close} title="">
        <div style={{ paddingTop: 4 }}>
          {/* Header */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--dash-text)" }}>Acessos rápidos</div>
          </div>

          {/* Grid simétrico 3 colunas */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {[
              { icon: "🍽️", label: "Cardápio Delivery", href: `/delivery/${unit?.slug}`, color: "var(--dash-accent-soft)" },
              { icon: "📋", label: "Cardápio Mesa", href: `/delivery/${unit?.slug}?mode=mesa`, color: "var(--dash-accent-soft)" },
              { icon: "📺", label: "Modo TV", href: `/delivery/${unit?.slug}/tv`, color: "var(--dash-card)" },
              { icon: "👨‍🍳", label: "Cozinha", href: `/cozinha/${unit?.slug}`, color: "var(--dash-warning-soft)" },
              { icon: "🧑‍🍳", label: "Garçom", href: `/garcom/${unit?.slug}`, color: "var(--dash-warning-soft)" },
              { icon: "💳", label: "PDV", href: `/pdv/${unit?.slug}`, color: "var(--dash-info-soft)" },
              { icon: "🏠", label: "Hub Central", href: `/hub/${unit?.slug}`, color: "var(--dash-purple-soft)" },
              { icon: "📊", label: "Operações", href: `/operacoes/${unit?.slug}`, color: "var(--dash-purple-soft)" },
              { icon: "🔑", label: "Portal Funcionário", href: "/funcionario/login", color: "var(--dash-card)" },
              { icon: "📦", label: "Entregador", href: `/entrega/${unit?.slug}`, color: "var(--dash-warning-soft)" },
              { icon: "📝", label: "Comanda", href: `/comanda/${unit?.slug}/demo`, color: "var(--dash-info-soft)" },
              { icon: "⚙️", label: "Configurações", href: null, color: "var(--dash-card)" },
            ].map((item, i) => (
              <a
                key={i}
                href={item.href ?? "#"}
                target={item.href ? "_blank" : undefined}
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (!item.href) { e.preventDefault(); close(); open("config"); }
                }}
                style={{
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  gap: 8,
                  padding: "20px 12px",
                  borderRadius: 14,
                  background: item.color,
                  textDecoration: "none",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: "var(--dash-shadow)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 1px 0 rgba(255,255,255,0.04) inset, 0 -1px 0 rgba(0,0,0,0.15) inset, 0 8px 24px rgba(0,0,0,0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 1px 0 rgba(255,255,255,0.02) inset, 0 -1px 0 rgba(0,0,0,0.15) inset";
                }}
              >
                <span style={{ fontSize: 28, lineHeight: 1 }}>{item.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--dash-text-muted)", textAlign: "center", lineHeight: 1.2 }}>
                  {item.label}
                </span>
              </a>
            ))}
          </div>
        </div>
      </Modal>
      <Modal open={modal === "crm"} onClose={close} title="CRM">
        {unit && restaurant && <CrmModal unit={unit} restaurant={restaurant} />}
      </Modal>
      <Modal open={modal === "whatsapp"} onClose={close} title="WhatsApp">
        {unit && <WhatsappModal unit={unit} />}
      </Modal>
      <Modal open={modal === "delivery"} onClose={close} title="Delivery">
        {unit && <DeliveryModal unitId={unit.id} />}
      </Modal>
      <ChatWidget
        restaurantId={restaurant.id}
        open={chatOpen}
        onOpen={() => setChatOpen(true)}
        onClose={() => setChatOpen(false)}
      />
    </>
  );
}
