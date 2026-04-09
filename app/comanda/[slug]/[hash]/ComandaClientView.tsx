"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ComandaRecord = {
  id: string;
  table_number: number | null;
  hash: string;
  status: string;
  created_at: string;
  opened_by?: string | null;
  opened_by_name?: string | null;
};

type ComandaItem = {
  id: string;
  comanda_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  addons: { name: string }[] | null;
  notes: string | null;
  status: string;
};

interface Props {
  comanda: ComandaRecord;
  initialItems: ComandaItem[];
  unitName: string;
  unitLogo: string | null;
  unitId: string;
  googleReviewUrl: string | null;
}

export default function ComandaClientView({ comanda: initialComanda, initialItems, unitName, unitId, googleReviewUrl }: Props) {
  const [comanda, setComanda] = useState<ComandaRecord>(initialComanda);
  const [items, setItems] = useState<ComandaItem[]>(initialItems);
  const [callingWaiter, setCallingWaiter] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [restaurantRating, setRestaurantRating] = useState(0);
  const [waiterRating, setWaiterRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showGoogleRedirect, setShowGoogleRedirect] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel(`comanda-client-${comanda.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "comanda_items", filter: `comanda_id=eq.${comanda.id}` }, (payload) => {
        if (payload.eventType === "INSERT") {
          setItems(prev => [...prev, payload.new as ComandaItem]);
        } else if (payload.eventType === "UPDATE") {
          setItems(prev => prev.map(i => i.id === payload.new.id ? { ...i, ...payload.new } : i));
        } else if (payload.eventType === "DELETE") {
          setItems(prev => prev.filter(i => i.id !== (payload.old as any).id));
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "comandas", filter: `id=eq.${comanda.id}` }, (payload) => {
        setComanda(prev => ({ ...prev, ...payload.new }));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [comanda.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const channel = supabase
      .channel("my-table-call")
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "table_calls",
        filter: `comanda_id=eq.${comanda.id}`,
      }, (payload) => {
        if (payload.new.status === "resolved") {
          setCallingWaiter(false);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [comanda.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCallWaiter() {
    setCallingWaiter(true);

    const { error } = await supabase.from("table_calls").insert({
      unit_id: unitId,
      comanda_id: comanda.id,
      table_number: comanda.table_number,
      type: "waiter",
      status: "pending",
    });

    if (error) {
      console.error("Erro ao chamar garçom:", error);
      setCallingWaiter(false);
      return;
    }

    // Resetar após 30 segundos (permite chamar novamente)
    setTimeout(() => setCallingWaiter(false), 30000);
  }

  useEffect(() => {
    if (comanda.status === "closed" || comanda.status === "pending_payment") {
      supabase.from("reviews").select("id").eq("comanda_id", comanda.id).limit(1)
        .then(({ data }) => {
          if (!data || data.length === 0) {
            setTimeout(() => setShowReview(true), 1500);
          } else {
            setReviewSubmitted(true);
          }
        });
    }
  }, [comanda.status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmitReview() {
    if (restaurantRating === 0 || waiterRating === 0) return;
    setSubmittingReview(true);

    try {
      const willRedirectGoogle = restaurantRating >= 4 && !!googleReviewUrl;

      await supabase.from("reviews").insert({
        unit_id: unitId,
        comanda_id: comanda.id,
        customer_name: null,
        restaurant_rating: restaurantRating,
        waiter_rating: waiterRating,
        waiter_id: comanda.opened_by ?? null,
        waiter_name: comanda.opened_by_name ?? null,
        comment: reviewComment.trim() || null,
        redirected_to_google: willRedirectGoogle,
      });

      setReviewSubmitted(true);
      setShowReview(false);

      if (willRedirectGoogle) {
        setShowGoogleRedirect(true);
        setTimeout(() => {
          window.open(googleReviewUrl!, "_blank");
        }, 2000);
      }
    } catch (err) {
      console.error("Erro ao enviar avaliação:", err);
    } finally {
      setSubmittingReview(false);
    }
  }

  const activeItems = items.filter(i => i.status !== "canceled");
  const total = activeItems.reduce((s, i) => s + i.quantity * i.unit_price, 0);

  const statusLabel = comanda.status === "open"
    ? "Comanda aberta"
    : comanda.status === "pending_payment"
    ? "Aguardando pagamento"
    : "Fechada";

  const statusStyle = comanda.status === "open"
    ? { background: "rgba(0,255,174,0.1)", color: "#00ffae" }
    : comanda.status === "pending_payment"
    ? { background: "rgba(251,191,36,0.1)", color: "#fbbf24" }
    : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" };

  function itemStatusLabel(s: string) {
    if (s === "pending") return "⏳ Aguardando";
    if (s === "confirmed") return "✅ Confirmado";
    if (s === "preparing") return "🔥 Preparando";
    if (s === "ready") return "🍽️ Pronto";
    if (s === "delivered") return "✓ Entregue";
    return "❌ Cancelado";
  }

  function itemStatusColor(s: string) {
    if (s === "delivered") return "#00ffae";
    if (s === "preparing" || s === "ready") return "#fbbf24";
    return "rgba(255,255,255,0.3)";
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", padding: "0 0 100px" }}>
      {/* Header */}
      <div style={{ padding: "20px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{unitName}</div>
        <div style={{ fontSize: 20, fontWeight: 800 }}>Mesa {comanda.table_number ?? "—"}</div>
        <div style={{
          display: "inline-block", padding: "3px 10px", borderRadius: 8, marginTop: 6,
          fontSize: 11, fontWeight: 600, ...statusStyle,
        }}>
          {statusLabel}
        </div>
      </div>

      {/* Items list */}
      <div style={{ padding: "16px" }}>
        {activeItems.length === 0 ? (
          <p style={{ color: "rgba(255,255,255,0.3)", textAlign: "center", padding: "40px 0" }}>
            Nenhum item adicionado ainda. Aguarde o garçom.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {activeItems.map(item => (
              <div key={item.id} style={{
                padding: "12px 16px", borderRadius: 14,
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{item.quantity}× </span>
                    <span style={{ fontSize: 14 }}>{item.product_name}</span>
                  </div>
                  <span style={{ color: "#00ffae", fontWeight: 700, fontSize: 14 }}>
                    R$ {((item.quantity * item.unit_price) / 100).toFixed(2).replace(".", ",")}
                  </span>
                </div>
                {item.notes && (
                  <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 4 }}>
                    📝 {item.notes}
                  </p>
                )}
                {item.addons && Array.isArray(item.addons) && item.addons.length > 0 && (
                  <div style={{ marginTop: 4, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                    + {item.addons.map(a => a.name).join(", ")}
                  </div>
                )}
                <div style={{
                  marginTop: 6, fontSize: 11, fontWeight: 600,
                  color: itemStatusColor(item.status),
                }}>
                  {itemStatusLabel(item.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Botão chamar garçom */}
      <div style={{ padding: "0 16px" }}>
        <button
          onClick={handleCallWaiter}
          disabled={callingWaiter}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: 14,
            border: "none",
            cursor: "pointer",
            background: callingWaiter ? "rgba(251,191,36,0.15)" : "rgba(251,191,36,0.1)",
            color: "#fbbf24",
            fontSize: 14,
            fontWeight: 700,
            marginTop: 16,
            transition: "all 0.3s",
          }}
        >
          {callingWaiter ? "✋ Garçom chamado! Aguarde..." : "🖐️ Chamar Garçom"}
        </button>
      </div>

      {/* Tela de avaliação */}
      {showReview && !reviewSubmitted && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(20px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 20,
          animation: "fadeIn 0.4s ease",
        }}>
          <div style={{
            width: "100%", maxWidth: 380,
            borderRadius: 24, padding: "28px 24px",
            background: "rgba(20,20,20,0.9)",
            boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset, 0 -1px 0 rgba(0,0,0,0.3) inset, 0 20px 60px rgba(0,0,0,0.5)",
          }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>⭐</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>Como foi sua experiência?</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>
                Sua avaliação ajuda a melhorar nosso atendimento
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>Restaurante</div>
              <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} onClick={() => setRestaurantRating(star)} style={{
                    background: "transparent", border: "none", cursor: "pointer",
                    fontSize: 32, padding: 4,
                    filter: star <= restaurantRating ? "none" : "grayscale(100%) opacity(0.3)",
                    transform: star <= restaurantRating ? "scale(1.1)" : "scale(1)",
                    transition: "all 0.2s",
                  }}>⭐</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>
                Garçom{comanda.opened_by_name ? `: ${comanda.opened_by_name}` : ""}
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} onClick={() => setWaiterRating(star)} style={{
                    background: "transparent", border: "none", cursor: "pointer",
                    fontSize: 32, padding: 4,
                    filter: star <= waiterRating ? "none" : "grayscale(100%) opacity(0.3)",
                    transform: star <= waiterRating ? "scale(1.1)" : "scale(1)",
                    transition: "all 0.2s",
                  }}>⭐</button>
                ))}
              </div>
            </div>

            {restaurantRating > 0 && restaurantRating <= 3 && (
              <div style={{ marginBottom: 16 }}>
                <textarea
                  placeholder="O que podemos melhorar?"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  style={{
                    width: "100%", minHeight: 70, padding: 12, borderRadius: 12,
                    background: "rgba(255,255,255,0.04)", border: "none",
                    color: "#fff", fontSize: 13, outline: "none",
                    resize: "none", boxSizing: "border-box",
                  }}
                />
              </div>
            )}

            <button
              onClick={handleSubmitReview}
              disabled={restaurantRating === 0 || waiterRating === 0 || submittingReview}
              style={{
                width: "100%", padding: 14, borderRadius: 14, border: "none",
                background: restaurantRating > 0 && waiterRating > 0 ? "rgba(0,255,174,0.1)" : "rgba(255,255,255,0.04)",
                color: restaurantRating > 0 && waiterRating > 0 ? "#00ffae" : "rgba(255,255,255,0.2)",
                fontSize: 15, fontWeight: 800, cursor: "pointer",
                boxShadow: restaurantRating > 0 && waiterRating > 0
                  ? "0 1px 0 rgba(0,255,174,0.12) inset, 0 -1px 0 rgba(0,0,0,0.2) inset"
                  : "none",
                opacity: submittingReview ? 0.5 : 1,
                transition: "all 0.3s",
              }}
            >
              {submittingReview ? "Enviando..." : "Enviar avaliação"}
            </button>

            <button onClick={() => { setShowReview(false); setReviewSubmitted(true); }} style={{
              width: "100%", padding: 10, marginTop: 8, borderRadius: 12, border: "none",
              background: "transparent", color: "rgba(255,255,255,0.25)",
              fontSize: 12, cursor: "pointer",
            }}>
              Pular
            </button>
          </div>
        </div>
      )}

      {/* Redirecionamento Google */}
      {showGoogleRedirect && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1001,
          background: "rgba(0,0,0,0.9)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 20,
        }}>
          <div style={{ textAlign: "center", maxWidth: 320 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 8 }}>Obrigado pela avaliação!</div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", marginBottom: 20, lineHeight: 1.5 }}>
              Que tal compartilhar essa experiência no Google? Sua avaliação ajuda outros clientes!
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Abrindo Google Reviews...</div>
            <a href={googleReviewUrl!} target="_blank" rel="noopener noreferrer" style={{
              display: "inline-block", marginTop: 16, padding: "12px 24px", borderRadius: 14,
              background: "rgba(66,133,244,0.15)", color: "#4285f4",
              fontSize: 14, fontWeight: 700, textDecoration: "none",
            }}>
              Avaliar no Google →
            </a>
            <button onClick={() => setShowGoogleRedirect(false)} style={{
              display: "block", width: "100%", marginTop: 12, padding: 10, borderRadius: 12,
              background: "transparent", border: "none", color: "rgba(255,255,255,0.2)",
              fontSize: 12, cursor: "pointer",
            }}>Fechar</button>
          </div>
        </div>
      )}

      {/* Footer with total */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        padding: "16px 20px", background: "rgba(10,10,10,0.95)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(20px)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
              {activeItems.length} ite{activeItems.length !== 1 ? "ns" : "m"}
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#00ffae" }}>
              R$ {(total / 100).toFixed(2).replace(".", ",")}
            </div>
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
            Atualiza em tempo real
          </div>
        </div>
      </div>
    </div>
  );
}
