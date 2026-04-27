"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Plus, X, UtensilsCrossed, Receipt, Send, MoreVertical, Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  getComandaDetail, sendCartToKitchen,
  type ComandaFullDetail, type ComandaItemRow, type CartItemInput,
} from "./actions";
import BottomNav from "../../_components/BottomNav";
import ProductPickerModal from "./ProductPickerModal";

function fmtBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: "Aguardando", color: "#9a3412", bg: "#fed7aa" },
  preparing: { label: "Preparando", color: "#854d0e", bg: "#fef08a" },
  ready:     { label: "Pronto",     color: "#15803d", bg: "#bbf7d0" },
  delivered: { label: "Entregue",   color: "#1e3a8a", bg: "#bfdbfe" },
};

type CartItem = CartItemInput & { tempId: string };

export default function ComandaDetailClient({
  slug, comandaId,
}: { slug: string; comandaId: string }) {
  const router = useRouter();
  const [data, setData] = useState<ComandaFullDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const flashToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const reload = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const token = sessionStorage.getItem("fy_emp_token") ?? "";
      if (!token) { router.replace("/colaborador"); return; }
      const result = await getComandaDetail(token, comandaId);
      if (!result) { setErr("Comanda não encontrada."); return; }
      setData(result);
      setErr(null);
    } catch (e: any) {
      setErr(e?.message ?? "Erro ao carregar comanda");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [comandaId, router]);

  useEffect(() => { reload(); }, [reload]);

  // Realtime: refetch on item or comanda change
  useEffect(() => {
    if (!data?.id) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`comanda-detail-${data.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "comanda_items", filter: `comanda_id=eq.${data.id}` },
        () => { reload(true); })
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "comandas", filter: `id=eq.${data.id}` },
        () => { reload(true); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [data?.id, reload]);

  // Warn before navigating away with non-empty cart
  useEffect(() => {
    if (cart.length === 0) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [cart.length]);

  function handleBack() {
    if (cart.length > 0) {
      flashToast("Você tem itens não enviados — envie ou descarte primeiro.");
      return;
    }
    router.push("/colaborador/comandas");
  }

  function addToCart(item: CartItemInput) {
    setCart((prev) => [...prev, { ...item, tempId: Math.random().toString(36).slice(2, 10) }]);
    flashToast("Adicionado ao carrinho");
  }

  function removeFromCart(tempId: string) {
    setCart((prev) => prev.filter((c) => c.tempId !== tempId));
  }

  function updateCartQty(tempId: string, qty: number) {
    setCart((prev) => prev.map((c) => c.tempId === tempId ? { ...c, quantity: Math.max(1, qty) } : c));
  }

  async function handleSendCart() {
    if (cart.length === 0) return;
    setSending(true);
    try {
      const token = sessionStorage.getItem("fy_emp_token") ?? "";
      const payload: CartItemInput[] = cart.map(({ tempId: _t, ...rest }) => rest);
      const result = await sendCartToKitchen(token, comandaId, payload);
      if (!result.ok) {
        setErr(result.error);
        setSending(false);
        setShowSendConfirm(false);
        return;
      }
      const count = result.itemsAdded;
      setCart([]);
      setShowSendConfirm(false);
      flashToast(`${count} ${count === 1 ? "item enviado" : "itens enviados"} pra cozinha!`);
      await reload(true);
    } catch (e: any) {
      setErr(e?.message ?? "Erro ao enviar itens");
    } finally {
      setSending(false);
    }
  }

  const cartTotal = cart.reduce((s, i) => s + (i.unitPrice * i.quantity), 0);
  const sentItems = data?.items ?? [];

  return (
    <div style={{
      minHeight: "100vh", background: "#fafafa",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      paddingBottom: cart.length > 0 ? 160 : 100,
    }}>
      <header style={{
        background: "#fff", borderBottom: "1px solid #e5e7eb",
        padding: "12px 16px", display: "flex", alignItems: "center", gap: 10,
        position: "sticky", top: 0, zIndex: 40,
      }}>
        <button
          onClick={handleBack}
          style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          aria-label="Voltar"
        >
          <ArrowLeft size={18} color="#374151" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#111827", lineHeight: 1.2 }}>
            {data ? `Comanda #${data.short_code ?? "—"}` : "Carregando..."}
          </div>
          {data && (
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {data.customer_name ?? "Sem nome"} · {data.mesa_number ? `Mesa ${data.mesa_number}` : "Balcão"}
              {data.guest_count ? ` · ${data.guest_count}p` : ""}
            </div>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 560, margin: "0 auto", padding: "16px" }}>
        {err && (
          <div role="alert" style={{
            padding: "10px 14px", borderRadius: 8, marginBottom: 14,
            background: "#fee2e2", border: "1px solid #fca5a5",
            color: "#991b1b", fontSize: 13, fontWeight: 600,
          }}>⚠ {err}</div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#9ca3af", fontSize: 13 }}>Carregando…</div>
        ) : data ? (
          <>
            {/* Resumo */}
            <div style={{
              background: "#fff", borderRadius: 14, padding: "16px 18px",
              marginBottom: 14, border: "1px solid #e5e7eb",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Total atual
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color: "#16a34a", marginTop: 4 }}>{fmtBRL(data.total)}</div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                  {sentItems.length} {sentItems.length === 1 ? "item" : "itens"} · aberta às {fmtTime(data.created_at)}
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

            {/* Items já enviados */}
            <section style={{ marginBottom: 14 }}>
              <div style={sectionTitle}>Itens da comanda</div>
              {sentItems.length === 0 ? (
                <div style={{
                  background: "#fff", border: "1px dashed #d1d5db", borderRadius: 12,
                  padding: 22, textAlign: "center", color: "#6b7280", fontSize: 13,
                }}>
                  Nenhum item ainda. Toque em <strong>+ Adicionar item</strong> para começar.
                </div>
              ) : (
                sentItems.map((it) => <SentItemRow key={it.id} item={it} />)
              )}
            </section>

            {/* Carrinho temporário */}
            {cart.length > 0 && (
              <section style={{
                background: "#fff7ed", border: "1px solid #fed7aa",
                borderRadius: 14, padding: 12, marginBottom: 14,
              }}>
                <div style={{ ...sectionTitle, color: "#9a3412", marginLeft: 4, marginBottom: 8 }}>
                  Itens a enviar ({cart.length})
                </div>
                {cart.map((c) => <CartItemRow key={c.tempId} item={c} onRemove={removeFromCart} onChangeQty={updateCartQty} />)}
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 6px 4px", marginTop: 4, borderTop: "1px dashed #fed7aa",
                }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#9a3412" }}>Subtotal a enviar</span>
                  <span style={{ fontSize: 16, fontWeight: 900, color: "#9a3412" }}>{fmtBRL(cartTotal)}</span>
                </div>
              </section>
            )}

            {data.notes && (
              <div style={{
                background: "#fefce8", border: "1px solid #fef08a",
                borderRadius: 12, padding: "12px 14px", marginBottom: 14,
              }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#854d0e", textTransform: "uppercase", marginBottom: 4 }}>
                  Observações da comanda
                </div>
                <div style={{ fontSize: 13, color: "#713f12", lineHeight: 1.5 }}>{data.notes}</div>
              </div>
            )}
          </>
        ) : null}
      </main>

      {/* Footer fixo */}
      <footer style={{
        position: "fixed", bottom: 56, left: 0, right: 0, zIndex: 30,
        background: "#fff", borderTop: "1px solid #e5e7eb",
        padding: "10px 16px",
        display: "flex", flexDirection: "column", gap: 8,
        boxShadow: "0 -4px 12px rgba(0,0,0,0.04)",
      }}>
        {cart.length > 0 ? (
          <>
            <button
              onClick={() => setShowSendConfirm(true)}
              disabled={sending}
              style={{
                width: "100%", padding: 13, borderRadius: 12, border: "none",
                background: sending ? "#9ca3af" : "#f97316",
                color: "#fff", fontSize: 15, fontWeight: 800, fontFamily: "inherit",
                cursor: sending ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: "0 2px 6px rgba(249,115,22,0.3)",
              }}
            >
              <Send size={16} strokeWidth={3} />
              Enviar p/ cozinha ({cart.length})
            </button>
            <button
              onClick={() => setShowPicker(true)}
              style={{
                width: "100%", padding: 11, borderRadius: 12, border: "1px solid #16a34a",
                background: "#f0fdf4", color: "#15803d",
                fontSize: 13, fontWeight: 700, fontFamily: "inherit",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              <Plus size={15} strokeWidth={3} /> Adicionar mais um item
            </button>
          </>
        ) : (
          <button
            onClick={() => setShowPicker(true)}
            style={{
              width: "100%", padding: 13, borderRadius: 12, border: "none",
              background: "#16a34a", color: "#fff",
              fontSize: 15, fontWeight: 800, fontFamily: "inherit",
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: "0 2px 6px rgba(22,163,74,0.25)",
            }}
          >
            <Plus size={16} strokeWidth={3} /> Adicionar item
          </button>
        )}
      </footer>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 200, left: 0, right: 0,
          display: "flex", justifyContent: "center", zIndex: 60, pointerEvents: "none",
        }}>
          <div style={{
            background: "#16a34a", color: "#fff",
            padding: "10px 20px", borderRadius: 12,
            fontSize: 13, fontWeight: 700,
            boxShadow: "0 4px 16px rgba(22,163,74,0.35)",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <Check size={16} strokeWidth={3} />
            {toast}
          </div>
        </div>
      )}

      <ProductPickerModal
        open={showPicker}
        onClose={() => setShowPicker(false)}
        onAdd={(item) => addToCart(item)}
      />

      {showSendConfirm && data && (
        <SendConfirmModal
          items={cart}
          total={cartTotal}
          submitting={sending}
          onCancel={() => setShowSendConfirm(false)}
          onConfirm={handleSendCart}
        />
      )}

      <BottomNav active="comandas" />
    </div>
  );
}

