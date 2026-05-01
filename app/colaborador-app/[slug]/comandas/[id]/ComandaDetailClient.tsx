"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Plus, X, UtensilsCrossed, Receipt, Send, MoreVertical, Check, Pencil, Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  getComandaDetail, sendCartToKitchen,
  cancelComandaItem, updateComandaInfo, cancelComanda,
  buildPartialCheckPrintJob, buildFinalReceiptPrintJob,
  type ComandaFullDetail, type ComandaItemRow, type CartItemInput,
  type CloseSplit, type PaymentMethod,
} from "./actions";
import BottomNav from "../../_components/BottomNav";
import ProductPickerModal from "./ProductPickerModal";
import CloseComandaModal from "./CloseComandaModal";
import ReceiptPrinter, { type PrintJobLite } from "@/components/print/ReceiptPrinter";
import { Printer } from "lucide-react";
import { formatCents as fmtBRL } from "@/lib/money";

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
  const [openMenu, setOpenMenu] = useState(false);
  const [cancelItemId, setCancelItemId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCancelComanda, setShowCancelComanda] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [receipt, setReceipt] = useState<{ splits: CloseSplit[]; total: number } | null>(null);
  const [printJobs, setPrintJobs] = useState<PrintJobLite[] | null>(null);

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
      // Trigger kitchen prints for matching printers (best-effort)
      if (result.printJobs && result.printJobs.length > 0) {
        setPrintJobs(result.printJobs.map((j) => ({
          printerId: j.printerId, printerName: j.printerName, html: j.html,
        })));
      }
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
        {data && data.status === "open" && (
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setOpenMenu((v) => !v)}
              aria-label="Mais opções"
              style={{
                width: 36, height: 36, borderRadius: 10, border: "1px solid #e5e7eb",
                background: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <MoreVertical size={18} color="#374151" />
            </button>
            {openMenu && (
              <>
                <div onClick={() => setOpenMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 35 }} />
                <div style={{
                  position: "absolute", top: 42, right: 0,
                  width: 220, background: "#fff",
                  border: "1px solid #e5e7eb", borderRadius: 12,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                  overflow: "hidden", zIndex: 36,
                }}>
                  <button
                    onClick={() => { setOpenMenu(false); setShowEditModal(true); }}
                    style={menuItemStyle}
                  >
                    <Pencil size={14} /> Editar dados
                  </button>
                  <button
                    onClick={async () => {
                      setOpenMenu(false);
                      try {
                        const token = sessionStorage.getItem("fy_emp_token") ?? "";
                        const result = await buildPartialCheckPrintJob(token, comandaId);
                        if (!result.ok) { setErr(result.error); return; }
                        if (!result.job) {
                          setErr("Nenhuma impressora configurada. Cadastre uma no painel.");
                          return;
                        }
                        setPrintJobs([{ printerId: result.job.printerId, printerName: result.job.printerName, html: result.job.html }]);
                        flashToast("Imprimindo conta parcial…");
                      } catch (e: any) {
                        setErr(e?.message ?? "Erro ao imprimir");
                      }
                    }}
                    style={{ ...menuItemStyle, borderTop: "1px solid #f3f4f6" }}
                  >
                    <Printer size={14} /> Imprimir conta parcial
                  </button>
                  <button
                    onClick={() => { setOpenMenu(false); setShowCancelComanda(true); }}
                    style={{ ...menuItemStyle, color: "#b91c1c", borderTop: "1px solid #f3f4f6" }}
                  >
                    <Trash2 size={14} /> Cancelar comanda
                  </button>
                </div>
              </>
            )}
          </div>
        )}
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
                sentItems.map((it) => (
                  <SentItemRow
                    key={it.id}
                    item={it}
                    onCancel={() => setCancelItemId(it.id)}
                  />
                ))
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
          <>
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
            {data && data.status === "open" && data.total > 0 && (
              <button
                onClick={() => setShowCloseModal(true)}
                style={{
                  width: "100%", padding: 11, borderRadius: 12,
                  border: "1px solid #2563eb", background: "#eff6ff",
                  color: "#1d4ed8", fontSize: 13, fontWeight: 700, fontFamily: "inherit",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                Fechar comanda · {fmtBRL(data.total)}
              </button>
            )}
          </>
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

      {cancelItemId && (
        <CancelItemModal
          itemId={cancelItemId}
          itemName={sentItems.find((i) => i.id === cancelItemId)?.product_name ?? ""}
          onClose={() => setCancelItemId(null)}
          onSuccess={async () => {
            setCancelItemId(null);
            flashToast("Item cancelado");
            await reload(true);
          }}
          onError={(msg) => setErr(msg)}
        />
      )}

      {showEditModal && data && (
        <EditComandaModal
          comanda={data}
          onClose={() => setShowEditModal(false)}
          onSuccess={async () => {
            setShowEditModal(false);
            flashToast("Dados atualizados");
            await reload(true);
          }}
          onError={(msg) => setErr(msg)}
        />
      )}

      {showCancelComanda && data && (
        <CancelComandaModal
          comandaId={data.id}
          shortCode={data.short_code}
          onClose={() => setShowCancelComanda(false)}
          onSuccess={() => {
            flashToast("Comanda cancelada");
            setShowCancelComanda(false);
            setTimeout(() => router.push("/colaborador/comandas"), 800);
          }}
          onError={(msg) => setErr(msg)}
        />
      )}

      {showCloseModal && data && (
        <CloseComandaModal
          open={showCloseModal}
          comandaId={data.id}
          shortCode={data.short_code}
          customerName={data.customer_name}
          total={data.total}
          onClose={() => setShowCloseModal(false)}
          onClosed={(_count, splits) => {
            setShowCloseModal(false);
            setReceipt({ splits, total: data.total });
          }}
        />
      )}

      {receipt && (
        <ReceiptModal
          shortCode={data?.short_code ?? null}
          splits={receipt.splits}
          total={receipt.total}
          comandaId={comandaId}
          onPrint={async () => {
            try {
              const token = sessionStorage.getItem("fy_emp_token") ?? "";
              const result = await buildFinalReceiptPrintJob(token, comandaId);
              if (!result.ok) { setErr(result.error); return; }
              if (!result.job) {
                setErr("Nenhuma impressora configurada. Cadastre uma no painel.");
                return;
              }
              setPrintJobs([{ printerId: result.job.printerId, printerName: result.job.printerName, html: result.job.html }]);
            } catch (e: any) {
              setErr(e?.message ?? "Erro ao imprimir recibo");
            }
          }}
          onClose={() => {
            setReceipt(null);
            router.push("/colaborador/comandas");
          }}
        />
      )}

      <ReceiptPrinter jobs={printJobs} onComplete={() => setPrintJobs(null)} />

      <BottomNav active="comandas" />
    </div>
  );
}

