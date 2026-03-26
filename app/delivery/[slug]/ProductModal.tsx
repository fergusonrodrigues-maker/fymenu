"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Product, ProductVariation } from "./menuTypes";
import { OrderPayload } from "./orderBuilder";
import { useSwipeGesture } from "./useSwipeGesture";

interface ProductModalProps {
  product: Product | null;
  variations: ProductVariation[];
  onClose: () => void;
  onOrder: (payload: OrderPayload) => void;
  allProducts?: Product[];
  mode?: "delivery" | "presencial";
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
}: ProductModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedVariation, setSelectedVariation] =
    useState<ProductVariation | null>(null);
  const [thumbVisible, setThumbVisible] = useState(true);
  const [closing, setClosing] = useState(false);
  const [slideDir, setSlideDir] = useState<"left" | "right" | null>(null);
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);

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
      setSelectedVariation(null);
      setThumbVisible(true);
    }
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

  function handleOrder() {
    if (!canOrder || activePrice == null || !currentProduct) return;
    onOrder({
      product: currentProduct,
      variation: selectedVariation ?? undefined,
      upsells: [],
      total: activePrice,
    });
  }

  const displayPrice = activePrice != null ? moneyBR(activePrice) : null;
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
          <button
            onClick={handleClose}
            className="flex items-center justify-center"
            style={{
              width: 34, height: 34, borderRadius: "50%",
              background: "rgba(255,255,255,0.1)",
              border: "0.5px solid rgba(255,255,255,0.15)",
              cursor: "pointer", color: "#fff", fontSize: 14, fontWeight: 700,
            }}
            aria-label="Fechar"
          >
            ✕
          </button>

          {total > 1 && (
            <div className="flex items-center" style={{ gap: 5 }}>
              {allProducts.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: i === currentIndex ? 6 : 5,
                    height: i === currentIndex ? 6 : 5,
                    borderRadius: "50%",
                    background: i === currentIndex ? "#FF6B00" : "rgba(255,255,255,0.25)",
                    transition: "all 0.2s",
                  }}
                />
              ))}
            </div>
          )}

          <div style={{ width: 34 }} />
        </div>

        {/* Info + CTA */}
        <div
          className="absolute inset-x-0 bottom-0"
          style={{ zIndex: 5, padding: "0 16px 18px" }}
        >
          <p style={{ color: "#fff", fontSize: 15, fontWeight: 500, lineHeight: 1.2, margin: "0 0 4px" }}>
            {currentProduct.name}
          </p>

          {currentProduct.description && (
            <div className="fy-desc-scroll" style={{ maxHeight: 32, overflowY: "auto", marginBottom: 8 }}>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.45, margin: 0 }}>
                {currentProduct.description}
              </p>
            </div>
          )}

          {!hasVariations && productBasePrice && (
            <p style={{ color: "#FF6B00", fontSize: 18, fontWeight: 500, margin: "0 0 12px" }}>
              {productBasePrice}
            </p>
          )}

          {hasVariations && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ color: "#FF6B00", fontSize: 18, fontWeight: 500, margin: "0 0 10px" }}>
                {displayPrice ?? "\u00a0"}
              </p>
              <div style={{ display: "flex", gap: 5 }}>
                {currentVariations.slice(0, 4).map((variation) => {
                  const isSelected = selectedVariation?.id === variation.id;
                  return (
                    <button
                      key={variation.id}
                      onClick={() => setSelectedVariation(variation)}
                      style={{
                        flex: 1, minWidth: 0, padding: "5px 4px", borderRadius: 999,
                        border: isSelected ? "1px solid #FF6B00" : "1px solid rgba(255,255,255,0.18)",
                        background: isSelected ? "rgba(255,107,0,0.12)" : "rgba(255,255,255,0.06)",
                        cursor: "pointer",
                      }}
                    >
                      <span style={{
                        fontSize: 10,
                        color: isSelected ? "#FF6B00" : "rgba(255,255,255,0.55)",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        display: "block", width: "100%", textAlign: "center",
                      }}>
                        {variation.name}
                      </span>
                    </button>
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
              className="active:scale-[0.98]"
              style={{
                position: "relative", width: "100%",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                padding: "13px", borderRadius: 999,
                border: canOrder ? "1px solid rgba(255,255,255,0.22)" : "1px solid rgba(255,255,255,0.08)",
                background: canOrder ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)",
                color: canOrder ? "#fff" : "rgba(255,255,255,0.28)",
                fontSize: 14, fontWeight: 500,
                cursor: canOrder ? "pointer" : "not-allowed",
                overflow: "hidden", transition: "all 0.2s",
              }}
            >
              <span style={{
                position: "absolute", top: 0, left: 0, right: 0, height: "50%",
                background: "rgba(255,255,255,0.07)",
                borderRadius: "999px 999px 0 0", pointerEvents: "none",
              }} />
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
