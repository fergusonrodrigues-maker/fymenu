"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  createCategory, updateCategory, deleteCategory,
  createProduct,
  addUpsellItem, removeUpsellItem,
  updateUnit,
  changePlan,
  updateProfile,
} from "./actions";
import ProductRow from "./ProductRow";
import LogoUploader from "./LogoUploader";
import ThemeToggle from "@/components/ThemeToggle";
import RestaurantOperationsModal from "./components/RestaurantOperationsModal";
import PedidosModal from "./components/PedidosModal";
import DominioSection from "./components/DominioSection";
import StaffAnalyticsModal from "./components/StaffAnalyticsModal";
import dynamic from "next/dynamic";
const ImportClient = dynamic(() => import("./ia/ImportClient"), { ssr: false });

// ─── Types ─────────────────────────────────────────────────────────────────
type Restaurant = { id: string; name: string; plan: string; status: string; trial_ends_at: string; whatsapp: string | null; instagram: string | null };
type Unit = { id: string; name: string; slug: string; custom_domain: string | null; address: string; city: string | null; neighborhood: string | null; whatsapp: string | null; instagram: string | null; logo_url: string | null; maps_url: string | null; delivery_link: string | null; is_published: boolean };
type StockStats = { low: number; out: number };
type Category = { id: string; name: string; order_index: number | null; is_active?: boolean };
type Product = { id: string; category_id: string; name: string; description: string | null; price_type: string; base_price: number | null; thumbnail_url: string | null; video_url: string | null; order_index: number | null; is_active: boolean; stock?: number | null; stock_minimum?: number | null; unlimited?: boolean | null; sku?: string | null; allergens?: string[] | null; nutrition?: any; preparation_time?: number | null; is_age_restricted?: boolean | null };
type Profile = { first_name: string | null; last_name: string | null; phone: string | null; address: string | null; city: string | null; email: string | undefined };

