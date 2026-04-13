"use client";

import { useState, useEffect } from "react";
import { OrderPayload, UpsellItem, buildOrderPayload, buildWhatsAppMessage, formatPrice } from "./orderBuilder";
import { useTrack } from "./useTrack";

export interface UpsellSuggestion {
  id: string;
  name: string;
  price: number;
  image_path?: string;
}

interface AiSuggestion {
  id: string;
  name: string;
  price: number;
  reason: string;
}

interface ComboItem {
  id: string;
  name: string;
  combo_price: number;
  original_price: number;
  combo_items?: Array<{ quantity: number; products?: { name: string } }>;
}

interface UpsellData {
  combos: ComboItem[];
  suggestions: AiSuggestion[];
}

interface UpsellModalProps {
  payload: OrderPayload | null;
  suggestions: UpsellSuggestion[];
  unit: {
    id: string;
    whatsapp?: string | null;
  };
  onClose: () => void;
}

export default function UpsellModal({
  payload,
  suggestions,
  unit,
  onClose,
}: UpsellModalProps) {
  const [selectedUpsells, setSelectedUpsells] = useState<UpsellItem[]>([]);
  const [upsellData, setUpsellData] = useState<UpsellData>({ combos: [], suggestions: [] });
  const [loadingAi, setLoadingAi] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const { track } = useTrack(unit.id);

  // Load saved customer data from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    setCustomerName(localStorage.getItem("fy_customer_name") ?? "");
    setCustomerPhone(localStorage.getItem("fy_customer_phone") ?? "");
  }, []);

  // Load AI + combo suggestions when modal opens
  useEffect(() => {
    if (!payload) {
      setUpsellData({ combos: [], suggestions: [] });
      setSelectedUpsells([]);
      return;
    }

    let cancelled = false;
    setLoadingAi(true);
    setUpsellData({ combos: [], suggestions: [] });

    fetch("/api/upsell-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        unitId: unit.id,
        productId: payload.product.id,
        productName: payload.product.name,
        cartItems: [],
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setUpsellData(data ?? { combos: [], suggestions: [] });
      })
      .catch(() => {/* fail silently */})
      .finally(() => {
        if (!cancelled) setLoadingAi(false);
      });

    return () => { cancelled = true; };
  }, [payload?.product.id, unit.id]);

  if (!payload) return null;

  function toggleUpsell(suggestion: UpsellSuggestion) {
    setSelectedUpsells((prev) => {
      const exists = prev.find((u) => u.id === suggestion.id);
      if (exists) return prev.filter((u) => u.id !== suggestion.id);
      return [...prev, { id: suggestion.id, name: suggestion.name, price: suggestion.price }];
    });
  }

  function addAiSuggestion(s: AiSuggestion) {
    setSelectedUpsells((prev) => {
      const exists = prev.find((u) => u.id === s.id);
      if (exists) return prev;
      return [...prev, { id: s.id, name: s.name, price: s.price }];
    });
  }

  function addCombo(combo: ComboItem) {
    const comboAsUpsell: UpsellItem = {
      id: `combo__${combo.id}`,
      name: `Combo: ${combo.name}`,
      price: combo.combo_price ?? 0,
    };
    setSelectedUpsells((prev) => {
      const exists = prev.find((u) => u.id === comboAsUpsell.id);
      if (exists) return prev;
      return [...prev, comboAsUpsell];
    });
  }

  const finalPayload = buildOrderPayload(
    payload.product,
    payload.variation,
    selectedUpsells
  );

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    let v = e.target.value.replace(/\D/g, "").slice(0, 11);
    if (v.length > 6) v = v.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
    else if (v.length > 2) v = v.replace(/(\d{2})(\d{0,5})/, "($1) $2");
    setCustomerPhone(v);
  }

  async function saveToCRM() {
    try {
      const phoneClean = customerPhone.replace(/\D/g, "");
      const nameTrimmed = customerName.trim();
      if (!phoneClean && !nameTrimmed) return;

      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const now = new Date().toISOString();

      if (phoneClean.length >= 10) {
        // Check if customer already exists
        const { data: existing } = await supabase
          .from("crm_customers")
          .select("id, total_orders, total_spent, name")
          .eq("unit_id", unit.id)
          .eq("phone", phoneClean)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("crm_customers")
            .update({
              // Only update name if existing is blank and we have one
              ...(nameTrimmed && !existing.name ? { name: nameTrimmed } : {}),
              last_order_at: now,
              total_orders: (existing.total_orders ?? 0) + 1,
              total_spent: (Number(existing.total_spent) ?? 0) + finalPayload.total,
              updated_at: now,
            })
            .eq("id", existing.id);
        } else {
          await supabase.from("crm_customers").insert({
            unit_id: unit.id,
            phone: phoneClean,
            name: nameTrimmed || null,
            source: "delivery",
            last_order_at: now,
            total_orders: 1,
            total_spent: finalPayload.total,
            is_active: true,
          });
        }
      } else if (nameTrimmed) {
        // No phone — insert name-only record (may create duplicates, acceptable)
        await supabase.from("crm_customers").insert({
          unit_id: unit.id,
          name: nameTrimmed,
          source: "delivery",
          last_order_at: now,
          total_orders: 1,
          total_spent: finalPayload.total,
          is_active: true,
        });
      }
    } catch {
      // CRM errors never block the order
    }
  }

  async function saveOrderEvent() {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await supabase.from("menu_events").insert({
        event: "whatsapp_order",
        unit_id: unit.id,
        product_id: finalPayload.product.id ?? null,
        meta: {
          product: finalPayload.product.name,
          variation: finalPayload.variation?.name ?? null,
          upsells: finalPayload.upsells.map((u) => u.name),
          total: finalPayload.total,
          customer_name: customerName.trim() || null,
          customer_phone: customerPhone.replace(/\D/g, "") || null,
        },
      });
    } catch {
      // Event errors never block the order
    }
  }

  function handleWhatsApp() {
    if (!unit.whatsapp) return;

    // Persist customer data for next visit (fire and forget)
    if (typeof window !== "undefined") {
      if (customerName.trim()) localStorage.setItem("fy_customer_name", customerName.trim());
      if (customerPhone.trim()) localStorage.setItem("fy_customer_phone", customerPhone.trim());
    }

    // Save to CRM + event log (fire and forget)
    saveToCRM();
    saveOrderEvent();

    const url = buildWhatsAppMessage(finalPayload, unit.whatsapp, customerName, customerPhone);
    track({ event: "whatsapp_click", product_id: payload?.product.id });
    if (typeof window !== "undefined" && (window as any).fbq) {
      const totalValue = finalPayload.total;
      (window as any).fbq("track", "Purchase", {
        value: totalValue > 500 ? totalValue / 100 : totalValue,
        currency: "BRL",
        content_type: "product",
        num_items: 1 + (finalPayload.upsells?.length ?? 0),
      });
    }
    window.open(url, "_blank");
    onClose();
  }

  const hasStaticUpsells = suggestions.length > 0;
  const hasCombos = upsellData.combos.length > 0;
  const hasAiSuggestions = upsellData.suggestions.length > 0;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-t-3xl bg-zinc-950 overflow-hidden
          animate-in slide-in-from-bottom duration-300"
        style={{ maxHeight: "92dvh" }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-zinc-800" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-3 pb-3">
          <h2 className="text-white font-bold text-lg">Resumo do pedido</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center
              rounded-xl bg-zinc-800/80 text-white text-sm"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-8" style={{ maxHeight: "80dvh" }}>

          {/* ── Main product ────────────────────────────────────────────── */}
          <div className="bg-zinc-900 rounded-2xl p-4 mb-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm">
                  {payload.product.name}
                </p>
                {payload.variation && (
                  <p className="text-zinc-400 text-xs mt-0.5">
                    {payload.variation.name}
                  </p>
                )}
              </div>
              <span className="text-white text-sm font-bold whitespace-nowrap">
                {formatPrice(
                  Number(payload.variation?.price ?? payload.product.base_price ?? 0)
                )}
              </span>
            </div>
          </div>

          {/* ── Combos (manual, created by owner) ───────────────────────── */}
          {hasCombos && (
            <div className="mb-4">
              <p className="text-zinc-500 text-xs font-semibold uppercase tracking-widest mb-2">
                🎁 Combos disponíveis
              </p>
              <div className="flex flex-col gap-2">
                {upsellData.combos.map((combo) => {
                  const alreadyAdded = selectedUpsells.some(
                    (u) => u.id === `combo__${combo.id}`
                  );
                  return (
                    <button
                      key={combo.id}
                      onClick={() => alreadyAdded ? undefined : addCombo(combo)}
                      className={`w-full p-3.5 rounded-2xl text-left transition-all
                        ${alreadyAdded
                          ? "border border-emerald-500/30 bg-emerald-950/30 cursor-default"
                          : "border border-zinc-800 bg-zinc-900 hover:border-zinc-600 active:scale-[0.98]"
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white text-sm font-semibold">
                          {combo.name}
                        </span>
                        <div className="flex items-center gap-2">
                          {combo.original_price > 0 && (
                            <span className="text-zinc-600 text-xs line-through">
                              {formatPrice(combo.original_price)}
                            </span>
                          )}
                          <span className="text-emerald-400 text-sm font-bold">
                            {formatPrice(combo.combo_price)}
                          </span>
                        </div>
                      </div>
                      {combo.combo_items && combo.combo_items.length > 0 && (
                        <p className="text-zinc-500 text-xs mt-1">
                          {combo.combo_items
                            .map((ci) => `${ci.quantity}x ${ci.products?.name}`)
                            .join(" · ")}
                        </p>
                      )}
                      {!alreadyAdded && (
                        <p className="text-emerald-500/60 text-xs mt-1.5">
                          Toque para adicionar ao pedido
                        </p>
                      )}
                      {alreadyAdded && (
                        <p className="text-emerald-400 text-xs mt-1.5">✓ Adicionado</p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Static upsells (legacy, from product_upsells table) ──────── */}
          {hasStaticUpsells && !hasCombos && (
            <div className="mb-4">
              <p className="text-zinc-500 text-xs font-semibold uppercase tracking-widest mb-2">
                Adicionar ao pedido
              </p>
              <div className="flex flex-col gap-2">
                {suggestions.map((s) => {
                  const isSelected = selectedUpsells.some((u) => u.id === s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggleUpsell(s)}
                      className={`flex items-center justify-between px-4 py-3 rounded-2xl border
                        transition-all text-sm font-medium text-left
                        ${isSelected
                          ? "border-white bg-white text-black"
                          : "border-zinc-700 bg-zinc-900 text-white hover:border-zinc-500"
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs
                            ${isSelected
                              ? "border-black bg-black text-white"
                              : "border-zinc-500"
                            }`}
                        >
                          {isSelected ? "✓" : "+"}
                        </span>
                        <span>{s.name}</span>
                      </div>
                      <span className={isSelected ? "text-black" : "text-zinc-300"}>
                        +{formatPrice(s.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── AI Suggestions ──────────────────────────────────────────── */}
          {hasAiSuggestions && (
            <div className="mb-4">
              <p className="text-zinc-500 text-xs font-semibold uppercase tracking-widest mb-2">
                ✨ Sugestões para você
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                {upsellData.suggestions.map((s) => {
                  const alreadyAdded = selectedUpsells.some((u) => u.id === s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => alreadyAdded ? undefined : addAiSuggestion(s)}
                      className={`flex-shrink-0 w-36 p-3.5 rounded-2xl text-left transition-all
                        ${alreadyAdded
                          ? "border border-white/20 bg-white/5 cursor-default"
                          : "border border-zinc-800 bg-zinc-900 hover:border-zinc-600 active:scale-[0.98]"
                        }`}
                    >
                      <p className="text-white text-xs font-semibold mb-1 leading-tight line-clamp-2">
                        {s.name}
                      </p>
                      <p className="text-zinc-600 text-[10px] mb-2 leading-tight line-clamp-2">
                        {s.reason}
                      </p>
                      {alreadyAdded ? (
                        <p className="text-white/50 text-xs">✓ Adicionado</p>
                      ) : (
                        <p className="text-emerald-400 text-sm font-bold">
                          + {formatPrice(s.price)}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── AI loading indicator ────────────────────────────────────── */}
          {loadingAi && (
            <div className="flex items-center gap-2 mb-4 px-1">
              <span className="text-zinc-600 text-xs">✨ Buscando sugestões...</span>
            </div>
          )}

          {/* ── Items added summary ─────────────────────────────────────── */}
          {selectedUpsells.length > 0 && (
            <div className="bg-zinc-900 rounded-2xl p-4 mb-4">
              <p className="text-zinc-500 text-xs font-semibold uppercase tracking-widest mb-2">
                Adicionados
              </p>
              {selectedUpsells.map((u) => (
                <div key={u.id} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <button
                      onClick={() =>
                        setSelectedUpsells((prev) => prev.filter((x) => x.id !== u.id))
                      }
                      className="w-5 h-5 rounded-full bg-zinc-700/80 text-zinc-400 text-xs
                        flex items-center justify-center flex-shrink-0 hover:bg-red-900/40 hover:text-red-400"
                    >
                      ✕
                    </button>
                    <span className="text-white text-sm truncate">{u.name}</span>
                  </div>
                  <span className="text-zinc-300 text-sm ml-3">{formatPrice(u.price)}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Add more items (back to menu) ───────────────────────────── */}
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl text-sm text-zinc-500
              border border-zinc-800/60 bg-zinc-900/40 hover:border-zinc-700 mb-4
              transition-colors"
          >
            ➕ Adicionar mais itens
          </button>

          {/* ── Customer data (optional, for CRM) ──────────────────────── */}
          <div className="rounded-2xl p-3.5 mb-4"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}
          >
            <p className="text-zinc-600 text-xs font-semibold mb-2.5">
              Dados pra entrega <span className="font-normal">(opcional)</span>
            </p>
            <div className="flex gap-2">
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Seu nome"
                autoComplete="given-name"
                className="flex-1 min-w-0 px-3 py-2.5 rounded-xl text-white text-sm
                  placeholder-zinc-600 outline-none transition-colors"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(0,255,174,0.2)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)")}
              />
              <input
                value={customerPhone}
                onChange={handlePhoneChange}
                placeholder="(62) 99999-9999"
                inputMode="numeric"
                autoComplete="tel"
                className="flex-1 min-w-0 px-3 py-2.5 rounded-xl text-white text-sm
                  placeholder-zinc-600 outline-none transition-colors"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(0,255,174,0.2)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)")}
              />
            </div>
          </div>

          {/* ── Total ───────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-1 mb-5 pt-1
            border-t border-zinc-800/50">
            <span className="text-zinc-400 text-sm font-medium pt-3">Total estimado</span>
            <span className="text-white font-bold text-xl pt-3">
              {formatPrice(finalPayload.total)}
            </span>
          </div>

          {/* ── CTA buttons ─────────────────────────────────────────────── */}
          <div className="flex flex-col gap-3">
            {unit.whatsapp && (
              <button
                onClick={handleWhatsApp}
                className="w-full py-4 rounded-2xl font-bold text-base
                  bg-white text-black active:scale-95 transition-transform
                  flex items-center justify-center gap-2"
              >
                <span>💬</span>
                Pedir pelo WhatsApp
              </button>
            )}

            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl text-sm text-zinc-500
                border border-zinc-800 hover:border-zinc-600 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
