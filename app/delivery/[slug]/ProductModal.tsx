"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Product, ProductVariation } from "./menuTypes";
import { OrderPayload, UpsellItem } from "./orderBuilder";
import { useSwipeGesture } from "./useSwipeGesture";
import { useProductAddons } from "@/lib/hooks/useProductAddons";
import { useTrack } from "./useTrack";

interface ProductModalProps {
  product: Product | null;
  variations: ProductVariation[];
  onClose: () => void;
  onOrder: (payload: OrderPayload) => void;
  allProducts?: Product[];
  mode?: "delivery" | "presencial";
  unitId?: string;
}

function moneyBR(value: number | null | undefined) {
  if (value == null || Number.isNaN(Number(value))) return "";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value) / 100);
}

export default function ProductModal({
  product,
  variations,
  onClose,
  onOrder,
  allProducts = [],
  mode = "delivery",
  unitId,
}: ProductModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedVariation, setSelectedVariation] =
    useState<ProductVariation | null>(null);
  const [thumbVisible, setThumbVisible] = useState(true);
  const [closing, setClosing] = useState(false);
  const [slideDir, setSlideDir] = useState<"left" | "right" | null>(null);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [starred, setStarred] = useState(false);
  const [selectedAddons, setSelectedAddons] = useState<UpsellItem[]>([]);
  const [pressing, setPressing] = useState(false);

  const { addons, fetchAddons } = useProductAddons({ unitId });

  const modalRef = useRef<HTMLDivElement>(null);
  const openedAt = useRef<number>(0);
  const { track } = useTrack(unitId ?? "");

  useEffect(() => {
    if (!product) return;
    const idx = allProducts.findIndex((p) => p.id === product.id);
    setCurrentIndex(idx >= 0 ? idx : 0);
    setClosing(false);
  }, [product, allProducts]);

  const currentProduct =
    allProducts.length > 0 ? (allProducts[currentIndex] ?? product) : product;

  const currentVariations = variations ?? [];

  useEffect(() => {
    if (currentProduct) {
      // Auto-select first variation for variable-price products
      if (currentProduct.price_type === "variable" && currentVariations.length > 0) {
        const sorted = [...currentVariations].sort(
          (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
        );
        setSelectedVariation(sorted[0]);
      } else {
        setSelectedVariation(null);
      }
      setThumbVisible(!currentProduct.video_url);
      setStarred(false);
      setSelectedAddons([]);
      fetchAddons(currentProduct.id);
    }
  }, [currentProduct?.id, fetchAddons]);

  // Attention time tracking: mede quanto tempo o cliente fica vendo cada produto
  useEffect(() => {
    if (!currentProduct || !unitId) return;
    openedAt.current = Date.now();
    const productId = currentProduct.id;
    const productName = currentProduct.name;

    return () => {
      if (openedAt.current > 0) {
        const duration = Date.now() - openedAt.current;
        if (duration > 1000) {
          track({
            event: "product_view",
            product_id: productId,
            meta: {
              duration_ms: duration,
              duration_s: Math.round(duration / 1000),
              product_name: productName,
            },
          });
        }
        openedAt.current = 0;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProduct?.id]);

  const total = allProducts.length;

  const goNext = useCallback(() => {
    if (allProducts.length > 0 && currentIndex < allProducts.length - 1) {
      setSlideDir("left");
      setCurrentIndex((i) => i + 1);
      setTimeout(() => setSlideDir(null), 360);
    }
  }, [currentIndex, allProducts.length]);

  const goPrev = useCallback(() => {
    if (allProducts.length > 0 && currentIndex > 0) {
      setSlideDir("right");
      setCurrentIndex((i) => i - 1);
      setTimeout(() => setSlideDir(null), 360);
    }
  }, [currentIndex, allProducts.length]);

  useSwipeGesture(modalRef, {
    onSwipeLeft: goNext,
    onSwipeRight: goPrev,
    onSwipeDown: () => handleClose(),
  });

  // Travar scroll do body quando modal aberto
  useEffect(() => {
    if (product) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, [product]);

  function handleClose() {
    setClosing(true);
    setTimeout(() => onClose(), 280);
  }

  if (!product || !currentProduct) return null;

  const isFixed = currentProduct.price_type === "fixed";
  const hasVariations = currentVariations.length > 0;
  const fixedPrice = currentProduct.base_price ?? null;
  const activePrice: number | null = isFixed
    ? fixedPrice
    : selectedVariation?.price ?? null;
  const canOrder = (isFixed || selectedVariation !== null) && (!currentProduct.is_age_restricted || ageConfirmed);

  // NUNCA usar: thumb_path | image_path | video_path
  const thumbUrl: string | null = currentProduct.thumbnail_url ?? null;
  const videoUrl: string | null = currentProduct.video_url ?? null;
  const hasMedia = !!(thumbUrl || videoUrl);

  const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);

  function handleOrder() {
    if (!canOrder || activePrice == null || !currentProduct) return;
    if (typeof window !== "undefined" && (window as any).fbq) {
      (window as any).fbq("track", "AddToCart", {
        content_name: currentProduct.name,
        content_type: "product",
        value: (currentProduct.base_price || 0) > 500 ? (currentProduct.base_price! / 100) : currentProduct.base_price,
        currency: "BRL",
      });
    }
    onOrder({
      product: currentProduct,
      variation: selectedVariation ?? undefined,
      upsells: selectedAddons,
      total: activePrice + addonsTotal,
    });
  }

  const displayPrice = activePrice != null ? moneyBR(activePrice + addonsTotal) : null;
  const productBasePrice =
    !hasVariations && fixedPrice != null ? moneyBR(fixedPrice) : null;

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-50 flex items-center justify-center px-3 py-4"
      style={{
        background: closing ? "rgba(0,0,0,0)" : "rgba(0,0,0,0.74)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        transition: "background 280ms ease",
      }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className="relative w-full overflow-hidden"
        style={{
          width: "min(88vw, 460px)",
          aspectRatio: "9 / 16",
          borderRadius: 28,
          background: "#0a0a0c",
          boxShadow: "0 30px 80px rgba(0,0,0,0.60)",
          animation: closing
            ? "product-modal-out 280ms cubic-bezier(0.4,0,1,1) forwards"
            : slideDir === "left"
            ? "product-modal-slide-left 360ms cubic-bezier(0.34,1.56,0.64,1) forwards"
            : slideDir === "right"
            ? "product-modal-slide-right 360ms cubic-bezier(0.34,1.56,0.64,1) forwards"
            : "product-modal-in 320ms cubic-bezier(0.34,1.56,0.64,1) forwards",
        }}
      >
        <style>{`
          @keyframes product-modal-in {
            from { opacity: 0; transform: scale(0.88); }
            to { opacity: 1; transform: scale(1); }
          }
          @keyframes product-modal-out {
            from { opacity: 1; transform: scale(1); }
            to { opacity: 0; transform: scale(0.88); }
          }
          @keyframes product-modal-slide-left {
            from { opacity: 0.88; transform: translateX(72px) scale(0.96); }
            to { opacity: 1; transform: translateX(0) scale(1); }
          }
          @keyframes product-modal-slide-right {
            from { opacity: 0.88; transform: translateX(-72px) scale(0.96); }
            to { opacity: 1; transform: translateX(0) scale(1); }
          }
          .fy-desc-scroll::-webkit-scrollbar { display: none; }
          .fy-desc-scroll { scrollbar-width: none; }
          .star-btn {
            position: relative;
            width: 36px;
            height: 36px;
            border: none;
            background: rgba(0,0,0,0.45);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .star-btn .star-outline,
          .star-btn .star-filled {
            position: absolute;
            width: 20px;
            height: 20px;
            transition: all 0.3s ease;
          }
          .star-btn .star-filled {
            opacity: 0;
            transform: scale(0);
          }
          .star-btn.active .star-outline { opacity: 0; }
          .star-btn.active .star-filled {
            opacity: 1;
            transform: scale(1);
            animation: star-pop 0.6s ease;
          }
          @keyframes star-pop {
            0% { transform: scale(0); opacity: 0; }
            25% { transform: scale(1.3); opacity: 1; }
            50% { transform: scale(1); filter: brightness(1.5); }
            100% { transform: scale(1); }
          }
          .star-btn .star-particle {
            position: absolute;
            width: 4px;
            height: 4px;
            border-radius: 50%;
            background: #fabe15;
            opacity: 0;
            pointer-events: none;
          }
          .star-btn.active .star-particle { display: block; }
          .star-btn.active .star-particle:nth-child(3) { animation: sp1 0.8s ease-out forwards; }
          .star-btn.active .star-particle:nth-child(4) { animation: sp2 0.8s ease-out forwards; }
          .star-btn.active .star-particle:nth-child(5) { animation: sp3 0.8s ease-out forwards; }
          .star-btn.active .star-particle:nth-child(6) { animation: sp4 0.8s ease-out forwards; }
          .star-btn.active .star-particle:nth-child(7) { animation: sp5 0.8s ease-out forwards; }
          .star-btn.active .star-particle:nth-child(8) { animation: sp6 0.8s ease-out forwards; }
          @keyframes sp1 { 0% { opacity:1; transform:translate(0,0); } 100% { opacity:0; transform:translate(-14px,-16px); } }
          @keyframes sp2 { 0% { opacity:1; transform:translate(0,0); } 100% { opacity:0; transform:translate(14px,-16px); } }
          @keyframes sp3 { 0% { opacity:1; transform:translate(0,0); } 100% { opacity:0; transform:translate(-18px,8px); } }
          @keyframes sp4 { 0% { opacity:1; transform:translate(0,0); } 100% { opacity:0; transform:translate(18px,8px); } }
          @keyframes sp5 { 0% { opacity:1; transform:translate(0,0); } 100% { opacity:0; transform:translate(0,-20px); } }
          @keyframes sp6 { 0% { opacity:1; transform:translate(0,0); } 100% { opacity:0; transform:translate(0,18px); } }
        `}</style>

        {/* Media */}
        <div className="absolute inset-0">
          {hasMedia ? (
            <>
              {thumbUrl && (
                <img
                  src={thumbUrl}
                  alt={currentProduct.name}
                  className="absolute inset-0 h-full w-full object-cover transition-opacity"
                  style={{ opacity: thumbVisible ? 1 : 0, transitionDuration: "260ms", zIndex: 1 }}
                />
              )}
              {videoUrl && (
                <video
                  key={videoUrl}
                  src={videoUrl}
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{ zIndex: 2 }}
                  autoPlay loop muted playsInline preload="metadata"
                  onTimeUpdate={(e) => {
                    if (thumbVisible && e.currentTarget.currentTime >= 1) setThumbVisible(false);
                  }}
                />
              )}
            </>
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, rgba(24,24,28,1) 0%, rgba(10,10,12,1) 100%)", zIndex: 1 }}
            >
              <div
                className="flex h-24 w-24 items-center justify-center rounded-full"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <span style={{ fontSize: 34, opacity: 0.4 }}>🍽️</span>
              </div>
            </div>
          )}

          {/* Gradiente */}
          <div
            className="absolute inset-0"
            style={{
              zIndex: 3,
              background: "linear-gradient(to top, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0.14) 68%, transparent 100%)",
            }}
          />
        </div>

        {/* Top bar */}
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-4"
          style={{ zIndex: 10 }}
        >
          {/* Close — esquerda */}
          <button
            onClick={handleClose}
            className="flex items-center justify-center"
            style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "rgba(0,0,0,0.45)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "0.5px solid rgba(255,255,255,0.12)",
              cursor: "pointer",
            }}
            aria-label="Fechar"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1L13 13M13 1L1 13" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          {/* Indicador numérico — centro */}
          {total > 1 && (
            <span style={{
              fontSize: 13,
              fontWeight: 600,
              color: "rgba(255,255,255,0.7)",
              letterSpacing: "0.02em",
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
            }}>
              <span style={{ color: "#FF6B00", fontWeight: 700 }}>{currentIndex + 1}</span>
              <span style={{ color: "rgba(255,255,255,0.35)", margin: "0 2px" }}>/</span>
              {total}
            </span>
          )}

          {/* Heart — direita */}
          <button
            className={`star-btn${starred ? " active" : ""}`}
            style={{ border: "0.5px solid rgba(255,255,255,0.12)" }}
            onClick={() => {
              setStarred(!starred);
              if (currentProduct && typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("fy:track", {
                  detail: { event: "product_favorite", product_id: currentProduct.id, category_id: currentProduct.category_id },
                }));
              }
            }}
            aria-label="Favoritar"
          >
            <svg className="star-outline" viewBox="0 0 24 24" fill="none">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
            </svg>
            <svg className="star-filled" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                fill="#fabe15" stroke="#fabe15" strokeWidth="1" strokeLinejoin="round" />
            </svg>
            <span className="star-particle" />
            <span className="star-particle" />
            <span className="star-particle" />
            <span className="star-particle" />
            <span className="star-particle" />
            <span className="star-particle" />
          </button>
        </div>

        {/* Info + CTA */}
        <div
          className="absolute inset-x-0 bottom-0"
          style={{ zIndex: 5, padding: "0 16px 18px" }}
        >
          <p style={{ color: "#fff", fontSize: 15, fontWeight: 500, lineHeight: 1.2, margin: "0 0 4px", textAlign: "center" }}>
            {currentProduct.name}
          </p>

          {currentProduct.description && (
            <div className="fy-desc-scroll" style={{ maxHeight: 32, overflowY: "auto", marginBottom: 4 }}>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.45, margin: 0, textAlign: "center" }}>
                {currentProduct.description}
              </p>
            </div>
          )}
          {currentProduct.description_source === "AI_GENERATED" && (
            <p style={{ fontSize: 10, color: "rgba(139,92,246,0.8)", textAlign: "center", margin: "0 0 6px" }}>
              ✨ Descrição gerada por IA
            </p>
          )}

          {!hasVariations && productBasePrice && (
            <p style={{ color: "#FF6B00", fontSize: 18, fontWeight: 500, margin: "0 0 12px", textAlign: "center" }}>
              {productBasePrice}
            </p>
          )}

          {hasVariations && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.45)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Escolha uma opção
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[...currentVariations]
                  .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
                  .map((variation) => {
                    const isSelected = selectedVariation?.id === variation.id;
                    return (
                      <button
                        key={variation.id}
                        onClick={() => setSelectedVariation(variation)}
                        style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "12px 14px", borderRadius: 12,
                          border: isSelected ? "1px solid rgba(255,107,0,0.35)" : "1px solid rgba(255,255,255,0.08)",
                          background: isSelected ? "rgba(255,107,0,0.10)" : "rgba(255,255,255,0.04)",
                          cursor: "pointer", transition: "all 0.18s",
                        }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 600, color: isSelected ? "#FF6B00" : "rgba(255,255,255,0.85)" }}>
                          {variation.name}
                        </span>
                        <span style={{ fontSize: 15, fontWeight: 800, color: isSelected ? "#FF6B00" : "#fff" }}>
                          {moneyBR(variation.price)}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {addons.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 600, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Adicionais
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 100, overflowY: "auto" }} className="fy-desc-scroll">
                {addons.filter((a) => a.enabled).map((addon) => {
                  const checked = selectedAddons.some((a) => a.id === addon.id);
                  return (
                    <label
                      key={addon.id}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "5px 8px", borderRadius: 8, cursor: "pointer",
                        background: checked ? "rgba(255,107,0,0.1)" : "rgba(255,255,255,0.05)",
                        border: checked ? "1px solid rgba(255,107,0,0.35)" : "1px solid rgba(255,255,255,0.08)",
                        transition: "all 0.15s",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAddons((prev) => [...prev, { id: addon.id, name: addon.name, price: addon.price }]);
                          } else {
                            setSelectedAddons((prev) => prev.filter((a) => a.id !== addon.id));
                          }
                        }}
                        style={{ width: 14, height: 14, accentColor: "#FF6B00", cursor: "pointer", flexShrink: 0 }}
                      />
                      <span style={{ flex: 1, fontSize: 12, color: checked ? "#fff" : "rgba(255,255,255,0.65)" }}>
                        {addon.name}
                      </span>
                      <span style={{ fontSize: 11, color: "#FF6B00", fontWeight: 600, flexShrink: 0 }}>
                        +{moneyBR(addon.price)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {currentProduct.is_age_restricted && (
            <div style={{
              marginBottom: 10, padding: "8px 12px", borderRadius: 10,
              background: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.3)",
            }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={ageConfirmed}
                  onChange={(e) => setAgeConfirmed(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: "#FF6B00", cursor: "pointer" }}
                />
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", lineHeight: 1.4 }}>
                  🔞 Confirmo que tenho 18 anos ou mais
                </span>
              </label>
            </div>
          )}

          {(mode === "delivery" || mode === "presencial") && (
            <button
              onClick={handleOrder}
              disabled={!canOrder}
              onPointerDown={() => setPressing(true)}
              onPointerUp={() => setPressing(false)}
              onPointerLeave={() => setPressing(false)}
              style={{
                position: "relative", width: "100%",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                padding: "13px", borderRadius: 14,
                border: "none",
                background: canOrder ? "linear-gradient(135deg, #00ffae, #00d9ff)" : "rgba(255,255,255,0.05)",
                color: canOrder ? "#fff" : "rgba(255,255,255,0.28)",
                fontSize: 14, fontWeight: canOrder ? 900 : 500,
                textTransform: canOrder ? "uppercase" : "none",
                letterSpacing: canOrder ? "0.05em" : "normal",
                cursor: canOrder ? "pointer" : "not-allowed",
                overflow: "hidden", transition: "all 0.15s ease",
                transform: canOrder && pressing ? "scale(0.96) translateY(2px)" : "scale(1) translateY(0)",
                boxShadow: canOrder
                  ? pressing
                    ? "0 1px 4px rgba(0, 255, 174, 0.2), inset 0 2px 4px rgba(0,0,0,0.2)"
                    : "0 4px 15px rgba(0, 255, 174, 0.3), inset 0 1px 0 rgba(255,255,255,0.25)"
                  : "none",
              }}
            >
              <span style={{ position: "relative", zIndex: 1 }}>
                {canOrder
                  ? mode === "presencial"
                    ? "Adicionar ao Pedido"
                    : "Pedir"
                  : "Selecione uma opção"}
              </span>
              {canOrder && displayPrice && (
                <span style={{ position: "relative", zIndex: 1, fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
                  · {displayPrice}
                </span>
              )}
              {canOrder && (
                <svg style={{ position: "relative", zIndex: 1 }} width="14" height="14" viewBox="0 0 15 15" fill="none">
                  <line x1="3" y1="7.5" x2="12" y2="7.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
                  <polyline points="9,4.5 12,7.5 9,10.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
