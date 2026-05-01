"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, UtensilsCrossed, Receipt } from "lucide-react";
import {
  listOpenComandas, getAtendimentoCounts,
  type OpenComandaSummary,
} from "@/app/colaborador-app/atendimentoActions";
import BottomNav from "../_components/BottomNav";
import OpenComandaModal from "../_components/OpenComandaModal";
import { formatCents } from "@/lib/money";

type Tab = "todas" | "mesa" | "balcao";

function formatElapsed(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  const r = mins % 60;
  return r ? `${hrs}h${r}min` : `${hrs}h`;
}

export default function ComandasClient({ slug }: { slug: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("todas");
  const [items, setItems] = useState<OpenComandaSummary[]>([]);
  const [requirePhone, setRequirePhone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("fy_emp_token") ?? "";
      if (!token) { router.replace("/colaborador"); return; }
      const [list, counts] = await Promise.all([
        listOpenComandas(token),
        getAtendimentoCounts(token).catch(() => null),
      ]);
      setItems(list);
      // Pull require_phone from listMesasWithStatus would be heavy — fetch from a tiny call.
      // Reuse counts to also derive from a future expansion. For now: get on demand.
      void counts;
      setErr(null);
    } catch (e: any) {
      setErr(e?.message ?? "Erro ao carregar comandas");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { reload(); }, [reload]);

  // Lazy-load require_phone setting on modal open
  useEffect(() => {
    if (!modalOpen) return;
    (async () => {
      try {
        const token = sessionStorage.getItem("fy_emp_token") ?? "";
        const { listMesasWithStatus } = await import("@/app/colaborador-app/atendimentoActions");
        const r = await listMesasWithStatus(token);
        setRequirePhone(r.unitRequiresPhone);
      } catch { /* */ }
    })();
  }, [modalOpen]);

  const filtered = items.filter((c) => {
    if (tab === "todas") return true;
    if (tab === "mesa") return !!c.mesa_id;
    if (tab === "balcao") return !c.mesa_id;
    return true;
  });

  const counts = {
    todas: items.length,
    mesa:   items.filter((c) => !!c.mesa_id).length,
    balcao: items.filter((c) => !c.mesa_id).length,
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#fafafa",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      paddingBottom: 80,
    }}>
      <header style={{
        background: "#fff", borderBottom: "1px solid #e5e7eb",
        padding: "14px 16px", display: "flex", alignItems: "center", gap: 10,
        position: "sticky", top: 0, zIndex: 40,
      }}>
        <button
          onClick={() => router.push("/colaborador/home")}
          style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          aria-label="Voltar"
        >
          <ArrowLeft size={18} color="#374151" />
        </button>
        <span style={{ fontSize: 16, fontWeight: 800, color: "#111827", flex: 1 }}>Comandas</span>
        <button
          onClick={() => setModalOpen(true)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 14px", borderRadius: 10, border: "none",
            background: "#16a34a", color: "#fff",
            fontSize: 13, fontWeight: 700, fontFamily: "inherit",
            cursor: "pointer", boxShadow: "0 2px 6px rgba(22,163,74,0.25)",
          }}
        >
          <Plus size={14} strokeWidth={3} /> Nova
        </button>
      </header>

      {/* Tabs */}
      <div style={{
        display: "flex", background: "#fff",
        borderBottom: "1px solid #e5e7eb",
        position: "sticky", top: 64, zIndex: 39,
      }}>
        {([
          { id: "todas",  label: "Todas" },
          { id: "mesa",   label: "Mesa" },
          { id: "balcao", label: "Balcão" },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as Tab)}
            style={{
              flex: 1, padding: "12px 4px",
              background: "transparent", border: "none",
              borderBottom: tab === t.id ? "2px solid #16a34a" : "2px solid transparent",
              color: tab === t.id ? "#16a34a" : "#6b7280",
              fontSize: 13, fontWeight: 700, fontFamily: "inherit", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
            }}
          >
            {t.label}
            <span style={{
              background: tab === t.id ? "#16a34a" : "#e5e7eb",
              color: tab === t.id ? "#fff" : "#6b7280",
              fontSize: 11, fontWeight: 800, padding: "1px 7px", borderRadius: 10,
            }}>{counts[t.id as Tab]}</span>
          </button>
        ))}
      </div>

      <main style={{ maxWidth: 520, margin: "0 auto", padding: "16px" }}>
        {err && (
          <div role="alert" style={{
            padding: "10px 14px", borderRadius: 8, marginBottom: 14,
            background: "#fee2e2", border: "1px solid #fca5a5",
            color: "#991b1b", fontSize: 13, fontWeight: 600,
          }}>
            ⚠ {err}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#9ca3af", fontSize: 13 }}>Carregando comandas…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#111827", marginBottom: 6 }}>Nenhuma comanda em aberto</div>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>Toque em "Nova" pra abrir uma.</div>
          </div>
        ) : (
          filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => router.push(`/colaborador/comandas/${c.id}`)}
              style={{
                background: "#fff", borderRadius: 14, padding: 14,
                marginBottom: 10, cursor: "pointer",
                border: "1px solid #e5e7eb",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              }}
              onTouchStart={(e) => { e.currentTarget.style.background = "#f9fafb"; }}
              onTouchEnd={(e) => { e.currentTarget.style.background = "#fff"; }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#111827", marginBottom: 2 }}>
                    {c.customer_name ?? "Sem nome"}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                    {c.mesa_number ? (
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#9a3412", background: "#fed7aa", padding: "2px 8px", borderRadius: 6, display: "flex", alignItems: "center", gap: 3 }}>
                        <UtensilsCrossed size={11} /> Mesa {c.mesa_number}
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#1e40af", background: "#dbeafe", padding: "2px 8px", borderRadius: 6, display: "flex", alignItems: "center", gap: 3 }}>
                        <Receipt size={11} /> Balcão
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: "#6b7280", padding: "2px 0" }}>
                      🕐 {formatElapsed(c.created_at)}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#16a34a", lineHeight: 1 }}>
                    {formatCents(c.total)}
                  </div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                    {c.itemCount} {c.itemCount === 1 ? "item" : "itens"}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </main>

      {modalOpen && (
        <OpenComandaModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          unitRequiresPhone={requirePhone}
          onSuccess={(comandaId) => {
            setModalOpen(false);
            router.push(`/colaborador/comandas/${comandaId}`);
          }}
        />
      )}

      <BottomNav active="comandas" />
    </div>
  );
}