const sectionTitle: React.CSSProperties = {
  fontSize: 11, fontWeight: 800, color: "#9ca3af",
  textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8,
};

function SentItemRow({ item }: { item: ComandaItemRow }) {
  const status = STATUS_LABEL[item.status] ?? STATUS_LABEL.pending;
  return (
    <div style={{
      background: "#fff", border: "1px solid #e5e7eb",
      borderRadius: 12, padding: 12, marginBottom: 8,
      display: "flex", gap: 10,
    }}>
      <div style={{
        width: 36, minWidth: 36, height: 36, borderRadius: 8,
        background: "#f3f4f6", color: "#374151",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, fontWeight: 800,
      }}>{item.quantity}×</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", lineHeight: 1.3 }}>
          {item.product_name}
        </div>
        {item.notes && (
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2, fontStyle: "italic" }}>
            "{item.notes}"
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{
            fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 6,
            background: status.bg, color: status.color, textTransform: "uppercase", letterSpacing: "0.03em",
          }}>{status.label}</span>
          <span style={{ fontSize: 11, color: "#6b7280" }}>
            {fmtTime(item.created_at)}
            {item.added_by_name ? ` · ${item.added_by_name}` : ""}
          </span>
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#16a34a" }}>
          {fmtBRL(item.unit_price * item.quantity)}
        </div>
        <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>
          {fmtBRL(item.unit_price)} cada
        </div>
      </div>
    </div>
  );
}

