"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bell } from "lucide-react";
import {
  listMesasWithStatus,
  type MesaWithStatus,
  type MesasResult,
} from "@/app/colaborador-app/atendimentoActions";
import BottomNav from "../_components/BottomNav";
import OpenComandaModal from "../_components/OpenComandaModal";

type Tab = "todas" | "ocupadas" | "livres" | "reservadas";

function formatElapsed(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  const r = mins % 60;
  return r ? `${hrs}h${r}min` : `${hrs}h`;
}

export default function MesasClient({ slug }: { slug: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("todas");
  const [data, setData] = useState<MesasResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [modalMesa, setModalMesa] = useState<MesaWithStatus | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("fy_emp_token") ?? "";
      if (!token) { router.replace("/colaborador"); return; }
      const result = await listMesasWithStatus(token);
      setData(result);
      setErr(null);
    } catch (e: any) {
      setErr(e?.message ?? "Erro ao carregar mesas");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { reload(); }, [reload]);

  const mesas = data?.mesas ?? [];
  const filtered = mesas.filter((m) => {
    if (tab === "todas") return true;
    if (tab === "ocupadas") return m.status === "occupied";
    if (tab === "livres") return m.status === "available" || m.status === "free";
    if (tab === "reservadas") return m.status === "reserved";
    return true;
  });

  const counts = {
    todas: mesas.length,
    ocupadas: mesas.filter((m) => m.status === "occupied").length,
    livres: mesas.filter((m) => m.status === "available" || m.status === "free").length,
    reservadas: mesas.filter((m) => m.status === "reserved").length,
  };

  function handleMesaClick(m: MesaWithStatus) {
    if (m.status === "occupied" && m.comanda) {
      router.push(`/colaborador/comandas/${m.comanda.id}`);
      return;
    }
    if (m.status === "available" || m.status === "free") {
      setModalMesa(m);
      return;
    }
    // Reserved or other status — for now do nothing
  }

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
        <span style={{ fontSize: 16, fontWeight: 800, color: "#111827", flex: 1 }}>Mesas do Salão</span>
        {data && data.pendingCallsCount > 0 && (
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: "#dc2626", background: "#fee2e2", padding: "4px 10px", borderRadius: 999 }}>
            <Bell size={12} /> {data.pendingCallsCount}
          </span>
        )}
      </header>

      {/* Tabs */}
      <div style={{
        display: "flex", background: "#fff",
        borderBottom: "1px solid #e5e7eb",
        position: "sticky", top: 64, zIndex: 39,
        overflowX: "auto",
      }}>
        {([
          { id: "todas",      label: "Todas" },
          { id: "ocupadas",   label: "Ocupadas" },
          { id: "livres",     label: "Livres" },
          { id: "reservadas", label: "Reservadas" },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as Tab)}
            style={{
              flex: 1, minWidth: 80, padding: "12px 4px",
              background: "transparent", border: "none",
              borderBottom: tab === t.id ? "2px solid #16a34a" : "2px solid transparent",
              color: tab === t.id ? "#16a34a" : "#6b7280",
              fontSize: 12, fontWeight: 700, fontFamily: "inherit", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
            }}
          >
            {t.label}
            <span style={{
              background: tab === t.id ? "#16a34a" : "#e5e7eb",
              color: tab === t.id ? "#fff" : "#6b7280",
              fontSize: 10, fontWeight: 800, padding: "1px 6px", borderRadius: 10,
            }}>{counts[t.id as Tab]}</span>
          </button>
        ))}
      </div>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "16px" }}>
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
          <div style={{ textAlign: "center", padding: 40, color: "#9ca3af", fontSize: 13 }}>Carregando mesas…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#9ca3af", fontSize: 13 }}>
            Nenhuma mesa nesta categoria.
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
            gap: 10,
          }}>
            {filtered.map((m) => <MesaCard key={m.id} mesa={m} onClick={() => handleMesaClick(m)} />)}
          </div>
        )}
      </main>

      {modalMesa && (
        <OpenComandaModal
          open={!!modalMesa}
          onClose={() => setModalMesa(null)}
          unitRequiresPhone={data?.unitRequiresPhone}
          preselectedMesaId={modalMesa.id}
          preselectedMesaNumber={modalMesa.number}
          onSuccess={(comandaId) => {
            setModalMesa(null);
            router.push(`/colaborador/comandas/${comandaId}`);
          }}
        />
      )}

      <BottomNav active="mesas" pendingCount={(data?.pendingCallsCount ?? 0)} />
    </div>
  );
}

function MesaCard({ mesa, onClick }: { mesa: MesaWithStatus; onClick: () => void }) {
  const isOccupied = mesa.status === "occupied";
  const isReserved = mesa.status === "reserved";
  const isCalling  = mesa.has_pending_call;

  const palette = isOccupied
    ? { bg: "#fed7aa", border: "#f97316", color: "#9a3412" }
    : isReserved
      ? { bg: "#dbeafe", border: "#2563eb", color: "#1e40af" }
      : { bg: "#dcfce7", border: "#16a34a", color: "#15803d" };

  return (
    <button
      onClick={onClick}
      style={{
        position: "relative",
        background: palette.bg,
        border: `2px solid ${palette.border}`,
        borderRadius: 14, padding: "14px 8px",
        cursor: "pointer", fontFamily: "inherit",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        minHeight: 110,
        transition: "transform 0.1s",
      }}
      onTouchStart={(e) => { e.currentTarget.style.transform = "scale(0.97)"; }}
      onTouchEnd={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      {isCalling && (
        <span style={{
          position: "absolute", top: -8, right: -8,
          background: "#dc2626", color: "#fff",
          fontSize: 11, fontWeight: 800,
          padding: "3px 8px", borderRadius: 999,
          display: "flex", alignItems: "center", gap: 4,
          boxShadow: "0 2px 6px rgba(220,38,38,0.4)",
          animation: "callPulse 1.4s ease-in-out infinite",
        }}>
          🔔 Chamou
          <style>{`@keyframes callPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }`}</style>
        </span>
      )}
      <div style={{ fontSize: 32, fontWeight: 800, color: palette.color, lineHeight: 1 }}>
        {mesa.number}
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, color: palette.color, marginTop: 4, textAlign: "center" }}>
        {isOccupied
          ? mesa.comanda
            ? <>{mesa.comanda.customer_name ?? "Sem nome"}<br />{formatElapsed(mesa.comanda.opened_at)}</>
            : "Ocupada"
          : isReserved
            ? "Reservada"
            : "Livre"}
      </div>
    </button>
  );
}
