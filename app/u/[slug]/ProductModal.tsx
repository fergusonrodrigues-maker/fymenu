"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Product, ProductVariation } from "./menuTypes";
import { OrderPayload } from "./orderBuilder";

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
  return `R$ ${Number(value).toFixed(2).replace(".", ",")}`;
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

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const THRESHOLD = 50;

  useEffect(() => {
    if (!product) return;
    const idx = allProducts.findIndex((p) => p.id === product.id);
    setCurrentIndex(idx >= 0 ? idx : 0);
  }, [product, allProducts]);

  const currentProduct =
    allProducts.length > 0 ? (allProducts[currentIndex] ?? product) : product;

  const currentVariations = variations ?? [];

  useEffect(() => {
    setSelectedVariation(null);
    setThumbVisible(true);
  }, [currentProduct?.id]);

  const total = allProducts.length;
  const counter = total > 1 ? `${currentIndex + 1} / ${total}` : null;

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

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;

    if (Math.abs(dy) > Math.abs(dx) && dy > THRESHOLD) {
      handleClose();
      return;
    }

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx < -THRESHOLD) goNext();
      else if (dx > THRESHOLD) goPrev();
    }
  }

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

  const canOrder = mode === "delivery" && (isFixed || selectedVariation !== null);

  // NUNCA usar: thumb_path | image_path | video_path
  const thumbUrl: string | null = currentProduct.thumbnail_url ?? null;
  const videoUrl: string | null = currentProduct.video_url ?? null;
  const hasMedia = !!(thumbUrl || videoUrl);

  function handleOrder() {
    if (!canOrder || activePrice == null) return;

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
      className="fixed inset-0 z-50 flex items-center justify-center px-3 py-4"
      style={{
        background: closing ? "rgba(0,0,0,0)" : "rgba(0,0,0,0.74)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        transition: "background 280ms ease",
      }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
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
        `}</style>

        <div className="absolute inset-0">
          {hasMedia ? (
            <>
              {thumbUrl && (
                <img
                  src={thumbUrl}
                  alt={currentProduct.name}
                  className="absolute inset-0 h-full w-full object-cover transition-opacity"
                  style={{
                    opacity: thumbVisible ? 1 : 0,
                    transitionDuration: "260ms",
                    zIndex: 1,
                  }}
                />
              )}

              {videoUrl && (
                <video
                  key={videoUrl}
                  src={videoUrl}
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{ zIndex: 2 }}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  onTimeUpdate={(e) => {
                    if (thumbVisible && e.currentTarget.currentTime >= 1) {
                      setThumbVisible(false);
                    }
                  }}
                />
              )}
            </>
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, rgba(24,24,28,1) 0%, rgba(10,10,12,1) 100%)",
                zIndex: 1,
              }}
            >
              <div
                className="flex h-24 w-24 items-center justify-center rounded-full"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <span style={{ fontSize: 34, opacity: 0.4 }}>🍽️</span>
              </div>
            </div>
          )}

          <div
            className="absolute inset-0"
            style={{
              zIndex: 3,
              background:
                "linear-gradient(to top, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.58) 36%, rgba(0,0,0,0.14) 68%, transparent 100%)",
            }}
          />

          {counter && (
            <div
              className="absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-bold text-white"
              style={{
                zIndex: 10,
                background: "rgba(0,0,0,0.42)",
                border: "1px solid rgba(255,255,255,0.12)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
              }}
            >
              {counter}
            </div>
          )}

          <button
            onClick={handleClose}
            className="absolute right-4 top-4 flex items-center justify-center rounded-full text-white"
            style={{
              zIndex: 10,
              width: 40,
              height: 40,
              background: "rgba(0,0,0,0.42)",
              border: "1px solid rgba(255,255,255,0.12)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              fontSize: 18,
              fontWeight: 700,
            }}
            aria-label="Fechar"
          >
            ✕
          </button>

          <div
            className="absolute inset-x-0 bottom-0"
            style={{ zIndex: 5, padding: "0 18px 18px" }}
          >
            <div
              className="rounded-[24px] p-4"
              style={{
                background: "rgba(11,11,13,0.74)",
                border: "1px solid rgba(255,255,255,0.08)",
                backdropFilter: "blur(14px)",
                WebkitBackdropFilter: "blur(14px)",
                boxShadow: "0 12px 30px rgba(0,0,0,0.26)",
              }}
            >
              <div className="text-white" style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.08 }}>
                {currentProduct.name}
              </div>

              {currentProduct.description && (
                <p
                  className="mt-2 text-sm"
                  style={{ color: "rgba(255,255,255,0.72)", lineHeight: 1.55 }}
                >
                  {currentProduct.description}
                </p>
              )}

              {!hasVariations && productBasePrice && (
                <div
                  className="mt-3 text-white"
                  style={{ fontSize: 20, fontWeight: 900, lineHeight: 1.1 }}
                >
                  {productBasePrice}
                </div>
              )}

              {hasVariations && (
                <div className="mt-4">
                  <div
                    className="mb-3 text-[11px] font-semibold uppercase"
                    style={{ color: "rgba(255,255,255,0.44)", letterSpacing: "0.14em" }}
                  >
                    Selecione uma opção
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {currentVariations.map((variation) => {
                      const isSelected = selectedVariation?.id === variation.id;
                      return (
                        <button
                          key={variation.id}
                          onClick={() => setSelectedVariation(variation)}
                          className="min-w-[108px] rounded-full px-4 py-3 text-sm font-semibold transition-all"
                          style={{
                            background: isSelected ? "#ffffff" : "rgba(255,255,255,0.08)",
                            color: isSelected ? "#000" : "#fff",
                            border: isSelected
                              ? "1px solid rgba(255,255,255,0.92)"
                              : "1px solid rgba(255,255,255,0.12)",
                            boxShadow: isSelected ? "0 6px 18px rgba(255,255,255,0.14)" : "none",
                          }}
                        >
                          <span>{variation.name}</span>
                          {variation.price != null && (
                            <span style={{ marginLeft: 8, opacity: isSelected ? 0.72 : 0.82 }}>
                              {moneyBR(variation.price)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {displayPrice && (
                    <div className="mt-3 text-white" style={{ fontSize: 18, fontWeight: 900 }}>
                      {displayPrice}
                    </div>
                  )}
                </div>
              )}

              {mode === "delivery" && (
                <button
                  onClick={handleOrder}
                  disabled={!canOrder}
                  className="mt-5 flex h-[54px] w-full items-center justify-center rounded-[18px] text-sm font-bold uppercase tracking-[0.08em] transition-all active:scale-[0.98]"
                  style={{
                    background: canOrder ? "#ffffff" : "rgba(255,255,255,0.08)",
                    color: canOrder ? "#000" : "rgba(255,255,255,0.28)",
                    border: canOrder
                      ? "1px solid rgba(255,255,255,0.9)"
                      : "1px solid rgba(255,255,255,0.08)",
                    cursor: canOrder ? "pointer" : "not-allowed",
                  }}
                >
                  {canOrder ? (
                    <>
                      Pedir
                      {displayPrice && (
                        <span style={{ marginLeft: 8, opacity: 0.56 }}>• {displayPrice}</span>
                      )}
                    </>
                  ) : (
                    "Selecione uma opção"
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}