function CartItemRow({
  item, onRemove, onChangeQty,
}: {
  item: CartItem;
  onRemove: (id: string) => void;
  onChangeQty: (id: string, q: number) => void;
}) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #fed7aa",
      borderRadius: 10, padding: 10, marginBottom: 6,
      display: "flex", gap: 8, alignItems: "center",
    }}>
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <button
          onClick={() => onChangeQty(item.tempId, item.quantity - 1)}
          aria-label="Diminuir"
          style={smallQtyBtn}
        >−</button>
        <span style={{ fontSize: 13, fontWeight: 800, color: "#111827", minWidth: 22, textAlign: "center" }}>{item.quantity}</span>
        <button
          onClick={() => onChangeQty(item.tempId, item.quantity + 1)}
          aria-label="Aumentar"
          style={smallQtyBtn}
        >+</button>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", lineHeight: 1.3 }}>
          {item.variationName ? `${item.productName} — ${item.variationName}` : item.productName}
        </div>
        {item.notes && (
          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 1, fontStyle: "italic" }}>
            "{item.notes}"
          </div>
        )}
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#9a3412" }}>
          {fmtBRL(item.unitPrice * item.quantity)}
        </div>
      </div>
      <button
        onClick={() => onRemove(item.tempId)}
        aria-label="Remover"
        style={{
          width: 26, height: 26, borderRadius: 8,
          border: "1px solid #fecaca", background: "#fef2f2",
          color: "#b91c1c", display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", flexShrink: 0,
        }}
      ><X size={14} /></button>
    </div>
  );
}

