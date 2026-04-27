"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, X, UtensilsCrossed, Receipt } from "lucide-react";
import {
  getComandaDetail,
  type ComandaDetailResult,
} from "@/app/colaborador-app/atendimentoActions";
import BottomNav from "../../_components/BottomNav";

function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ComandaDetailClient({
  slug, comandaId,
}: { slug: string; comandaId: string }) {
  const router = useRouter();
  const [data, setData] = useState<ComandaDetailResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const token = sessionStorage.getItem("fy_emp_token") ?? "";
        if (!token) { router.replace("/colaborador"); return; }
        const result = await getComandaDetail(token, comandaId);
        if (!result) {
          setErr("Comanda não encontrada.");
        } else {
          setData(result);
        }
      } catch (e: any) {
        setErr(e?.message ?? "Erro ao carregar comanda");
      } finally {
        setLoading(false);
      }
    })();
  }, [comandaId, router]);

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
          onClick={() => router.push("/colaborador/comandas")}
          style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          aria-label="Voltar"
        >
          <ArrowLeft size={18} color="#374151" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#111827", lineHeight: 1.2 }}>
            {loading ? "Carregando..." : data?.customer_name ?? "Comanda"}
          </div>
          {data && (
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
              {data.mesa_number ? `Mesa ${data.mesa_number}` : "Balcão"}
              {data.guest_count ? ` · ${data.guest_count} pessoa${data.guest_count !== 1 ? "s" : ""}` : ""}
              {data.short_code ? ` · #${data.short_code}` : ""}
            </div>
          )}
        </div>
      </header>

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
          <div style={{ textAlign: "center", padding: 40, color: "#9ca3af", fontSize: 13 }}>Carregando…</div>
        ) : data ? (
          <>
            {/* Total card */}
            <div style={{
              background: "#fff", borderRadius: 14, padding: "16px 18px",
              marginBottom: 14, border: "1px solid #e5e7eb",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Total atual
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color: "#16a34a", marginTop: 4 }}>
                  {formatBRL(data.total)}
                </div>
              </div>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: data.mesa_number ? "#fed7aa" : "#dbeafe",
                color: data.mesa_number ? "#9a3412" : "#1e40af",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {data.mesa_number ? <UtensilsCrossed size={20} /> : <Receipt size={20} />}
              </div>
            </div>

            {/* Items section — placeholder */}
            <div style={{
              background: "#fff", borderRadius: 14, padding: "20px 18px",
              marginBottom: 14, border: "1px solid #e5e7eb",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🛒</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 4 }}>
                Nenhum item ainda
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 14 }}>
                Lançar pedidos no cardápio será habilitado em breve.
              </div>
              <button
                disabled
                style={{
                  width: "100%", padding: "11px", borderRadius: 10,
                  border: "1px dashed #d1d5db", background: "#f9fafb",
                  color: "#9ca3af", fontSize: 13, fontWeight: 700,
                  fontFamily: "inherit", cursor: "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                <Plus size={14} /> Adicionar item (em breve)
              </button>
            </div>

            {data.notes && (
              <div style={{
                background: "#fefce8", border: "1px solid #fef08a",
                borderRadius: 12, padding: "12px 14px", marginBottom: 14,
              }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#854d0e", textTransform: "uppercase", marginBottom: 4 }}>
                  Observações
                </div>
                <div style={{ fontSize: 13, color: "#713f12", lineHeight: 1.5 }}>{data.notes}</div>
              </div>
            )}

            {/* Action buttons (placeholders) */}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                disabled
                style={{
                  flex: 1, padding: "13px", borderRadius: 12,
                  border: "1px solid #fca5a5", background: "#fef2f2",
                  color: "#9ca3af", fontSize: 13, fontWeight: 700,
                  fontFamily: "inherit", cursor: "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                <X size={14} /> Fechar comanda (em breve)
              </button>
            </div>
          </>
        ) : null}
      </main>

      <BottomNav active="comandas" />
    </div>
  );
}
