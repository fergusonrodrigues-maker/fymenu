"use client";

import React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import { logComandaAction } from "@/app/hooks/useComandaAudit";
import { X, CheckCircle2, ChefHat, Clock, Flame, UtensilsCrossed, Smartphone, Clipboard, Printer, Send } from "lucide-react";

type ComandaRecord = {
  id: string;
  unit_id: string;
  table_number: number | null;
  hash: string;
  status: string;
  opened_by_name: string | null;
  notes: string | null;
  created_at: string;
};

type ComandaItem = {
  id: string;
  comanda_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  addons: { name: string; price?: number }[] | null;
  notes: string | null;
  status: string;
  added_by: string | null;
  added_by_name: string | null;
  added_by_role: string | null;
  created_at: string;
};

type CategoryRecord = { id: string; name: string; order_index: number | null };
type ProductRecord = { id: string; category_id: string; name: string; base_price: number | null; price_type: string };

interface Props {
  comanda: ComandaRecord;
  initialItems: ComandaItem[];
  categories: CategoryRecord[];
  products: ProductRecord[];
  unitId: string;
  unitSlug: string;
  unitName: string;
  restaurantId: string;
  userId: string;
  waiterName: string;
  canClose: boolean;
}

export default function ComandaGarcomClient({
  comanda: initialComanda,
  initialItems,
  categories,
  products,
  unitId,
  unitSlug,
  unitName,
  restaurantId,
  userId,
  waiterName,
  canClose,
}: Props) {
  const [comanda, setComanda] = useState<ComandaRecord>(initialComanda);
  const [items, setItems] = useState<ComandaItem[]>(initialItems);
  const [showAdd, setShowAdd] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [removingItem, setRemovingItem] = useState<ComandaItem | null>(null);
  const [removeReason, setRemoveReason] = useState("");
  const [saving, setSaving] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const activeItems = items.filter(i => i.status !== "canceled");
  const pendingItems = items.filter(i => i.status === "pending");
  const total = activeItems.reduce((s, i) => s + i.quantity * i.unit_price, 0);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`garcom-comanda-${comanda.id}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "comanda_items",
        filter: `comanda_id=eq.${comanda.id}`,
      }, (payload) => {
        if (payload.eventType === "INSERT") {
          setItems(prev => prev.some(i => i.id === payload.new.id) ? prev : [...prev, payload.new as ComandaItem]);
        } else if (payload.eventType === "UPDATE") {
          setItems(prev => prev.map(i => i.id === payload.new.id ? { ...i, ...payload.new } : i));
        } else if (payload.eventType === "DELETE") {
          setItems(prev => prev.filter(i => i.id !== (payload.old as any).id));
        }
      })
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "comandas",
        filter: `id=eq.${comanda.id}`,
      }, (payload) => {
        setComanda(prev => ({ ...prev, ...payload.new }));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [comanda.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const addItem = async (product: ProductRecord, qty: number, price: number, notes: string) => {
    setSaving(true);
    const { data: newItem } = await supabase
      .from("comanda_items")
      .insert({
        comanda_id: comanda.id,
        product_id: product.id,
        product_name: product.name,
        quantity: qty,
        unit_price: price,
        notes: notes || null,
        status: "pending",
        added_by: userId,
        added_by_name: waiterName,
        added_by_role: "garcom",
      })
      .select()
      .single();
    setSaving(false);
    if (newItem) {
      setItems(prev => prev.some(i => i.id === (newItem as ComandaItem).id) ? prev : [...prev, newItem as ComandaItem]);
      await logComandaAction({
        comanda_id: comanda.id,
        unit_id: unitId,
        action: "item_added",
        item_name: product.name,
        item_id: (newItem as ComandaItem).id,
        new_value: { quantity: qty, unit_price: price },
        performed_by: userId,
        performed_by_role: "garcom",
        performed_by_name: waiterName,
      });
    }
    setShowAdd(false);
  };

  const doRemoveItem = async () => {
    if (!removingItem) return;
    await supabase.from("comanda_items").update({ status: "canceled" }).eq("id", removingItem.id);
    setItems(prev => prev.map(i => i.id === removingItem.id ? { ...i, status: "canceled" } : i));
    await logComandaAction({
      comanda_id: comanda.id,
      unit_id: unitId,
      action: "item_removed",
      item_name: removingItem.product_name,
      item_id: removingItem.id,
      old_value: { quantity: removingItem.quantity },
      reason: removeReason || undefined,
      performed_by: userId,
      performed_by_role: "garcom",
      performed_by_name: waiterName,
    });
    setRemovingItem(null);
    setRemoveReason("");
  };

  const changeQty = async (item: ComandaItem, newQty: number) => {
    if (newQty < 1) return;
    const oldQty = item.quantity;
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: newQty } : i));
    await supabase.from("comanda_items").update({ quantity: newQty }).eq("id", item.id);
    await logComandaAction({
      comanda_id: comanda.id,
      unit_id: unitId,
      action: "item_qty_changed",
      item_name: item.product_name,
      item_id: item.id,
      old_value: { quantity: oldQty },
      new_value: { quantity: newQty },
      performed_by: userId,
      performed_by_role: "garcom",
      performed_by_name: waiterName,
    });
  };

  const enviarParaCozinha = async () => {
    if (!pendingItems.length) return;
    setSaving(true);
    await supabase.from("order_intents").insert({
      unit_id: unitId,
      restaurant_id: restaurantId,
      items: pendingItems.map(i => ({
        name: i.product_name,
        qty: i.quantity,
        price: i.unit_price,
        addons: i.addons,
        notes: i.notes,
      })),
      total: pendingItems.reduce((s, i) => s + i.quantity * i.unit_price, 0),
      table_number: comanda.table_number,
      status: "confirmed",
      notes: `Comanda mesa ${comanda.table_number}`,
    });
    await supabase
      .from("comanda_items")
      .update({ status: "confirmed" })
      .eq("comanda_id", comanda.id)
      .eq("status", "pending");
    setItems(prev => prev.map(i => i.status === "pending" ? { ...i, status: "confirmed" } : i));
    setSaving(false);
  };

  const fecharComanda = async (method: string) => {
    setSaving(true);
    await supabase.from("comandas").update({
      status: "closed",
      payment_method: method,
      subtotal: total,
      total,
      closed_at: new Date().toISOString(),
      closed_by: userId,
      closed_by_name: waiterName,
    }).eq("id", comanda.id);
    await logComandaAction({
      comanda_id: comanda.id,
      unit_id: unitId,
      action: "comanda_closed",
      new_value: { total, payment_method: method },
      performed_by: userId,
      performed_by_role: "garcom",
      performed_by_name: waiterName,
    });
    setSaving(false);
    router.push("/garcom");
  };

  const enviarParaCaixa = async () => {
    await supabase.from("comandas").update({ status: "pending_payment" }).eq("id", comanda.id);
    await logComandaAction({
      comanda_id: comanda.id,
      unit_id: unitId,
      action: "sent_to_cashier",
      new_value: { table_number: comanda.table_number },
      performed_by: userId,
      performed_by_role: "garcom",
      performed_by_name: waiterName,
    });
    setComanda(prev => ({ ...prev, status: "pending_payment" }));
  };

  const isClosed = comanda.status === "closed" || comanda.status === "canceled";
  const isPendingPayment = comanda.status === "pending_payment";

  const statusLabel = comanda.status === "open" ? "Aberta"
    : comanda.status === "pending_payment" ? "Aguardando pagamento"
    : comanda.status === "closed" ? "Fechada" : "Cancelada";

  const statusClass = comanda.status === "open"
    ? "text-green-400 bg-green-500/20 border-green-500/30"
    : "text-yellow-400 bg-yellow-500/20 border-yellow-500/30";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-slate-900/90 backdrop-blur border-b border-slate-700">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push("/garcom")}
            className="text-slate-400 hover:text-white text-xl leading-none px-1"
          >
            ←
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-bold text-lg leading-tight">
              Mesa {comanda.table_number ?? "S/N"}
            </h1>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusClass}`}>
              {statusLabel}
            </span>
          </div>
          <button
            onClick={() => setShowQR(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold border border-slate-600 transition-colors"
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Smartphone size={12} /> QR</span>
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 pb-40">
        {activeItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <span className="mb-3" style={{ color: "#64748b" }}><UtensilsCrossed size={48} /></span>
            <p className="text-lg font-medium">Nenhum item adicionado</p>
            {!isClosed && <p className="text-sm mt-1">Clique em "+ Item" abaixo</p>}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map(item => {
              if (item.status === "canceled") return null;
              const isEditable = item.status === "pending" && !isClosed;
              return (
                <div key={item.id} className="bg-slate-800/70 border border-slate-700 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    {/* Qty controls */}
                    {isEditable ? (
                      <div className="flex items-center gap-1.5 mt-0.5 shrink-0">
                        <button
                          onClick={() => changeQty(item, item.quantity - 1)}
                          className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm transition-colors flex items-center justify-center"
                        >
                          −
                        </button>
                        <span className="text-white font-bold w-5 text-center text-sm">{item.quantity}</span>
                        <button
                          onClick={() => changeQty(item, item.quantity + 1)}
                          className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm transition-colors flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400 font-semibold text-sm mt-0.5 shrink-0">
                        {item.quantity}×
                      </span>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm">{item.product_name}</p>
                      {item.notes && (
                        <p className="text-slate-400 text-xs mt-0.5">{item.notes}</p>
                      )}
                      {item.addons && item.addons.length > 0 && (
                        <p className="text-slate-500 text-xs mt-0.5">
                          + {item.addons.map(a => a.name).join(", ")}
                        </p>
                      )}
                      <div className={`mt-1.5 text-xs font-semibold ${
                        item.status === "delivered" ? "text-green-400"
                        : item.status === "preparing" || item.status === "ready" ? "text-yellow-400"
                        : item.status === "confirmed" ? "text-blue-400"
                        : "text-slate-500"
                      }`}>
                        {item.status === "pending" ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Clock size={11} /> Aguardando envio</span>
                          : item.status === "confirmed" ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><CheckCircle2 size={11} /> Confirmado</span>
                          : item.status === "preparing" ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Flame size={11} /> Preparando</span>
                          : item.status === "ready" ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><UtensilsCrossed size={11} /> Pronto</span>
                          : item.status === "delivered" ? "✓ Entregue"
                          : ""}
                      </div>
                    </div>

                    {/* Price + remove */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-green-400 font-bold text-sm">
                        R$ {((item.quantity * item.unit_price) / 100).toFixed(2).replace(".", ",")}
                      </span>
                      {isEditable && (
                        <button
                          onClick={() => { setRemovingItem(item); setRemoveReason(""); }}
                          className="text-red-400 hover:text-red-300 text-xs font-bold transition-colors"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 border-t border-slate-700 backdrop-blur-sm p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-3">
            <span className="text-slate-400 text-xs">
              {activeItems.length} item{activeItems.length !== 1 ? "s" : ""}
              {pendingItems.length > 0 && (
                <span className="ml-2 text-orange-400">({pendingItems.length} aguardando)</span>
              )}
            </span>
            <span className="text-green-400 font-bold text-xl">
              R$ {(total / 100).toFixed(2).replace(".", ",")}
            </span>
          </div>

          {!isClosed && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setShowAdd(true)}
                className="flex-1 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm transition-colors"
              >
                + Item
              </button>

              {pendingItems.length > 0 && (
                <button
                  onClick={enviarParaCozinha}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-sm transition-colors"
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><ChefHat size={14} /> Cozinha ({pendingItems.length})</span>
                </button>
              )}

              {comanda.status === "open" && (
                canClose ? (
                  <button
                    onClick={() => setShowClose(true)}
                    className="flex-1 py-3 rounded-xl bg-green-700 hover:bg-green-600 text-white font-bold text-sm transition-colors"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><CheckCircle2 size={14} /> Fechar</span>
                  </button>
                ) : (
                  <button
                    onClick={enviarParaCaixa}
                    className="flex-1 py-3 rounded-xl bg-yellow-700 hover:bg-yellow-600 text-white font-bold text-sm transition-colors"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Send size={14} /> Caixa</span>
                  </button>
                )
              )}

              {isPendingPayment && canClose && (
                <button
                  onClick={() => setShowClose(true)}
                  className="flex-1 py-3 rounded-xl bg-green-700 hover:bg-green-600 text-white font-bold text-sm transition-colors"
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><CheckCircle2 size={14} /> Receber</span>
                </button>
              )}
            </div>
          )}

          {isClosed && (
            <p className="text-center text-slate-500 text-sm py-1">Comanda encerrada</p>
          )}
        </div>
      </div>

      {/* Add item modal */}
      {showAdd && (
        <AddItemModal
          categories={categories}
          products={products}
          saving={saving}
          onClose={() => setShowAdd(false)}
          onAdd={addItem}
        />
      )}

      {/* QR Code modal */}
      {showQR && (
        <QRModal
          unitSlug={unitSlug}
          hash={comanda.hash}
          tableNumber={comanda.table_number}
          onClose={() => setShowQR(false)}
        />
      )}

      {/* Close comanda modal */}
      {showClose && (
        <CloseModal
          total={total}
          saving={saving}
          onClose={() => setShowClose(false)}
          onConfirm={fecharComanda}
        />
      )}

      {/* Remove item modal */}
      {removingItem && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && setRemovingItem(null)}
        >
          <div className="w-full sm:max-w-sm bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold text-base">Remover item</h2>
              <button onClick={() => setRemovingItem(null)} style={{
                width: 32, height: 32, borderRadius: 10, border: "none", cursor: "pointer",
                background: "rgba(220,38,38,0.12)", color: "#ffffff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 600, transition: "all 0.2s", flexShrink: 0,
              }}>✕</button>
            </div>
            <p className="text-slate-300 text-sm mb-4">
              Remover <strong>{removingItem.quantity}× {removingItem.product_name}</strong>?
            </p>
            <input
              type="text"
              placeholder="Motivo (opcional)"
              value={removeReason}
              onChange={e => setRemoveReason(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-orange-500 mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setRemovingItem(null)}
                className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-300 text-sm font-medium hover:border-slate-500 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={doRemoveItem}
                className="flex-1 py-3 rounded-xl bg-red-700 hover:bg-red-600 text-white text-sm font-bold transition-colors"
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Add Item Modal ──────────────────────────────────────────────────────────

function AddItemModal({
  categories,
  products,
  saving,
  onClose,
  onAdd,
}: {
  categories: CategoryRecord[];
  products: ProductRecord[];
  saving: boolean;
  onClose: () => void;
  onAdd: (product: ProductRecord, qty: number, price: number, notes: string) => Promise<void>;
}) {
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductRecord | null>(null);
  const [qty, setQty] = useState(1);
  const [customPrice, setCustomPrice] = useState("");
  const [notes, setNotes] = useState("");

  const catProducts = products.filter(p => p.category_id === selectedCat);

  const handleAdd = () => {
    if (!selectedProduct) return;
    const price = selectedProduct.price_type === "variable"
      ? Math.round(parseFloat(customPrice.replace(",", ".")) * 100) || 0
      : (selectedProduct.base_price ?? 0);
    onAdd(selectedProduct, qty, price, notes);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full sm:max-w-md bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-2">
            {(selectedCat || selectedProduct) && (
              <button
                onClick={() => selectedProduct ? setSelectedProduct(null) : setSelectedCat(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ←
              </button>
            )}
            <h2 className="text-white font-bold text-base">
              {selectedProduct
                ? selectedProduct.name
                : selectedCat
                ? categories.find(c => c.id === selectedCat)?.name ?? "Produtos"
                : "Categorias"}
            </h2>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 10, border: "none", cursor: "pointer",
            background: "rgba(220,38,38,0.12)", color: "#ffffff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 600, transition: "all 0.2s", flexShrink: 0,
          }}><X size={14} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          {/* Category list */}
          {!selectedCat && (
            <div className="flex flex-col gap-2">
              {categories.length === 0 && (
                <p className="text-slate-400 text-sm text-center py-8">Nenhuma categoria cadastrada</p>
              )}
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCat(cat.id)}
                  className="w-full text-left px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm border border-slate-700 transition-colors"
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Product list */}
          {selectedCat && !selectedProduct && (
            <div className="flex flex-col gap-2">
              {catProducts.length === 0 && (
                <p className="text-slate-400 text-sm text-center py-8">Nenhum produto nesta categoria</p>
              )}
              {catProducts.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setSelectedProduct(p); setQty(1); setNotes(""); setCustomPrice(""); }}
                  className="w-full text-left px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium text-sm">{p.name}</span>
                    <span className="text-green-400 text-sm font-semibold">
                      {p.price_type === "variable"
                        ? "Variável"
                        : p.base_price != null
                        ? `R$ ${(p.base_price / 100).toFixed(2).replace(".", ",")}`
                        : "—"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Item form */}
          {selectedProduct && (
            <div className="flex flex-col gap-4">
              {selectedProduct.price_type === "variable" && (
                <div>
                  <label className="text-slate-400 text-xs mb-1.5 block">Preço (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={customPrice}
                    onChange={e => setCustomPrice(e.target.value)}
                    placeholder="0,00"
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>
              )}

              <div>
                <label className="text-slate-400 text-xs mb-1.5 block">Quantidade</label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    className="w-10 h-10 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xl transition-colors flex items-center justify-center"
                  >
                    −
                  </button>
                  <span className="text-white font-bold text-xl w-8 text-center">{qty}</span>
                  <button
                    onClick={() => setQty(q => q + 1)}
                    className="w-10 h-10 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xl transition-colors flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-400 text-xs mb-1.5 block">Observações</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Ex: sem cebola, bem passado…"
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-orange-500"
                />
              </div>

              {selectedProduct.base_price != null && selectedProduct.price_type !== "variable" && (
                <p className="text-slate-400 text-xs">
                  Subtotal:{" "}
                  <span className="text-green-400 font-semibold">
                    R$ {((qty * selectedProduct.base_price) / 100).toFixed(2).replace(".", ",")}
                  </span>
                </p>
              )}

              <button
                onClick={handleAdd}
                disabled={saving}
                className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold text-sm transition-colors"
              >
                {saving ? "Adicionando…" : `Adicionar ${qty}× ${selectedProduct.name}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── QR Code Modal ───────────────────────────────────────────────────────────

function QRModal({
  unitSlug,
  hash,
  tableNumber,
  onClose,
}: {
  unitSlug: string;
  hash: string;
  tableNumber: number | null;
  onClose: () => void;
}) {
  const qrUrl = `${window.location.origin}/comanda/${unitSlug}/${hash}`;
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(qrUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full sm:max-w-sm bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold text-base">QR Code — Mesa {tableNumber ?? "S/N"}</h2>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 10, border: "none", cursor: "pointer",
            background: "rgba(220,38,38,0.12)", color: "#ffffff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 600, transition: "all 0.2s", flexShrink: 0,
          }}><X size={14} /></button>
        </div>
        <div className="flex flex-col items-center gap-4">
          <div className="bg-white p-4 rounded-xl">
            <QRCodeSVG
              value={qrUrl}
              size={200}
              bgColor="transparent"
              fgColor="#000000"
              level="M"
            />
          </div>
          <p className="text-slate-400 text-xs text-center break-all px-2">{qrUrl}</p>
          <div className="flex gap-2 w-full">
            <button
              onClick={copy}
              className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-sm font-medium hover:border-slate-500 transition-colors"
            >
              {copied ? "✓ Copiado" : <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Clipboard size={12} /> Copiar link</span>}
            </button>
            <button
              onClick={() => window.print()}
              className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-sm font-medium hover:border-slate-500 transition-colors"
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Printer size={12} /> Imprimir</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Close Comanda Modal ─────────────────────────────────────────────────────

function CloseModal({
  total,
  saving,
  onClose,
  onConfirm,
}: {
  total: number;
  saving: boolean;
  onClose: () => void;
  onConfirm: (method: string) => Promise<void>;
}) {
  const [method, setMethod] = useState("pix");
  const methods = [
    { id: "pix", label: "Pix" },
    { id: "cartao", label: "Cartão" },
    { id: "dinheiro", label: "Dinheiro" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full sm:max-w-sm bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-bold text-base">Fechar comanda</h2>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 10, border: "none", cursor: "pointer",
            background: "rgba(220,38,38,0.12)", color: "#ffffff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 600, transition: "all 0.2s", flexShrink: 0,
          }}><X size={14} /></button>
        </div>
        <p className="text-slate-400 text-sm mb-4">
          Total:{" "}
          <span className="text-green-400 font-bold text-base">
            R$ {(total / 100).toFixed(2).replace(".", ",")}
          </span>
        </p>
        <div className="flex flex-col gap-2 mb-5">
          {methods.map(m => (
            <button
              key={m.id}
              onClick={() => setMethod(m.id)}
              className={`py-3 rounded-xl border text-sm font-semibold transition-colors ${
                method === m.id
                  ? "border-orange-500 bg-orange-500/10 text-orange-400"
                  : "border-slate-600 text-slate-300 hover:border-slate-500"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <button
          disabled={saving}
          onClick={() => onConfirm(method)}
          className="w-full py-3 rounded-xl bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-bold text-sm transition-colors"
        >
          {saving ? "Fechando…" : "Confirmar pagamento"}
        </button>
      </div>
    </div>
  );
}