const smallQtyBtn: React.CSSProperties = {
  width: 26, height: 26, borderRadius: 8,
  border: "1px solid #e5e7eb", background: "#fafafa",
  fontSize: 14, fontWeight: 800, color: "#374151",
  display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer", fontFamily: "inherit",
};

function SendConfirmModal({
  items, total, submitting, onCancel, onConfirm,
}: {
  items: CartItem[];
  total: number;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget && !submitting) onCancel(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 110,
        background: "rgba(0,0,0,0.55)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
    >
      <div style={{
        background: "#fff", width: "100%", maxWidth: 520,
        borderRadius: "20px 20px 0 0",
        animation: "slideUpC 0.22s ease",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}>
        <style>{`@keyframes slideUpC { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

        <div style={{ padding: "10px 0 4px", display: "flex", justifyContent: "center" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "#d1d5db" }} />
        </div>

        <div style={{ padding: "8px 22px 22px" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
            Confirmar envio
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#111827", marginBottom: 12 }}>
            Enviar {items.length} {items.length === 1 ? "item" : "itens"} pra cozinha?
          </div>

          <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: 10, marginBottom: 14, maxHeight: 220, overflowY: "auto" }}>
            {items.map((i) => (
              <div key={i.tempId} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13, color: "#9a3412" }}>
                <span style={{ fontWeight: 700 }}>{i.quantity}× {i.variationName ? `${i.productName} — ${i.variationName}` : i.productName}</span>
                <span style={{ fontWeight: 800 }}>{fmtBRL(i.unitPrice * i.quantity)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed #fed7aa", paddingTop: 8, marginTop: 6, fontSize: 14, fontWeight: 900, color: "#7c2d12" }}>
              <span>Total</span><span>{fmtBRL(total)}</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onCancel}
              disabled={submitting}
              style={{
                flex: 1, padding: 13, borderRadius: 12,
                border: "1px solid #e5e7eb", background: "#fff",
                color: "#374151", fontSize: 14, fontWeight: 700, fontFamily: "inherit",
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >Cancelar</button>
            <button
              onClick={onConfirm}
              disabled={submitting}
              style={{
                flex: 2, padding: 13, borderRadius: 12, border: "none",
                background: submitting ? "#9ca3af" : "#f97316",
                color: "#fff", fontSize: 14, fontWeight: 800, fontFamily: "inherit",
                cursor: submitting ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                boxShadow: "0 2px 6px rgba(249,115,22,0.3)",
              }}
            >
              <Send size={16} strokeWidth={3} />
              {submitting ? "Enviando…" : "Confirmar envio"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
