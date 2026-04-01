"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import dynamic from "next/dynamic";
import type { Restaurant, Unit, StockStats, Category, Product, Profile, ReportData } from "./types";

const loadingFallback = <div style={{padding:40,textAlign:"center",color:"rgba(255,255,255,0.3)"}}>Carregando...</div>;

const RestaurantOperationsModal = dynamic(() => import("./components/RestaurantOperationsModal"), { ssr: false, loading: () => loadingFallback });
const PedidosModal = dynamic(() => import("./components/PedidosModal"), { ssr: false, loading: () => loadingFallback });
const StaffAnalyticsModal = dynamic(() => import("./components/StaffAnalyticsModal"), { ssr: false, loading: () => loadingFallback });
const AnalyticsModal = dynamic(() => import("./modals/AnalyticsModal"), { ssr: false, loading: () => loadingFallback });
const CardapioModal = dynamic(() => import("./modals/CardapioModal"), { ssr: false, loading: () => loadingFallback });
const FinanceiroModal = dynamic(() => import("./modals/FinanceiroModal"), { ssr: false, loading: () => loadingFallback });
const UnidadeModal = dynamic(() => import("./modals/UnidadeModal"), { ssr: false, loading: () => loadingFallback });
const TVModal = dynamic(() => import("./modals/TVModal"), { ssr: false, loading: () => loadingFallback });
const PlanoModal = dynamic(() => import("./modals/PlanoModal"), { ssr: false, loading: () => loadingFallback });
const EstoqueModal = dynamic(() => import("./modals/EstoqueModal"), { ssr: false, loading: () => loadingFallback });
const ConfigModal = dynamic(() => import("./modals/ConfigModal"), { ssr: false, loading: () => loadingFallback });
const PrinterModal = dynamic(() => import("./modals/PrinterModal"), { ssr: false, loading: () => loadingFallback });

// ─── Modal backdrop ─────────────────────────────────────────────────────────
function Modal({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: React.ReactNode; title: string }) {
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
      document.body.style.top = `-${window.scrollY}px`;
      setDragY(0);
    } else {
      const scrollY = document.body.style.top;
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
      if (scrollY) window.scrollTo(0, parseInt(scrollY || "0") * -1);
    }
    return () => {
      const scrollY = document.body.style.top;
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
      if (scrollY) window.scrollTo(0, parseInt(scrollY || "0") * -1);
    };
  }, [open]);

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
          background: "#1a1a1a",
          borderRadius: "24px 24px 0 0",
          width: "100%",
          maxWidth: 480,
          maxHeight: "92vh",
          overflowY: "auto",
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
          background: "#1a1a1a",
          borderRadius: "24px 24px 0 0",
          padding: "12px 0 8px",
        }}>
          <div style={{
            width: 36, height: 4, borderRadius: 2,
            background: "rgba(255,255,255,0.2)",
            margin: "0 auto 8px",
          }} />
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0 20px 8px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}>
            <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 800, margin: 0 }}>{title}</h2>
            <button
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.08)", border: "none",
                borderRadius: 10, width: 32, height: 32,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "#fff", fontSize: 16,
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