// ─── Modal backdrop ─────────────────────────────────────────────────────────
function Modal({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: React.ReactNode; title: string }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
      document.body.style.top = `-${window.scrollY}px`;
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

  if (!open) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.4)", backdropFilter: "blur(24px) saturate(1.2)", WebkitBackdropFilter: "blur(24px) saturate(1.2)",
      display: "flex", alignItems: "flex-end",
      animation: "fadeIn 0.2s ease",
    }}
      onClick={onClose}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes modalScale { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
        @media (min-width: 640px) {
          .modal-sheet { border-radius: 24px !important; max-width: 560px !important; margin: auto !important; align-self: center !important; max-height: 85vh !important; transform-origin: center center !important; background: rgba(10,10,10,0.7) !important; }
        }
      `}</style>
      <div
        className="modal-sheet"
        style={{
          width: "100%", maxHeight: "92vh",
          background: "var(--dash-modal-bg)",
          backdropFilter: "blur(40px) saturate(1.5)",
          WebkitBackdropFilter: "blur(40px) saturate(1.5)",
          borderRadius: "24px 24px 0 0",
          border: "1px solid var(--dash-modal-border)",
          boxShadow: "0 -8px 60px rgba(0,0,0,0.3), 0 0 30px rgba(0,255,174,0.03), inset 0 1px 0 rgba(255,255,255,0.06)",
          overflow: "hidden", display: "flex", flexDirection: "column",
          animation: "modalScale 0.3s cubic-bezier(0.34,1.56,0.64,1)",
          transformOrigin: "center bottom",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 0" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--dash-handle)", boxShadow: "0 0 8px var(--dash-handle)" }} />
        </div>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px 12px" }}>
          <h2 className="dash-gradient-text" style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: "-0.5px" }}>{title}</h2>
          <button onClick={onClose} style={{ background: "var(--dash-close-btn)", border: "1px solid var(--dash-modal-border)", borderRadius: "50%", width: 32, height: 32, color: "var(--dash-close-color)", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>✕</button>
        </div>
        {/* Content */}
        <div style={{ overflowY: "auto", padding: "0 24px 32px", flex: 1, WebkitOverflowScrolling: "touch" }}>
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
  restaurant, unit, profile, categories, products, upsellItems, analytics, tvCount, stockStats,
}: {
  restaurant: Restaurant; unit: Unit | null; profile: Profile;
  categories: Category[]; products: Product[];
  upsellItems: any[]; analytics: { views: number; clicks: number; orders: number };
  tvCount: number; stockStats: StockStats;
}) {
  const router = useRouter();
  const [modal, setModal] = useState<"analytics" | "cardapio" | "pedidos" | "financeiro" | "unidade" | "plano" | "config" | "tv" | "estoque" | "operacoes" | "equipe" | null>(null);
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
        }
        .dark .dash-gradient-text {
          background: linear-gradient(135deg, #00ffae 0%, #00d9ff 100%);
        }
        html:not(.dark) .dash-gradient-text {
          background: linear-gradient(135deg, #d51659 0%, #fe4a2c 100%);
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--dash-scrollbar); border-radius: 4px; }
        input, textarea, select { outline: none; font-family: inherit; }
        input::placeholder, textarea::placeholder { color: var(--dash-placeholder); }
        .delete-btn {
          position: relative;
          width: 34px;
          height: 34px;
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
          border: 1px solid rgba(0,255,174,0.15) !important;
          box-shadow: 0 0 15px rgba(0,255,174,0.06), 0 0 2px rgba(0,255,174,0.1), inset 0 1px 0 rgba(255,255,255,0.04);
          transition: border-color 0.3s ease, box-shadow 0.3s ease;
          background: rgba(255,255,255,0.025) !important;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .dark .modal-neon-card:hover {
          border-color: rgba(0,255,174,0.3) !important;
          box-shadow: 0 0 25px rgba(0,255,174,0.1), 0 0 4px rgba(0,255,174,0.15), inset 0 1px 0 rgba(255,255,255,0.06);
        }
        html:not(.dark) .modal-neon-card {
          border: 1px solid rgba(213,22,89,0.12) !important;
          box-shadow: 0 0 15px rgba(213,22,89,0.04), 0 0 2px rgba(213,22,89,0.06), inset 0 1px 0 rgba(0,0,0,0.02);
          transition: border-color 0.3s ease, box-shadow 0.3s ease;
          background: rgba(0,0,0,0.015) !important;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        html:not(.dark) .modal-neon-card:hover {
          border-color: rgba(213,22,89,0.25) !important;
          box-shadow: 0 0 25px rgba(213,22,89,0.08), 0 0 4px rgba(213,22,89,0.1), inset 0 1px 0 rgba(0,0,0,0.03);
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
                border: "1px solid var(--dash-card-border)",
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
        <FinanceiroModal unit={unit} analytics={analytics} />
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
        {unit && <RestaurantOperationsModal unitId={unit.id} />}
      </Modal>
      <Modal open={modal === "equipe"} onClose={close} title="Equipe">
        {unit && <StaffAnalyticsModal unitId={unit.id} />}
      </Modal>
    </>
  );
}

// ─── Analytics Modal ─────────────────────────────────────────────────────────
function AnalyticsModal({ analytics, unit }: { analytics: any; unit: Unit | null }) {
  const stats = [
    { label: "Visitas ao cardápio", value: analytics.views, icon: "👁", color: "#00ffae", desc: "últimos 7 dias" },
    { label: "Cliques em produtos", value: analytics.clicks, icon: "👆", color: "#60a5fa", desc: "últimos 7 dias" },
    { label: "Pedidos enviados", value: analytics.orders, icon: "✅", color: "#f472b6", desc: "últimos 7 dias" },
  ];
  const conversion = analytics.views > 0 ? ((analytics.orders / analytics.views) * 100).toFixed(1) : "0.0";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
      {stats.map((s) => (
        <div key={s.label} className="modal-neon-card" style={{ borderRadius: 16, padding: "18px 20px", background: "var(--dash-card)", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 28 }}>{s.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ color: "var(--dash-text-dim)", fontSize: 12 }}>{s.label}</div>
            <div style={{ color: s.color, fontSize: 28, fontWeight: 900, lineHeight: 1.1 }}>{s.value}</div>
            <div style={{ color: "var(--dash-text-subtle)", fontSize: 11 }}>{s.desc}</div>
          </div>
        </div>
      ))}
      <div className="modal-neon-card" style={{ borderRadius: 16, padding: "18px 20px", background: "var(--dash-card)" }}>
        <div style={{ color: "var(--dash-text-dim)", fontSize: 12, marginBottom: 4 }}>Taxa de conversão</div>
        <div style={{ color: "var(--dash-text)", fontSize: 32, fontWeight: 900 }}>{conversion}%</div>
        <div style={{ color: "var(--dash-text-subtle)", fontSize: 11 }}>visitas → pedidos</div>
      </div>
      {unit && (
        <a href={`/delivery/${unit.slug}`} target="_blank" rel="noreferrer" style={{ display: "block", textAlign: "center", padding: "14px", borderRadius: 14, background: "var(--dash-link-bg)", border: "1px solid var(--dash-card-border)", color: "var(--dash-text-secondary)", fontSize: 14, fontWeight: 600, textDecoration: "none", transition: "all 0.2s" }}>
          Ver cardápio público ↗
        </a>
      )}
    </div>
  );
}

// ─── Cardápio Modal ───────────────────────────────────────────────────────────
function CardapioModal({ unit, categories, products, upsellItems, onClose }: {
  unit: Unit | null; categories: Category[]; products: Product[]; upsellItems: any[]; onClose: () => void;
}) {
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [showAllProducts, setShowAllProducts] = useState<Record<string, boolean>>({});
  const [newCatType, setNewCatType] = useState<"food" | "drink">("food");
  const [showImport, setShowImport] = useState(false);
  const [orderedCats, setOrderedCats] = useState(categories);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const touchStartY = useRef(0);
  const touchCurrentY = useRef(0);
  const dragElRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { setOrderedCats(categories); }, [categories]);

  function handleReorder(fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx) return;
    const updated = [...orderedCats];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    setOrderedCats(updated);
    updated.forEach((cat, i) => {
      const fd = new FormData();
      fd.set("id", cat.id);
      fd.set("name", cat.name);
      fd.set("order_index", String(i));
      updateCategory(fd);
    });
  }

  function onTouchStartDrag(e: React.TouchEvent, idx: number) {
    e.stopPropagation();
    setDragIdx(idx);
    touchStartY.current = e.touches[0].clientY;
    touchCurrentY.current = e.touches[0].clientY;
    dragElRef.current = (e.currentTarget as HTMLElement).closest('[data-cat-idx]') as HTMLDivElement;
    if (dragElRef.current) {
      dragElRef.current.style.transition = "none";
      dragElRef.current.style.zIndex = "999";
      dragElRef.current.style.position = "relative";
    }
  }

  function onTouchMoveDrag(e: React.TouchEvent) {
    if (dragIdx === null || !dragElRef.current) return;
    e.preventDefault();
    const y = e.touches[0].clientY;
    touchCurrentY.current = y;
    const dy = y - touchStartY.current;
    dragElRef.current.style.transform = `translateY(${dy}px) scale(1.03)`;
    dragElRef.current.style.opacity = "0.85";
    dragElRef.current.style.boxShadow = "0 8px 32px rgba(0,0,0,0.4)";
    const items = document.querySelectorAll('[data-cat-idx]');
    items.forEach((item) => {
      const rect = item.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      if (y > mid - 20 && y < mid + 20) {
        const idx = parseInt(item.getAttribute('data-cat-idx') || '-1');
        if (idx !== dragIdx) setOverIdx(idx);
      }
    });
  }

  function onTouchEndDrag() {
    if (dragIdx !== null && overIdx !== null) {
      handleReorder(dragIdx, overIdx);
    }
    if (dragElRef.current) {
      dragElRef.current.style.transition = "all 0.25s ease";
      dragElRef.current.style.transform = "";
      dragElRef.current.style.opacity = "";
      dragElRef.current.style.boxShadow = "";
      dragElRef.current.style.zIndex = "";
      dragElRef.current.style.position = "";
      dragElRef.current = null;
    }
    setDragIdx(null);
    setOverIdx(null);
  }

  const productsByCat = orderedCats.reduce<Record<string, Product[]>>((acc, cat) => {
    acc[cat.id] = products.filter((p) => p.category_id === cat.id);
    return acc;
  }, {});

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
      {/* Links rápidos */}
      <div style={{ display: "flex", gap: 8 }}>
        {unit && (
          <a href={`/delivery/${unit.slug}`} target="_blank" rel="noreferrer" style={{ flex: 1, textAlign: "center", padding: "10px", borderRadius: 12, background: "var(--dash-link-bg)", border: "1px solid var(--dash-card-border)", color: "var(--dash-text-secondary)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Ver cardápio ↗</a>
        )}
        <button type="button" className="btn-ai" style={{ flex: 1 }} onClick={() => setShowImport(!showImport)}>
          {showImport ? "← Voltar ao cardápio" : "✨ Importar com IA"}
        </button>
      </div>

      {showImport ? (
        <div style={{ marginTop: 8 }}>
          {unit && <ImportClient unitId={unit.id} unitName={unit.name} embedded />}
        </div>
      ) : (
        <>

      {/* Nova categoria */}
      {unit && (
        <form action={createCategory} className="modal-neon-card" style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px 14px", borderRadius: 14, background: "var(--dash-card)" }}>
          <input type="hidden" name="unit_id" value={unit.id} />
          <input type="hidden" name="category_type" value={newCatType} />
          <input type="hidden" name="is_alcoholic" value="false" />
          <div style={{ display: "flex", gap: 8 }}>
            <input name="name" placeholder="Nome da categoria" required style={{ ...inp, flex: 1, height: 38, padding: "0 12px" }} />
            <button type="submit" className="btn-gradient" style={{ padding: "0 18px", whiteSpace: "nowrap", minWidth: 70, height: 34, borderRadius: 10 }}>
              Criar
            </button>
          </div>
          {/* Tipo */}
          <div className="type-toggle-container">
            <div className="type-toggle-slider" data-type={newCatType} />
            {(["food", "drink"] as const).map((t) => (
              <button
                key={t}
                type="button"
                className="type-toggle-btn"
                data-active={newCatType === t ? "true" : "false"}
                onClick={() => setNewCatType(t)}
              >
                {t === "food" ? "🍽️ Pratos" : "🥤 Bebidas"}
              </button>
            ))}
          </div>
        </form>
      )}

      {orderedCats.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--dash-text-subtle)", fontSize: 14 }}>Crie sua primeira categoria acima!</div>
      )}

      {orderedCats.map((cat, catIdx) => {
        const isOpen = expandedCat === cat.id;
        const catProducts = productsByCat[cat.id] ?? [];
        const isDragging = dragIdx === catIdx;
        const isOver = overIdx === catIdx;
        return (
          <div
            key={cat.id}
            data-cat-idx={catIdx}
            draggable
            onDragStart={() => setDragIdx(catIdx)}
            onDragOver={(e) => { e.preventDefault(); setOverIdx(catIdx); }}
            onDragEnd={() => { if (dragIdx !== null && overIdx !== null) handleReorder(dragIdx, overIdx); setDragIdx(null); setOverIdx(null); }}
            onDrop={() => { if (dragIdx !== null) handleReorder(dragIdx, catIdx); setDragIdx(null); setOverIdx(null); }}
            className={overIdx === catIdx ? "" : "modal-neon-card"}
            style={{
              borderRadius: 16,
              border: overIdx === catIdx ? "2px solid #FF6B00" : undefined,
              background: dragIdx === catIdx ? "var(--dash-card-hover, rgba(255,255,255,0.08))" : "var(--dash-card-subtle)",
              overflow: "hidden",
              opacity: dragIdx === catIdx ? 0.7 : 1,
              transition: "all 0.2s ease",
              transform: overIdx === catIdx && dragIdx !== catIdx ? "scale(1.02)" : "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", padding: "10px 12px", gap: 6, cursor: "pointer" }} onClick={() => { setExpandedCat(isOpen ? null : cat.id); if (isOpen) setShowAllProducts(prev => ({ ...prev, [cat.id]: false })); }}>
              <span
                style={{ cursor: "grab", fontSize: 16, color: "var(--dash-text-muted)", opacity: 0.5, userSelect: "none", WebkitUserSelect: "none", touchAction: "none", WebkitTouchCallout: "none", padding: "0 2px", lineHeight: 1, flexShrink: 0, width: 18, textAlign: "center" }}
                onMouseDown={(e) => e.stopPropagation()}
                onContextMenu={(e) => e.preventDefault()}
                onTouchStart={(e) => { e.preventDefault(); onTouchStartDrag(e, catIdx); }}
                onTouchMove={(e) => onTouchMoveDrag(e)}
                onTouchEnd={() => onTouchEndDrag()}
                title="Segurar e arrastar para reordenar"
              >⠿</span>
              <span className="cat-header-arrow" data-open={isOpen ? "true" : "false"} style={{ color: "var(--dash-text-muted)", fontSize: 11, flexShrink: 0, width: 14, textAlign: "center", lineHeight: 1 }}>▼</span>
              <form action={updateCategory} onClick={(e) => e.stopPropagation()} style={{ flex: 1, display: "flex", gap: 6, alignItems: "center" }}>
                <input type="hidden" name="id" value={cat.id} />
                <input name="name" defaultValue={cat.name} style={{ ...inp, flex: 1, fontSize: 14, fontWeight: 800, height: 38, padding: "0 12px" }} />
                <button type="submit" className="btn-gradient" style={{ padding: "0 14px", height: 34, fontSize: 12, minWidth: 58, borderRadius: 8, flexShrink: 0 }}>
                  Salvar
                </button>
              </form>
              <form action={deleteCategory} onClick={(e) => e.stopPropagation()} onSubmit={(e) => { if (!confirm("Excluir categoria e todos os produtos?")) e.preventDefault(); }}>
                <input type="hidden" name="id" value={cat.id} />
                <button type="submit" className="delete-btn">
                  <span className="x-line" />
                  <span className="x-line" />
                </button>
              </form>
              <label className="switch-toggle" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={cat.is_active !== false}
                  onChange={async (e) => {
                    const fd = new FormData();
                    fd.set("id", cat.id);
                    fd.set("name", cat.name);
                    fd.set("is_active", String(e.target.checked));
                    await updateCategory(fd);
                  }}
                />
                <div className="sw-slider">
                  <div className="sw-circle">
                    <svg className="sw-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <svg className="sw-cross" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </div>
                </div>
              </label>
            </div>
            <div className="cat-dropdown-content" data-open={isOpen ? "true" : "false"}>
              <div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: isOpen ? "0 12px 12px" : "0 12px" }}>
                  {isOpen && (
                    <>
                      {catProducts.length === 0 && <div style={{ color: "var(--dash-text-subtle)", fontSize: 13, padding: "8px 0" }}>Nenhum produto nesta categoria.</div>}
                      {(showAllProducts[cat.id] ? catProducts : catProducts.slice(0, 4)).map((p) => (
                        <ProductRow
                          key={p.id}
                          product={p}
                          expanded={expandedProductId === p.id}
                          onToggle={() => setExpandedProductId(expandedProductId === p.id ? null : p.id)}
                          onClose={() => setExpandedProductId(null)}
                        />
                      ))}
                      {catProducts.length > 4 && !showAllProducts[cat.id] && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setShowAllProducts(prev => ({ ...prev, [cat.id]: true })); }}
                          style={{
                            width: "100%",
                            padding: "10px 0",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 8,
                            color: "#00ffae",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Ver mais {catProducts.length - 4} produto{catProducts.length - 4 !== 1 ? "s" : ""} ↓
                        </button>
                      )}
                      <NewProductFormInline
                        categoryId={cat.id}
                        anyProductExpanded={expandedProductId !== null}
                        onOpen={() => setExpandedProductId(null)}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
        </>
      )}
    </div>
  );
}


function NewProductFormInline({ categoryId, anyProductExpanded, onOpen }: { categoryId: string; anyProductExpanded: boolean; onOpen: () => void }) {
  const [open, setOpen] = useState(false);
  const [priceType, setPriceType] = useState("fixed");

  useEffect(() => {
    if (anyProductExpanded) setOpen(false);
  }, [anyProductExpanded]);

  function handleOpen() {
    onOpen();
    setPriceType("fixed");
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
    setPriceType("fixed");
  }

  if (!open) return (
    <button onClick={handleOpen} style={{ padding: "10px", borderRadius: 10, width: "100%", background: "transparent", border: "1px dashed var(--dash-btn-border)", color: "var(--dash-text-muted)", fontSize: 13, cursor: "pointer" }}>
      + Adicionar produto
    </button>
  );
  return (
    <form
      action={async (formData) => {
        await createProduct(formData);
        handleClose();
      }}
      style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, borderRadius: 12, border: "1px solid var(--dash-input-border)", background: "var(--dash-card)" }}
    >
      <input type="hidden" name="category_id" value={categoryId} />
      <input name="name" placeholder="Nome do produto" required style={inp} />
      <textarea name="description" placeholder="Descrição (opcional)" rows={2} style={{ ...inp, resize: "vertical" }} />
      <div style={{ display: "flex", gap: 8 }}>
        <select name="price_type" value={priceType} onChange={(e) => setPriceType(e.target.value)} style={{ ...inp, flex: 1, cursor: "pointer" }}>
          <option value="fixed">Preço fixo</option>
          <option value="variable">Preço variável</option>
        </select>
        {priceType === "fixed" && (
          <input name="base_price" placeholder="Preço (ex: 29,90)" inputMode="decimal" style={{ ...inp, flex: 1 }} />
        )}
      </div>
      {priceType === "variable" && (
        <p style={{ color: "var(--dash-text-muted)", fontSize: 12, margin: 0 }}>
          💡 Adicione as variações de preço após criar o produto (clique no produto para editar).
        </p>
      )}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" onClick={handleClose} style={{ padding: "9px 14px", borderRadius: 10, border: "1px solid var(--dash-btn-border)", background: "transparent", color: "var(--dash-text-dim)", fontSize: 12, cursor: "pointer" }}>Cancelar</button>
        <button type="submit" style={{ padding: "9px 16px", borderRadius: 10, border: "none", background: "rgba(0,255,174,0.15)", color: "#00ffae", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Criar</button>
      </div>
    </form>
  );
}

// ─── Financeiro Modal ─────────────────────────────────────────────────────────
function FinanceiroModal({ unit, analytics }: { unit: Unit | null; analytics: { views: number; clicks: number; orders: number } }) {
  const [waCopied, setWaCopied] = useState(false);
  const [deliveryPlatform, setDeliveryPlatform] = useState("");
  const [deliveryLink, setDeliveryLink] = useState(unit?.delivery_link ?? "");
  const [deliverySaving, setDeliverySaving] = useState(false);
  const [deliverySaved, setDeliverySaved] = useState(false);

  const waLink = unit?.whatsapp ? `https://wa.me/55${unit.whatsapp.replace(/\D/g, "")}` : null;

  async function saveDeliveryLink() {
    if (!unit || !deliveryLink.trim()) return;
    setDeliverySaving(true);
    const { createClient: cc } = await import("@/lib/supabase/client");
    await cc().from("units").update({ delivery_link: deliveryLink.trim() }).eq("id", unit.id);
    setDeliverySaving(false);
    setDeliverySaved(true);
    setTimeout(() => setDeliverySaved(false), 2000);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
      {/* Resumo rápido */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {[
          { label: "Pedidos hoje", value: analytics.orders, color: "#00ffae" },
          { label: "Visitas hoje", value: analytics.views, color: "#60a5fa" },
        ].map((s) => (
          <div key={s.label} style={{ borderRadius: 14, padding: "14px 16px", background: "var(--dash-card)", border: "1px solid var(--dash-card-border)", textAlign: "center" }}>
            <div style={{ color: s.color, fontSize: 26, fontWeight: 900, lineHeight: 1 }}>{s.value}</div>
            <div style={{ color: "var(--dash-text-muted)", fontSize: 11, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>
      {/* Link relatórios completos */}
      <a href="/painel/relatorios" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderRadius: 16, background: "rgba(0,255,174,0.06)", border: "1px solid rgba(0,255,174,0.15)", textDecoration: "none" }}>
        <div>
          <div style={{ color: "var(--dash-text)", fontSize: 15, fontWeight: 700 }}>📊 Relatórios completos</div>
          <div style={{ color: "var(--dash-text-muted)", fontSize: 13, marginTop: 2 }}>Faturamento, métodos de pagamento, produtos mais vendidos</div>
        </div>
        <span style={{ color: "#00ffae", fontSize: 18 }}>→</span>
      </a>

      {/* ── Meus Links Delivery ─────────────────────────── */}
      <div style={{ borderTop: "1px solid var(--dash-separator)", paddingTop: 12 }}>
        <div style={{ color: "var(--dash-text)", fontSize: 14, fontWeight: 700, marginBottom: 10 }}>📦 Meus Links Delivery</div>

        {/* WhatsApp */}
        <div style={{ borderRadius: 14, padding: "16px", background: "var(--dash-card)", border: "1px solid rgba(22,163,74,0.25)", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>💬</span>
            <div style={{ color: "var(--dash-text)", fontSize: 14, fontWeight: 700 }}>WhatsApp</div>
          </div>
          <div style={{ color: "var(--dash-text-muted)", fontSize: 12, marginBottom: 10 }}>
            Pedidos enviados automaticamente com rastreamento
          </div>
          {waLink ? (
            <>
              <div style={{
                padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)",
                border: "1px solid var(--dash-card-border)", fontSize: 12, color: "var(--dash-text-muted)",
                fontFamily: "monospace", marginBottom: 8, wordBreak: "break-all",
              }}>{waLink}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => { navigator.clipboard.writeText(waLink); setWaCopied(true); setTimeout(() => setWaCopied(false), 1800); }}
                  style={{ flex: 1, padding: "9px", borderRadius: 9, border: "none", background: waCopied ? "rgba(0,255,174,0.15)" : "rgba(22,163,74,0.15)", color: waCopied ? "#00ffae" : "#4ade80", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  {waCopied ? "✓ Copiado!" : "Copiar link"}
                </button>
                <a href={`/painel`} style={{ flex: 1, padding: "9px", borderRadius: 9, border: "1px solid var(--dash-btn-border)", background: "transparent", color: "var(--dash-text-dim)", fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "none", textAlign: "center" }}>
                  ✎ Editar número
                </a>
              </div>
            </>
          ) : (
            <div style={{ color: "#f87171", fontSize: 12 }}>WhatsApp não configurado — edite na seção Unidade.</div>
          )}
        </div>

        {/* iFood / Delivery */}
        <div style={{ borderRadius: 14, padding: "16px", background: "var(--dash-card)", border: "1px solid rgba(234,88,12,0.25)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>🛵</span>
            <div style={{ color: "var(--dash-text)", fontSize: 14, fontWeight: 700 }}>iFood / Delivery</div>
          </div>
          <div style={{ color: "var(--dash-text-muted)", fontSize: 12, marginBottom: 10 }}>
            Configure o link da sua loja nas plataformas de delivery
          </div>
          <select
            value={deliveryPlatform}
            onChange={(e) => setDeliveryPlatform(e.target.value)}
            style={{ ...inp, marginBottom: 8 }}
          >
            <option value="">Selecionar plataforma...</option>
            <option value="ifood">iFood</option>
            <option value="rappi">Rappi</option>
            <option value="99food">99Food</option>
            <option value="outro">Outro</option>
          </select>
          <input
            type="url"
            value={deliveryLink}
            onChange={(e) => { setDeliveryLink(e.target.value); setDeliverySaved(false); }}
            placeholder="Cole o link da sua loja"
            style={{ ...inp, marginBottom: 8 }}
          />
          <button
            onClick={saveDeliveryLink}
            disabled={deliverySaving || !deliveryLink.trim()}
            style={{
              width: "100%", padding: "10px", borderRadius: 9, border: "none",
              background: deliverySaved ? "rgba(0,255,174,0.15)" : "rgba(234,88,12,0.15)",
              color: deliverySaved ? "#00ffae" : "#fb923c",
              fontSize: 13, fontWeight: 700, cursor: deliverySaving ? "not-allowed" : "pointer",
              opacity: deliverySaving ? 0.6 : 1,
            }}
          >
            {deliverySaved ? "✓ Salvo!" : deliverySaving ? "Salvando..." : "Salvar link"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Copy link row ────────────────────────────────────────────────────────────
function CopyLinkRow({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }
  return (
    <div style={{ borderRadius: 12, background: "var(--dash-card)", border: "1px solid var(--dash-card-border)", padding: "10px 14px" }}>
      <div style={{ color: "var(--dash-text-muted)", fontSize: 11, marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ flex: 1, color: "var(--dash-text-secondary)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{url}</span>
        <button type="button" onClick={copy} style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid var(--dash-btn-border)", background: copied ? "rgba(0,255,174,0.15)" : "var(--dash-link-bg)", color: copied ? "#00ffae" : "var(--dash-text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
          {copied ? "Copiado ✓" : "Copiar"}
        </button>
      </div>
    </div>
  );
}

// ─── Unidade Modal ────────────────────────────────────────────────────────────
function UnidadeModal({ unit, isPro, onClose }: { unit: Unit | null; isPro: boolean; onClose: () => void }) {
  const [isPublished, setIsPublished] = useState(unit?.is_published ?? false);
  const [showNewUnit, setShowNewUnit] = useState(false);

  if (!unit) return <div style={{ color: "var(--dash-text-muted)", paddingTop: 16 }}>Nenhuma unidade encontrada.</div>;
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 8 }}>
      <DominioSection
        unitId={unit.id}
        currentDomain={unit.custom_domain}
        slug={unit.slug}
        restaurantName={unit.name}
      />

      <CopyLinkRow label="Link Delivery" url={`${origin}/delivery/${unit.slug}`} />
      <CopyLinkRow label="Link Presencial (QR Code / Mesa)" url={`${origin}/menu/${unit.slug}`} />

      <LogoUploader unitId={unit.id} currentLogoUrl={unit.logo_url} />

      <form action={updateUnit} onSubmit={() => setTimeout(onClose, 300)} style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
        <input type="hidden" name="unit_id" value={unit.id} />
        <input type="hidden" name="is_published" value={String(isPublished)} />

        {[
          { name: "name", label: "Nome da unidade", value: unit.name },
          { name: "address", label: "Endereço", value: unit.address },
          { name: "city", label: "Cidade", value: unit.city ?? "" },
          { name: "neighborhood", label: "Bairro", value: unit.neighborhood ?? "" },
          { name: "whatsapp", label: "WhatsApp", value: unit.whatsapp ?? "" },
          { name: "instagram", label: "Instagram", value: unit.instagram ?? "" },
          { name: "maps_url", label: "Link do Google Maps", value: unit.maps_url ?? "" },
        ].map((f) => (
          <div key={f.name}>
            <div style={{ color: "var(--dash-text-muted)", fontSize: 11, marginBottom: 4 }}>{f.label}</div>
            <input name={f.name} defaultValue={f.value} style={inp} />
          </div>
        ))}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0 4px" }}>
          <div>
            <div style={{ color: "var(--dash-text)", fontSize: 14, fontWeight: 600 }}>Publicar cardápio</div>
            <div style={{ color: "var(--dash-text-muted)", fontSize: 12 }}>Cardápio visível publicamente</div>
          </div>
          <button
            type="button"
            onClick={() => setIsPublished((v) => !v)}
            style={{
              width: 44, height: 26, borderRadius: 13, border: "none",
              background: isPublished ? "#00ffae" : "var(--dash-card-border)",
              position: "relative", transition: "background 0.2s",
              cursor: "pointer", flexShrink: 0,
            }}
          >
            <span style={{
              display: "block", width: 20, height: 20, borderRadius: "50%",
              background: "#fff", position: "absolute", top: 3, left: 3,
              transition: "transform 0.2s",
              transform: isPublished ? "translateX(18px)" : "translateX(0)",
            }} />
          </button>
        </div>

        <button type="submit" style={{ marginTop: 8, padding: "14px", borderRadius: 14, border: "none", background: "rgba(0,255,174,0.15)", color: "#00ffae", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Salvar unidade</button>
      </form>

      {/* ── Nova Unidade ── */}
      <div style={{ marginTop: 8, borderTop: "1px solid var(--dash-separator)", paddingTop: 16 }}>
        {!showNewUnit ? (
          <button onClick={() => setShowNewUnit(true)} style={{ width: "100%", padding: "13px", borderRadius: 14, border: "1px dashed var(--dash-btn-border)", background: "transparent", color: "var(--dash-text-muted)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            + Nova Unidade
          </button>
        ) : isPro ? (
          <div style={{ borderRadius: 14, padding: "16px", border: "1px solid var(--dash-input-border)", background: "var(--dash-card)" }}>
            <div style={{ color: "var(--dash-text)", fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Nova Unidade</div>
            <form action={async (fd) => {
              const { createClient: cc } = await import("@/lib/supabase/client");
              const supabase = cc();
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) return;
              const { data: rest } = await supabase.from("restaurants").select("id").eq("owner_id", user.id).single();
              if (!rest) return;
              await supabase.from("units").insert({ restaurant_id: rest.id, name: String(fd.get("name")), slug: String(fd.get("slug")) });
              setShowNewUnit(false);
              window.location.reload();
            }} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input name="name" placeholder="Nome da unidade" required style={inp} />
              <input name="slug" placeholder="slug (ex: unidade-centro)" required style={inp} />
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => setShowNewUnit(false)} style={{ flex: 1, padding: "11px", borderRadius: 12, border: "1px solid var(--dash-btn-border)", background: "transparent", color: "var(--dash-text-dim)", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
                <button type="submit" style={{ flex: 1, padding: "11px", borderRadius: 12, border: "none", background: "rgba(0,255,174,0.15)", color: "#00ffae", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Criar</button>
              </div>
            </form>
          </div>
        ) : (
          <div style={{ borderRadius: 14, padding: "16px", border: "1px solid rgba(250,204,21,0.2)", background: "rgba(250,204,21,0.04)" }}>
            <div style={{ color: "#fbbf24", fontSize: 14, fontWeight: 700, marginBottom: 6 }}>⭐ Recurso Pro</div>
            <div style={{ color: "var(--dash-text-muted)", fontSize: 13, marginBottom: 14, lineHeight: 1.5 }}>
              Múltiplas unidades estão disponíveis no Plano Pro. Faça upgrade para adicionar novas unidades.
            </div>
            <button onClick={() => { setShowNewUnit(false); onClose(); }} style={{ width: "100%", padding: "12px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #00ffae, #00d9b8)", color: "#000", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
              Ver Planos →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TV Modal ─────────────────────────────────────────────────────────────────
function TVModal({ unit, tvCount }: { unit: Unit | null; tvCount: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
      <div style={{ borderRadius: 16, padding: "20px", background: "var(--dash-card)", border: "1px solid var(--dash-card-border)", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📺</div>
        <div style={{ color: "var(--dash-text)", fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{tvCount} vídeo{tvCount !== 1 ? "s" : ""} ativo{tvCount !== 1 ? "s" : ""}</div>
        <div style={{ color: "var(--dash-text-muted)", fontSize: 13, marginBottom: 16 }}>Exiba seus produtos em modo fullscreen para TV, totem ou projetor.</div>
        {unit && (
          <a href={`/tv/${unit.slug}`} target="_blank" rel="noreferrer" style={{ display: "block", padding: "12px", borderRadius: 12, background: "var(--dash-link-bg)", border: "1px solid var(--dash-card-border)", color: "var(--dash-text-secondary)", fontSize: 14, fontWeight: 600, textDecoration: "none", marginBottom: 10 }}>
            Abrir display público ↗
          </a>
        )}
        <a href="/painel/tv" style={{ display: "block", padding: "12px", borderRadius: 12, border: "none", background: "rgba(0,255,174,0.15)", color: "#00ffae", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
          Gerenciar vídeos →
        </a>
      </div>
      <div style={{ borderRadius: 14, padding: "14px 16px", background: "var(--dash-card-subtle)", border: "1px solid var(--dash-card-border)" }}>
        <div style={{ color: "var(--dash-text-muted)", fontSize: 13 }}>
          🎬 Vídeos até 15 segundos · Sem som · Autoplay · Vertical ou horizontal
        </div>
      </div>
    </div>
  );
}

// ─── Plano Modal ──────────────────────────────────────────────────────────────
function PlanoModal({ restaurant, trialDays, onUpgrade, onClose }: { restaurant: Restaurant; trialDays: number; onUpgrade: () => void; onClose: () => void }) {
  const isPro = restaurant.plan === "pro";
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState<"downgrade" | null>(null);

  async function handleDowngrade() {
    setLoading(true);
    try {
      await changePlan("basic");
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
      {/* Status atual */}
      <div style={{ borderRadius: 16, padding: "20px", background: isPro ? "linear-gradient(135deg, rgba(250,204,21,0.08), rgba(251,146,60,0.08))" : "var(--dash-card)", border: isPro ? "1px solid rgba(250,204,21,0.2)" : "1px solid var(--dash-card-border)" }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>{isPro ? "⭐" : "🎯"}</div>
        <div style={{ color: "var(--dash-text)", fontSize: 18, fontWeight: 800 }}>{isPro ? "Plano Pro" : restaurant.status === "trial" ? "Trial ativo" : "Plano Basic"}</div>
        {restaurant.status === "trial" && <div style={{ color: "#fbbf24", fontSize: 13, marginTop: 4 }}>⏳ {trialDays} dia{trialDays !== 1 ? "s" : ""} restante{trialDays !== 1 ? "s" : ""}</div>}
        {isPro && <div style={{ color: "var(--dash-text-muted)", fontSize: 13, marginTop: 4 }}>Acesso completo a todos os recursos</div>}
      </div>

      {/* Usuário Pro: opções de gerenciamento */}
      {isPro && (
        <>
          {confirm === "downgrade" ? (
            <div style={{ borderRadius: 16, padding: "20px", background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)" }}>
              <div style={{ color: "var(--dash-text)", fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Confirmar downgrade?</div>
              <div style={{ color: "var(--dash-text-muted)", fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
                Você voltará para o Plano Basic. Unidades extras e recursos Pro ficarão inacessíveis.
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setConfirm(null)}
                  disabled={loading}
                  style={{ flex: 1, padding: "12px", borderRadius: 12, border: "1px solid var(--dash-card-border)", background: "var(--dash-card)", color: "var(--dash-text)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDowngrade}
                  disabled={loading}
                  style={{ flex: 1, padding: "12px", borderRadius: 12, border: "none", background: "rgba(248,113,113,0.2)", color: "#f87171", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}
                >
                  {loading ? "Aguarde..." : "Confirmar downgrade"}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ borderRadius: 16, padding: "18px 20px", background: "var(--dash-card)", border: "1px solid var(--dash-card-border)" }}>
              <div style={{ color: "var(--dash-text)", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Gerenciar assinatura</div>
              <div style={{ color: "var(--dash-text-muted)", fontSize: 13, marginBottom: 16 }}>
                Para dúvidas sobre cobrança, entre em contato pelo suporte.
              </div>
              <button
                onClick={() => setConfirm("downgrade")}
                style={{ width: "100%", padding: "12px", borderRadius: 12, border: "1px solid rgba(248,113,113,0.3)", background: "transparent", color: "#f87171", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                Voltar para o Plano Basic
              </button>
            </div>
          )}
        </>
      )}

      {/* Usuário não-Pro: mostrar planos disponíveis */}
      {!isPro && (
        <>
          {[
            { name: "Basic", price: "Grátis", features: ["1 unidade", "Cardápio digital", "Modo TV", "IA básica"], color: "var(--dash-link-bg)", highlight: false },
            { name: "Pro", price: "R$ 99/mês", features: ["Múltiplas unidades", "Analytics avançado", "Relatórios", "Suporte prioritário"], color: "rgba(0,255,174,0.06)", highlight: true },
          ].map((plan) => (
            <div key={plan.name} style={{ borderRadius: 16, padding: "18px 20px", background: plan.color, border: plan.highlight ? "1px solid rgba(0,255,174,0.2)" : "1px solid var(--dash-card-border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ color: "var(--dash-text)", fontSize: 16, fontWeight: 800 }}>{plan.name}</div>
                <div style={{ color: plan.highlight ? "#00ffae" : "var(--dash-text-dim)", fontSize: 14, fontWeight: 700 }}>{plan.price}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {plan.features.map((f) => (
                  <div key={f} style={{ color: "var(--dash-text-dim)", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: plan.highlight ? "#00ffae" : "var(--dash-text-subtle)" }}>✓</span> {f}
                  </div>
                ))}
              </div>
              {plan.highlight && (
                <button
                  onClick={onUpgrade}
                  style={{
                    marginTop: 16, width: "100%", padding: "13px",
                    borderRadius: 12, border: "none", cursor: "pointer",
                    background: "linear-gradient(135deg, #00ffae, #00d9b8)",
                    color: "#000", fontWeight: 800, fontSize: 14,
                  }}
                >
                  Fazer Upgrade →
                </button>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── Estoque Modal ────────────────────────────────────────────────────────────
function EstoqueModal({ unit, stockStats }: { unit: Unit | null; stockStats: StockStats }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
      <div className="modal-neon-card" style={{ borderRadius: 16, padding: "20px", background: "var(--dash-card)", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 12 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#f87171", fontSize: 26, fontWeight: 900, lineHeight: 1 }}>{stockStats.out}</div>
            <div style={{ color: "var(--dash-text-muted)", fontSize: 11, marginTop: 4 }}>Esgotados</div>
          </div>
          <div style={{ width: 1, background: "var(--dash-separator)" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#fbbf24", fontSize: 26, fontWeight: 900, lineHeight: 1 }}>{stockStats.low}</div>
            <div style={{ color: "var(--dash-text-muted)", fontSize: 11, marginTop: 4 }}>Estoque baixo</div>
          </div>
        </div>
        <div style={{ color: "var(--dash-text-muted)", fontSize: 13, marginBottom: 16 }}>Gerencie o estoque dos seus produtos e acompanhe movimentações.</div>
        <a href="/painel/estoque" style={{ display: "block", padding: "12px", borderRadius: 12, border: "none", background: "rgba(0,255,174,0.15)", color: "#00ffae", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
          Gerenciar estoque →
        </a>
      </div>
      <div className="modal-neon-card" style={{ borderRadius: 14, padding: "14px 16px", background: "var(--dash-card-subtle)" }}>
        <div style={{ color: "var(--dash-text-muted)", fontSize: 13 }}>📊 Ajuste estoque · Registre movimentações · Configure alertas</div>
      </div>
    </div>
  );
}

// ─── Config Modal ─────────────────────────────────────────────────────────────
function ConfigModal({ profile, restaurant }: { profile: Profile; restaurant: Restaurant }) {
  const [view, setView] = useState<"home" | "profile" | "password">("home");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);

  async function handlePasswordChange(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newPw = String(fd.get("password") ?? "");
    const confirm = String(fd.get("confirm") ?? "");
    if (newPw !== confirm) { setPwMsg("Senhas não conferem."); return; }
    if (newPw.length < 6) { setPwMsg("Mínimo 6 caracteres."); return; }
    setPwLoading(true);
    setPwMsg(null);
    try {
      const { createClient: cc } = await import("@/lib/supabase/client");
      const { error } = await cc().auth.updateUser({ password: newPw });
      if (error) { setPwMsg(error.message); } else { setPwMsg("Senha alterada com sucesso!"); setView("home"); }
    } finally { setPwLoading(false); }
  }

  if (view === "profile") return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
      <button onClick={() => setView("home")} style={{ background: "none", border: "none", color: "var(--dash-text-muted)", fontSize: 13, cursor: "pointer", textAlign: "left", padding: 0, marginBottom: 4 }}>← Voltar</button>
      <form action={updateProfile} onSubmit={() => setTimeout(() => setView("home"), 300)} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[
          { name: "first_name", label: "Nome", value: profile.first_name ?? "" },
          { name: "last_name", label: "Sobrenome", value: profile.last_name ?? "" },
          { name: "phone", label: "Telefone", value: profile.phone ?? "" },
          { name: "address", label: "Endereço (opcional)", value: profile.address ?? "" },
          { name: "city", label: "Cidade (opcional)", value: profile.city ?? "" },
        ].map((f) => (
          <div key={f.name}>
            <div style={{ color: "var(--dash-text-muted)", fontSize: 11, marginBottom: 4 }}>{f.label}</div>
            <input name={f.name} defaultValue={f.value} style={inp} />
          </div>
        ))}
        <button type="submit" style={{ marginTop: 4, padding: "13px", borderRadius: 12, border: "none", background: "rgba(0,255,174,0.15)", color: "#00ffae", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Salvar perfil</button>
      </form>
    </div>
  );

  if (view === "password") return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
      <button onClick={() => { setView("home"); setPwMsg(null); }} style={{ background: "none", border: "none", color: "var(--dash-text-muted)", fontSize: 13, cursor: "pointer", textAlign: "left", padding: 0, marginBottom: 4 }}>← Voltar</button>
      <form onSubmit={handlePasswordChange} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[
          { name: "password", label: "Nova senha", placeholder: "Mínimo 6 caracteres" },
          { name: "confirm", label: "Confirmar senha", placeholder: "Digite novamente" },
        ].map((f) => (
          <div key={f.name}>
            <div style={{ color: "var(--dash-text-muted)", fontSize: 11, marginBottom: 4 }}>{f.label}</div>
            <input type="password" name={f.name} placeholder={f.placeholder} required style={inp} />
          </div>
        ))}
        {pwMsg && <div style={{ fontSize: 13, color: pwMsg.includes("sucesso") ? "#00ffae" : "#f87171", padding: "8px 12px", borderRadius: 8, background: pwMsg.includes("sucesso") ? "rgba(0,255,174,0.08)" : "rgba(248,113,113,0.08)" }}>{pwMsg}</div>}
        <button type="submit" disabled={pwLoading} style={{ padding: "13px", borderRadius: 12, border: "none", background: "rgba(0,255,174,0.15)", color: "#00ffae", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: pwLoading ? 0.6 : 1 }}>
          {pwLoading ? "Alterando..." : "Alterar senha"}
        </button>
      </form>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
      <div className="modal-neon-card" style={{ borderRadius: 16, padding: "18px 20px", background: "var(--dash-card)" }}>
        <div style={{ color: "var(--dash-text-muted)", fontSize: 12, marginBottom: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>Conta</div>
        <div className="dash-gradient-text" style={{ fontSize: 16, fontWeight: 700 }}>{[profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Sem nome"}</div>
        <div style={{ color: "var(--dash-text-muted)", fontSize: 13, marginTop: 4 }}>{profile.email}</div>
        {profile.phone && <div style={{ color: "var(--dash-text-muted)", fontSize: 13, marginTop: 2 }}>{profile.phone}</div>}
        {(profile.address || profile.city) && <div style={{ color: "var(--dash-text-muted)", fontSize: 13, marginTop: 2 }}>{[profile.address, profile.city].filter(Boolean).join(", ")}</div>}
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--dash-card-border)", display: "flex", gap: 10 }}>
          <div style={{ flex: 1, borderRadius: 10, padding: "10px 12px", background: restaurant.plan === "pro" ? "rgba(0,255,174,0.06)" : "rgba(255,255,255,0.04)", border: `1px solid ${restaurant.plan === "pro" ? "rgba(0,255,174,0.2)" : "var(--dash-card-border)"}` }}>
            <div style={{ color: "var(--dash-text-muted)", fontSize: 11, marginBottom: 4 }}>📦 Plano atual</div>
            <div style={{ color: restaurant.plan === "pro" ? "#00ffae" : "var(--dash-text)", fontSize: 15, fontWeight: 800 }}>{restaurant.plan === "pro" ? "Pro ⭐" : restaurant.plan === "trial" ? "Trial" : "Basic"}</div>
          </div>
          <div style={{ flex: 1, borderRadius: 10, padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--dash-card-border)" }}>
            <div style={{ color: "var(--dash-text-muted)", fontSize: 11, marginBottom: 4 }}>📊 Status</div>
            <div style={{ color: "var(--dash-text)", fontSize: 15, fontWeight: 800, textTransform: "capitalize" }}>{restaurant.status === "trial" ? "Trial ativo" : restaurant.status === "active" ? "Ativo" : restaurant.status}</div>
          </div>
        </div>
      </div>
      <button onClick={() => setView("profile")} className="modal-neon-card" style={{ padding: "14px 20px", borderRadius: 14, background: "var(--dash-card)", color: "var(--dash-text)", fontSize: 14, fontWeight: 600, cursor: "pointer", textAlign: "left" }}>
        ✏️ Editar perfil
      </button>
      <button onClick={() => setView("password")} className="modal-neon-card" style={{ padding: "14px 20px", borderRadius: 14, background: "var(--dash-card)", color: "var(--dash-text)", fontSize: 14, fontWeight: 600, cursor: "pointer", textAlign: "left" }}>
        🔑 Alterar senha
      </button>
      <form action="/api/auth/signout" method="post">
        <button type="submit" style={{ width: "100%", padding: "14px 20px", borderRadius: 14, border: "none", background: "rgba(255,80,80,0.08)", color: "#f87171", fontSize: 14, fontWeight: 600, cursor: "pointer", textAlign: "left" }}>
          🚪 Sair da conta
        </button>
      </form>
    </div>
  );
}