const sectionTitle: React.CSSProperties = {
  fontSize: 11, fontWeight: 800, color: "#9ca3af",
  textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8,
};

function SentItemRow({ item, onCancel }: { item: ComandaItemRow; onCancel: () => void }) {
  const status = STATUS_LABEL[item.status] ?? STATUS_LABEL.pending;
  // Allow cancel up to 'preparing'. Once delivered there's no point.
  const canCancel = item.status !== "delivered" && item.status !== "cancelled";
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
      <div style={{ textAlign: "right", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#16a34a" }}>
          {fmtBRL(item.unit_price * item.quantity)}
        </div>
        <div style={{ fontSize: 10, color: "#9ca3af" }}>
          {fmtBRL(item.unit_price)} cada
        </div>
        {canCancel && (
          <button
            onClick={onCancel}
            aria-label="Cancelar item"
            style={{
              marginTop: 2, padding: "3px 8px", borderRadius: 6,
              border: "1px solid #fecaca", background: "#fef2f2",
              color: "#b91c1c", fontSize: 10, fontWeight: 700, fontFamily: "inherit",
              cursor: "pointer",
            }}
          >Cancelar</button>
        )}
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

const menuItemStyle: React.CSSProperties = {
  width: "100%", display: "flex", alignItems: "center", gap: 8,
  padding: "12px 14px", border: "none", background: "#fff",
  fontSize: 13, fontWeight: 600, color: "#374151", fontFamily: "inherit",
  cursor: "pointer", textAlign: "left",
};

// ─── Cancel item / Edit / Cancel comanda modals ──────────────────────────────

function ModalShell({
  title, children, onClose, submitting,
}: {
  title: string; children: React.ReactNode; onClose: () => void; submitting?: boolean;
}) {
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}
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
        maxHeight: "92vh", overflowY: "auto",
      }}>
        <style>{`@keyframes slideUpC { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
        <div style={{ padding: "10px 0 4px", display: "flex", justifyContent: "center" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "#d1d5db" }} />
        </div>
        <div style={{ padding: "8px 22px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#111827" }}>{title}</div>
            <button onClick={onClose} disabled={submitting} aria-label="Fechar" style={{
              width: 32, height: 32, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: submitting ? "not-allowed" : "pointer",
            }}><X size={16} color="#6b7280" /></button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function ReasonInput({
  value, onChange, placeholder, disabled,
}: {
  value: string; onChange: (v: string) => void; placeholder: string; disabled?: boolean;
}) {
  return (
    <>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 300))}
        placeholder={placeholder}
        rows={3}
        disabled={disabled}
        style={{
          width: "100%", padding: "10px 12px", borderRadius: 10,
          border: "1px solid #e5e7eb", background: "#fff",
          fontSize: 14, fontFamily: "inherit", outline: "none",
          resize: "none", boxSizing: "border-box",
        }}
      />
      <div style={{ textAlign: "right", fontSize: 11, color: "#9ca3af", marginTop: 3 }}>
        {value.length}/300 (mín. 10)
      </div>
    </>
  );
}

function CancelItemModal({
  itemId, itemName, onClose, onSuccess, onError,
}: {
  itemId: string; itemName: string;
  onClose: () => void; onSuccess: () => void; onError: (msg: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);

  async function handleConfirm() {
    setLocalErr(null);
    setSubmitting(true);
    try {
      const token = sessionStorage.getItem("fy_emp_token") ?? "";
      const result = await cancelComandaItem(token, itemId, reason);
      if (!result.ok) { setLocalErr(result.error); setSubmitting(false); return; }
      onSuccess();
    } catch (e: any) {
      setLocalErr(e?.message ?? "Erro");
      setSubmitting(false);
    }
  }

  return (
    <ModalShell title="Cancelar item" onClose={onClose} submitting={submitting}>
      <div style={{ fontSize: 13, color: "#374151", marginBottom: 10 }}>
        Cancelar <strong>{itemName}</strong>? O item será mantido no histórico para auditoria.
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 6 }}>
          Motivo *
        </div>
        <ReasonInput
          value={reason} onChange={setReason} disabled={submitting}
          placeholder='Ex: "Cliente desistiu", "Erro do garçom", "Sem estoque"'
        />
      </div>
      {localErr && (
        <div role="alert" style={{
          padding: "10px 14px", borderRadius: 8, marginBottom: 12,
          background: "#fee2e2", border: "1px solid #fca5a5",
          color: "#991b1b", fontSize: 13, fontWeight: 600,
        }}>⚠ {localErr}</div>
      )}
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onClose} disabled={submitting}
          style={{ flex: 1, padding: 13, borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff", color: "#374151", fontSize: 14, fontWeight: 700, fontFamily: "inherit", cursor: submitting ? "not-allowed" : "pointer" }}
        >Voltar</button>
        <button onClick={handleConfirm} disabled={submitting || reason.trim().length < 10}
          style={{
            flex: 2, padding: 13, borderRadius: 12, border: "none",
            background: submitting || reason.trim().length < 10 ? "#9ca3af" : "#dc2626",
            color: "#fff", fontSize: 14, fontWeight: 800, fontFamily: "inherit",
            cursor: submitting || reason.trim().length < 10 ? "not-allowed" : "pointer",
          }}
        >{submitting ? "Cancelando…" : "Confirmar cancelamento"}</button>
      </div>
    </ModalShell>
  );
}

function EditComandaModal({
  comanda, onClose, onSuccess, onError,
}: {
  comanda: ComandaFullDetail;
  onClose: () => void;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState(comanda.customer_name ?? "");
  const [phoneDigits, setPhoneDigits] = useState((comanda.customer_phone ?? "").replace(/\D/g, ""));
  const [guestCount, setGuestCount] = useState(String(comanda.guest_count ?? ""));
  const [notes, setNotes] = useState(comanda.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);

  function fmtPhone(d: string): string {
    if (d.length === 0) return "";
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }

  async function handleSave() {
    setLocalErr(null);
    if (name.trim().length < 2) { setLocalErr("Nome do cliente: mínimo 2 caracteres."); return; }
    setSubmitting(true);
    try {
      const token = sessionStorage.getItem("fy_emp_token") ?? "";
      const result = await updateComandaInfo(token, comanda.id, {
        customerName: name,
        customerPhone: phoneDigits,
        guestCount: guestCount ? parseInt(guestCount) : null,
        notes,
      });
      if (!result.ok) { setLocalErr(result.error); setSubmitting(false); return; }
      onSuccess();
    } catch (e: any) {
      setLocalErr(e?.message ?? "Erro");
      setSubmitting(false);
    }
  }

  const fieldLabel: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 6, display: "block" };
  const inp: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 10,
    border: "1px solid #e5e7eb", background: "#fff",
    fontSize: 14, fontFamily: "inherit", outline: "none",
    boxSizing: "border-box",
  };

  return (
    <ModalShell title="Editar dados da comanda" onClose={onClose} submitting={submitting}>
      <div style={{ marginBottom: 12 }}>
        <label style={fieldLabel}>Nome do cliente *</label>
        <input style={inp} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={fieldLabel}>Telefone</label>
        <input
          style={inp} type="tel" inputMode="numeric"
          value={fmtPhone(phoneDigits)}
          onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, "").slice(0, 11))}
          placeholder="(62) 9XXXX-XXXX"
        />
      </div>
      {comanda.mesa_number != null && (
        <div style={{ marginBottom: 12 }}>
          <label style={fieldLabel}>Quantidade de pessoas</label>
          <input style={inp} type="number" min={1} max={20} value={guestCount} onChange={(e) => setGuestCount(e.target.value)} />
        </div>
      )}
      <div style={{ marginBottom: 14 }}>
        <label style={fieldLabel}>Observações</label>
        <textarea
          style={{ ...inp, resize: "none" }} rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, 300))}
        />
      </div>
      {localErr && (
        <div role="alert" style={{
          padding: "10px 14px", borderRadius: 8, marginBottom: 12,
          background: "#fee2e2", border: "1px solid #fca5a5",
          color: "#991b1b", fontSize: 13, fontWeight: 600,
        }}>⚠ {localErr}</div>
      )}
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onClose} disabled={submitting}
          style={{ flex: 1, padding: 13, borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff", color: "#374151", fontSize: 14, fontWeight: 700, fontFamily: "inherit", cursor: submitting ? "not-allowed" : "pointer" }}
        >Cancelar</button>
        <button onClick={handleSave} disabled={submitting}
          style={{
            flex: 2, padding: 13, borderRadius: 12, border: "none",
            background: submitting ? "#9ca3af" : "#16a34a",
            color: "#fff", fontSize: 14, fontWeight: 800, fontFamily: "inherit",
            cursor: submitting ? "not-allowed" : "pointer",
          }}
        >{submitting ? "Salvando…" : "Salvar"}</button>
      </div>
    </ModalShell>
  );
}

function CancelComandaModal({
  comandaId, shortCode, onClose, onSuccess, onError,
}: {
  comandaId: string; shortCode: string | null;
  onClose: () => void; onSuccess: () => void; onError: (msg: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);

  async function handleConfirm() {
    setLocalErr(null);
    setSubmitting(true);
    try {
      const token = sessionStorage.getItem("fy_emp_token") ?? "";
      const result = await cancelComanda(token, comandaId, reason);
      if (!result.ok) { setLocalErr(result.error); setSubmitting(false); return; }
      onSuccess();
    } catch (e: any) {
      setLocalErr(e?.message ?? "Erro");
      setSubmitting(false);
    }
  }

  return (
    <ModalShell title={`Cancelar comanda${shortCode ? ` #${shortCode}` : ""}`} onClose={onClose} submitting={submitting}>
      <div style={{ fontSize: 13, color: "#374151", marginBottom: 10, lineHeight: 1.5 }}>
        Esta ação cancela a comanda inteira e libera a mesa (se houver). Itens já lançados ficam no histórico.
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 6 }}>
          Motivo *
        </div>
        <ReasonInput
          value={reason} onChange={setReason} disabled={submitting}
          placeholder='Ex: "Cliente desistiu antes de pedir", "Aberta por engano"'
        />
      </div>
      {localErr && (
        <div role="alert" style={{
          padding: "10px 14px", borderRadius: 8, marginBottom: 12,
          background: "#fee2e2", border: "1px solid #fca5a5",
          color: "#991b1b", fontSize: 13, fontWeight: 600,
        }}>⚠ {localErr}</div>
      )}
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onClose} disabled={submitting}
          style={{ flex: 1, padding: 13, borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff", color: "#374151", fontSize: 14, fontWeight: 700, fontFamily: "inherit", cursor: submitting ? "not-allowed" : "pointer" }}
        >Voltar</button>
        <button onClick={handleConfirm} disabled={submitting || reason.trim().length < 10}
          style={{
            flex: 2, padding: 13, borderRadius: 12, border: "none",
            background: submitting || reason.trim().length < 10 ? "#9ca3af" : "#dc2626",
            color: "#fff", fontSize: 14, fontWeight: 800, fontFamily: "inherit",
            cursor: submitting || reason.trim().length < 10 ? "not-allowed" : "pointer",
          }}
        >{submitting ? "Cancelando…" : "Confirmar cancelamento"}</button>
      </div>
    </ModalShell>
  );
}

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

// ─── Receipt modal (post-close summary) ──────────────────────────────────────

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash:    "Dinheiro",
  credit:  "Cartão de crédito",
  debit:   "Cartão de débito",
  pix:     "PIX",
  voucher: "Voucher refeição",
};

function ReceiptModal({
  shortCode, splits, total, comandaId, onPrint, onClose,
}: {
  shortCode: string | null;
  splits: CloseSplit[];
  total: number;
  comandaId: string;
  onPrint: () => Promise<void> | void;
  onClose: () => void;
}) {
  const [printing, setPrinting] = useState(false);
  async function handlePrint() {
    setPrinting(true);
    try { await onPrint(); }
    finally { setTimeout(() => setPrinting(false), 1500); }
  }
  return (
    <ModalShell title="Comanda fechada" onClose={onClose}>
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <div style={{ fontSize: 48, lineHeight: 1, marginBottom: 8 }}>✅</div>
        <div style={{ fontSize: 13, color: "#15803d", fontWeight: 700 }}>
          Pagamento{splits.length !== 1 ? "s" : ""} registrado{splits.length !== 1 ? "s" : ""} com sucesso
        </div>
      </div>

      <div style={{
        background: "#f9fafb", border: "1px solid #e5e7eb",
        borderRadius: 12, padding: 14, marginBottom: 14,
      }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
          Comanda{shortCode ? ` #${shortCode}` : ""} — Recibo
        </div>
        {splits.map((s, idx) => (
          <div key={idx} style={{
            display: "flex", justifyContent: "space-between", alignItems: "flex-start",
            padding: "8px 0", gap: 8,
            borderTop: idx === 0 ? "none" : "1px dashed #e5e7eb",
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{s.customerName}</div>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                {PAYMENT_LABEL[s.paymentMethod]}
                {s.paymentMethod === "cash" && s.cashChangeFor
                  ? ` · troco para ${fmtBRL(s.cashChangeFor)}`
                  : ""}
              </div>
            </div>
            <span style={{ fontSize: 14, fontWeight: 800, color: "#16a34a", whiteSpace: "nowrap" }}>
              {fmtBRL(s.amount)}
            </span>
          </div>
        ))}
        <div style={{
          display: "flex", justifyContent: "space-between",
          paddingTop: 10, marginTop: 6, borderTop: "1px solid #e5e7eb",
          fontSize: 14, fontWeight: 900, color: "#111827",
        }}>
          <span>Total</span>
          <span>{fmtBRL(total)}</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={handlePrint}
          disabled={printing}
          style={{
            flex: 1, padding: 13, borderRadius: 12,
            border: "1px solid #16a34a", background: "#f0fdf4",
            color: "#15803d", fontSize: 13, fontWeight: 700, fontFamily: "inherit",
            cursor: printing ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          <Printer size={14} /> {printing ? "Imprimindo…" : "Imprimir recibo"}
        </button>
        <button
          onClick={onClose}
          style={{
            flex: 1, padding: 13, borderRadius: 12, border: "none",
            background: "#16a34a", color: "#fff",
            fontSize: 14, fontWeight: 800, fontFamily: "inherit",
            cursor: "pointer", boxShadow: "0 2px 6px rgba(22,163,74,0.25)",
          }}
        >Fechar</button>
      </div>
    </ModalShell>
  );
}