// ─── Input style ────────────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: 12,
  border: "1px solid var(--dash-input-border)",
  background: "var(--dash-input-bg)",
  color: "var(--dash-text)", fontSize: 16, boxSizing: "border-box",
  outline: "none",
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
  const [modal, setModal] = useState<"analytics" | "cardapio" | "pedidos" | "financeiro" | "unidade" | "plano" | "config" | "tv" | "estoque" | "operacoes" | "equipe" | "impressoras" | null>(null);
  const open = (m: typeof modal) => setModal(m);
  const close = () => setModal(null);

  const trialDays = Math.max(0, Math.ceil((new Date(restaurant.trial_ends_at).getTime() - Date.now()) / 86400000));
  const isPro = restaurant.plan === "pro";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: var(--dash-bg); }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.5 } }
        .card:active { transform: scale(0.97); }
        .card { transition: transform 0.15s, background 0.2s, border-color 0.2s; }
        .dark .card:hover { background: rgba(0,255,174,0.03) !important; border-color: rgba(0,255,174,0.25) !important; }
        html:not(.dark) .card:hover { background: rgba(213,22,89,0.02) !important; border-color: rgba(213,22,89,0.2) !important; }
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
        html:not(.dark) .switch-toggle .sw-slider { --sw-checked-bg: #d51659; }
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
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
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
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
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
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(0,255,174,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🍽</div>
              )}
              <div>
                <div className="dash-gradient-text" style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.5px", lineHeight: 1.1 }}>{unit?.name ?? restaurant.name}</div>
                <div style={{ color: "var(--dash-text-muted)", fontSize: 12 }}>{unit?.is_published ? "● Publicado" : "○ Não publicado"}</div>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <ThemeToggle />
            {unit && (
              <a href={`/delivery/${unit.slug}`} target="_blank" rel="noreferrer" style={{
                padding: "8px 14px", borderRadius: 12,
                background: "var(--dash-link-bg)",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -2px 0 rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.15)",
                color: "var(--dash-text-secondary)", fontSize: 13, fontWeight: 600, textDecoration: "none",
              }}>Ver cardápio ↗</a>
            )}
          </div>
        </div>

        {/* Trial banner */}
        {restaurant.status === "trial" && trialDays <= 5 && (
          <div style={{ margin: "12px 24px", padding: "12px 16px", borderRadius: 14, background: "rgba(255,180,0,0.08)", border: "1px solid rgba(255,180,0,0.2)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ color: "#fbbf24", fontSize: 13, fontWeight: 600 }}>
              ⏳ {trialDays} dia{trialDays !== 1 ? "s" : ""} de trial restante{trialDays !== 1 ? "s" : ""}
            </div>
            <button onClick={() => open("plano")} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "rgba(255,180,0,0.2)", color: "#fbbf24", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Ver planos</button>
          </div>
        )}

        {/* Grid principal */}
        <div style={{
          padding: "16px 16px 100px",
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 12,
        }}>

          {/* Analytics */}
          <div className="card modal-neon-card" onClick={() => open("analytics")} style={{
            gridColumn: "span 2",
            borderRadius: 20, padding: "20px 24px",
            background: "var(--dash-card)",
            cursor: "pointer",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div style={{ color: "var(--dash-text-muted)", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Últimos 7 dias</div>
                <div className="dash-gradient-text" style={{ fontSize: 18, fontWeight: 800 }}>Analytics</div>
              </div>
              <div style={{ fontSize: 24 }}>📊</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {[
                { label: "Visitas", value: analytics.views, color: "#00ffae" },
                { label: "Cliques", value: analytics.clicks, color: "#60a5fa" },
                { label: "Pedidos", value: analytics.orders, color: "#f472b6" },
              ].map((stat) => (
                <div key={stat.label} style={{ textAlign: "center" }}>
                  <div style={{ color: stat.color, fontSize: 26, fontWeight: 900, lineHeight: 1 }}>{stat.value}</div>
                  <div style={{ color: "var(--dash-text-muted)", fontSize: 11, marginTop: 4 }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Cardápio */}
          <div className="card modal-neon-card" onClick={() => open("cardapio")} style={{
            borderRadius: 20, padding: "20px 18px",
            background: "var(--dash-card)",
            cursor: "pointer", minHeight: 140,
            display: "flex", flexDirection: "column", justifyContent: "space-between",
          }}>
            <div style={{ fontSize: 28 }}>📋</div>
            <div>
              <div className="dash-gradient-text" style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>Cardápio</div>
              <div style={{ color: "var(--dash-text-muted)", fontSize: 12 }}>{products.length} produto{products.length !== 1 ? "s" : ""}</div>
            </div>
          </div>

          {/* Pedidos */}
          <div className="card modal-neon-card" onClick={() => open("pedidos")} style={{
            borderRadius: 20, padding: "20px 18px",
            background: "var(--dash-card)",
            cursor: "pointer", minHeight: 140,
            display: "flex", flexDirection: "column", justifyContent: "space-between",
          }}>
            <div style={{ fontSize: 28 }}>🛒</div>
            <div>
              <div className="dash-gradient-text" style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>Pedidos</div>
              <div style={{ color: "var(--dash-text-muted)", fontSize: 12 }}>{analytics.orders} pedido{analytics.orders !== 1 ? "s" : ""} hoje</div>
            </div>
          </div>

          {/* Financeiro */}
          <div className="card modal-neon-card" onClick={() => open("financeiro")} style={{
            borderRadius: 20, padding: "20px 18px",
            background: "var(--dash-card)",
            cursor: "pointer", minHeight: 140,
            display: "flex", flexDirection: "column", justifyContent: "space-between",
          }}>
            <div style={{ fontSize: 28 }}>💰</div>
            <div>
              <div className="dash-gradient-text" style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>Financeiro</div>
              <div style={{ color: "var(--dash-text-muted)", fontSize: 12 }}>Relatórios e receita</div>
            </div>
          </div>

          {/* Unidade */}
          <div className="card modal-neon-card" onClick={() => open("unidade")} style={{
            borderRadius: 20, padding: "20px 18px",
            background: "var(--dash-card)",
            cursor: "pointer", minHeight: 120,
            display: "flex", flexDirection: "column", justifyContent: "space-between",
          }}>
            <div style={{ fontSize: 24 }}>📍</div>
            <div>
              <div className="dash-gradient-text" style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>Unidade</div>
              <div style={{ color: unit?.is_published ? "#00ffae" : "var(--dash-text-muted)", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: unit?.is_published ? "#00ffae" : "var(--dash-card-border)", display: "inline-block", animation: unit?.is_published ? "pulse 2s infinite" : "none" }} />
                {unit?.is_published ? "Publicado" : "Não publicado"}
              </div>
            </div>
          </div>

          {/* Modo TV */}
          <div className="card modal-neon-card" onClick={() => open("tv")} style={{
            borderRadius: 20, padding: "20px 18px",
            background: "var(--dash-card)",
            cursor: "pointer", minHeight: 120,
            display: "flex", flexDirection: "column", justifyContent: "space-between",
          }}>
            <div style={{ fontSize: 24 }}>📺</div>
            <div>
              <div className="dash-gradient-text" style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>Modo TV</div>
              <div style={{ color: "var(--dash-text-muted)", fontSize: 11 }}>{tvCount} vídeo{tvCount !== 1 ? "s" : ""} ativo{tvCount !== 1 ? "s" : ""}</div>
            </div>
          </div>

          {/* Plano */}
          <div className={`card ${isPro ? "" : "modal-neon-card"}`} onClick={() => open("plano")} style={{
            borderRadius: 20, padding: "20px 18px",
            background: isPro ? "linear-gradient(135deg, rgba(255,215,0,0.06) 0%, rgba(255,215,0,0.02) 100%)" : "var(--dash-card)",
            border: isPro ? "1px solid rgba(255,215,0,0.15)" : undefined,
            cursor: "pointer", minHeight: 120,
            display: "flex", flexDirection: "column", justifyContent: "space-between",
          }}>
            <div style={{ fontSize: 24 }}>⭐</div>
            <div>
              <div className="dash-gradient-text" style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>Plano</div>
              <div style={{ color: isPro ? "#fbbf24" : "var(--dash-text-muted)", fontSize: 11, fontWeight: isPro ? 700 : 400 }}>
                {isPro ? "Pro" : restaurant.status === "trial" ? `Trial · ${trialDays}d` : "Basic"}
              </div>
            </div>
          </div>

          {/* Config */}
          <div className="card modal-neon-card" onClick={() => open("config")} style={{
            borderRadius: 20, padding: "20px 18px",
            background: "var(--dash-card)",
            cursor: "pointer", minHeight: 120,
            display: "flex", flexDirection: "column", justifyContent: "space-between",
          }}>
            <div style={{ fontSize: 24 }}>⚙️</div>
            <div>
              <div className="dash-gradient-text" style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>Configurações</div>
              <div style={{ color: "var(--dash-text-muted)", fontSize: 11 }}>{profile.email?.split("@")[0]}</div>
            </div>
          </div>

          {/* Estoque */}
          <div className={`card ${stockStats.out === 0 && stockStats.low === 0 ? "modal-neon-card" : ""}`} onClick={() => open("estoque")} style={{
            gridColumn: "span 2",
            borderRadius: 20, padding: "20px 18px",
            background: stockStats.out > 0 ? "rgba(248,113,113,0.04)" : stockStats.low > 0 ? "rgba(251,191,36,0.04)" : "var(--dash-card)",
            border: stockStats.out > 0 ? "1px solid rgba(248,113,113,0.15)" : stockStats.low > 0 ? "1px solid rgba(251,191,36,0.15)" : undefined,
            cursor: "pointer", minHeight: 100,
            display: "flex", alignItems: "center", gap: 16,
          }}>
            <div style={{ fontSize: 28 }}>📦</div>
            <div style={{ flex: 1 }}>
              <div className="dash-gradient-text" style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>Estoque</div>
              <div style={{ fontSize: 12, display: "flex", gap: 8 }}>
                {stockStats.out > 0 && <span style={{ color: "#f87171" }}>{stockStats.out} esgotado{stockStats.out !== 1 ? "s" : ""}</span>}
                {stockStats.low > 0 && <span style={{ color: "#fbbf24" }}>{stockStats.low} baixo{stockStats.low !== 1 ? "s" : ""}</span>}
                {stockStats.out === 0 && stockStats.low === 0 && <span style={{ color: "var(--dash-text-muted)" }}>Tudo em ordem</span>}
              </div>
            </div>
          </div>

          {/* Operações */}
          <div className="card modal-neon-card" onClick={() => open("operacoes")} style={{
            gridColumn: "span 2",
            borderRadius: 20, padding: "20px 18px",
            background: "linear-gradient(135deg, rgba(0,255,174,0.04) 0%, rgba(96,165,250,0.04) 100%)",
            cursor: "pointer", minHeight: 100,
            display: "flex", alignItems: "center", gap: 16,
          }}>
            <div style={{ fontSize: 28 }}>🎛️</div>
            <div style={{ flex: 1 }}>
              <div className="dash-gradient-text" style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>Operações</div>
              <div style={{ color: "var(--dash-text-muted)", fontSize: 12 }}>Cozinha · Garçom · Andamento</div>
            </div>
            <div style={{ color: "#00ffae", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: "rgba(0,255,174,0.1)", border: "1px solid rgba(0,255,174,0.2)" }}>
              Realtime
            </div>
          </div>

          {/* Impressoras */}
          <div className="card modal-neon-card" onClick={() => open("impressoras")} style={{
            gridColumn: "span 2",
            borderRadius: 20, padding: "20px 18px",
            background: "var(--dash-card)",
            cursor: "pointer", minHeight: 100,
            display: "flex", alignItems: "center", gap: 16,
          }}>
            <div style={{ fontSize: 28 }}>🖨️</div>
            <div style={{ flex: 1 }}>
              <div className="dash-gradient-text" style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>Impressoras</div>
              <div style={{ color: "var(--dash-text-muted)", fontSize: 12 }}>Roteamento por categoria</div>
            </div>
          </div>

          {/* Equipe */}
          <div className="card modal-neon-card" onClick={() => open("equipe")} style={{
            gridColumn: "span 2",
            borderRadius: 20, padding: "20px 18px",
            background: "var(--dash-card)",
            cursor: "pointer", minHeight: 100,
            display: "flex", alignItems: "center", gap: 16,
          }}>
            <div style={{ fontSize: 28 }}>👥</div>
            <div style={{ flex: 1 }}>
              <div className="dash-gradient-text" style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>Equipe</div>
              <div style={{ color: "var(--dash-text-muted)", fontSize: 12 }}>Funcionários · Avaliações · Entregas</div>
            </div>
          </div>

        </div>
      </div>

      {unit && (
        <div style={{ maxWidth: 980, margin: "24px auto 0", padding: "0 16px" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", marginBottom: 12, letterSpacing: "-0.3px" }}>
            Links Rápidos
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 10,
          }}>
            {[
              { icon: "🍽️", label: "Cardápio Delivery", href: `/delivery/${unit.slug}` },
              { icon: "📋", label: "Cardápio Mesa", href: `/menu/${unit.slug}` },
              { icon: "📺", label: "Modo TV", href: `/delivery/${unit.slug}/tv` },
              { icon: "👨‍🍳", label: "Cozinha", href: `/cozinha` },
              { icon: "🧑‍🍳", label: "Garçom", href: `/garcom` },
              { icon: "💳", label: "PDV", href: `/delivery/${unit.slug}/pdv` },
              { icon: "🏠", label: "Hub Central", href: `/delivery/${unit.slug}/hub-central` },
              { icon: "📊", label: "Operações", href: `/operacoes/${unit.slug}` },
              { icon: "🔑", label: "Portal Funcionário", href: `/employee-login` },
              { icon: "📦", label: "Entregador", href: `/entrega/demo` },
              { icon: "🧾", label: "Comanda", href: `/comanda/${unit.slug}/demo` },
              { icon: "⚙️", label: "Configurações", href: `/configurar` },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  justifyContent: "center", gap: 6, padding: "14px 8px",
                  borderRadius: 16, background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  textDecoration: "none", transition: "all 0.2s ease", cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <span style={{ fontSize: 22 }}>{link.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.7)", textAlign: "center", lineHeight: 1.2 }}>
                  {link.label}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      <Modal open={modal === "analytics"} onClose={close} title="Analytics">
        <AnalyticsModal analytics={analytics} unit={unit} />
      </Modal>
      <Modal open={modal === "pedidos"} onClose={close} title="Pedidos de hoje">
        {unit && <PedidosModal unitId={unit.id} />}
      </Modal>
      <Modal open={modal === "cardapio"} onClose={close} title="Cardápio">
        <CardapioModal unit={unit} categories={categories} products={products} upsellItems={upsellItems} onClose={close} />
      </Modal>
      <Modal open={modal === "financeiro"} onClose={close} title="Financeiro">
        <FinanceiroModal unit={unit} analytics={analytics} reportData={reportData} />
      </Modal>
      <Modal open={modal === "unidade"} onClose={close} title="Unidade">
        <UnidadeModal unit={unit} isPro={isPro} onClose={close} />
      </Modal>
      <Modal open={modal === "tv"} onClose={close} title="Modo TV">
        <TVModal unit={unit} tvCount={tvCount} />
      </Modal>
      <Modal open={modal === "plano"} onClose={close} title="Plano">
        <PlanoModal restaurant={restaurant} trialDays={trialDays} onUpgrade={() => { close(); router.push("/painel/planos"); }} onClose={close} />
      </Modal>
      <Modal open={modal === "config"} onClose={close} title="Configurações">
        <ConfigModal profile={profile} restaurant={restaurant} />
      </Modal>
      <Modal open={modal === "estoque"} onClose={close} title="Estoque">
        <EstoqueModal unit={unit} stockStats={stockStats} />
      </Modal>
      <Modal open={modal === "operacoes"} onClose={close} title="Operações">
        {unit && <RestaurantOperationsModal unitId={unit.id} comandaClosePermission={unit.comanda_close_permission ?? "somente_caixa"} />}
      </Modal>
      <Modal open={modal === "impressoras"} onClose={close} title="Impressoras">
        {unit && <PrinterModal unitId={unit.id} categories={categories} />}
      </Modal>
      <Modal open={modal === "equipe"} onClose={close} title="Equipe">
        {unit && <StaffAnalyticsModal unitId={unit.id} />}
      </Modal>
    </>
  );
}
