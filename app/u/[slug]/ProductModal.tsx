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

export default function ProductModal({
  product,
  variations,
  onClose,
  onOrder,
  allProducts = [],
  mode = "delivery",
}: ProductModalProps) {
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  useEffect(() => {
    if (!product) return;
    const idx = allProducts.findIndex((p) => p.id === product.id);
    setCurrentIndex(idx >= 0 ? idx : 0);
  }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentProduct =
    allProducts.length > 0 ? (allProducts[currentIndex] ?? product) : product;

  const [selectedVariation, setSelectedVariation] =
    useState<ProductVariation | null>(null);
  useEffect(() => { setSelectedVariation(null); }, [currentProduct?.id]);

  const [thumbVisible, setThumbVisible] = useState(true);
  useEffect(() => { setThumbVisible(true); }, [currentProduct?.id]);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const THRESHOLD = 50;

  const goNext = useCallback(() => {
    if (allProducts.length > 0 && currentIndex < allProducts.length - 1)
      setCurrentIndex((i) => i + 1);
  }, [currentIndex, allProducts.length]);

  const goPrev = useCallback(() => {
    if (allProducts.length > 0 && currentIndex > 0)
      setCurrentIndex((i) => i - 1);
  }, [currentIndex, allProducts.length]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dy) > Math.abs(dx) && dy > THRESHOLD) { onClose(); return; }
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx < -THRESHOLD) goNext();
      else if (dx > THRESHOLD) goPrev();
    }
  }

  if (!product || !currentProduct) return null;

  const isFixed = currentProduct.price_type === "fixed";
  const hasVariations = variations && variations.length > 0;
  const activePrice: number | null = isFixed
    ? currentProduct.base_price ?? null
    : selectedVariation?.price ?? null;
  const canOrder = isFixed || selectedVariation !== null;
  const priceLabel = activePrice
    ? `R$\u00a0${Number(activePrice).toFixed(2).replace(".", ",")}`
    : null;

  // NUNCA usar: thumb_path | image_path | video_path
  const thumbUrl: string | null = currentProduct.thumbnail_url ?? null;
  const videoUrl: string | null = currentProduct.video_url ?? null;
  const hasMedia = !!(thumbUrl || videoUrl);

  const total = allProducts.length;
  const counter = total > 1 ? `${currentIndex + 1} / ${total}` : null;

  function handleOrder() {
    if (!canOrder) return;
    onOrder({ product: currentProduct!, variation: selectedVariation ?? undefined, upsells: [], total: activePrice ?? 0 });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Card expandido — mesma linguagem visual do ProductCard */}
      <div
        className="w-full max-w-sm overflow-hidden animate-in slide-in-from-bottom duration-300"
        style={{
          maxHeight: "92dvh",
          borderRadius: "24px 24px 0 0",
          background: "#111",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.6)",
        }}
      >
        {/* ── MÍDIA grande no topo ── */}
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: "4/3" }}>
          {hasMedia ? (
            <>
              {thumbUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thumbUrl}
                  alt={currentProduct.name}
                  className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
                  style={{ opacity: thumbVisible ? 1 : 0, zIndex: 1 }}
                />
              )}
              {videoUrl && (
                <video
                  key={videoUrl}
                  src={videoUrl}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ zIndex: 2 }}
                  autoPlay loop muted playsInline
                  onPlay={() => setTimeout(() => setThumbVisible(false), 1000)}
                />
              )}
            </>
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #1c1c1e, #2c2c2e)" }}
            >
              <span style={{ fontSize: 48, opacity: 0.15 }}>🍽️</span>
            </div>
          )}

          {/* Gradiente inferior — igual ao card */}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.15) 50%, transparent 100%)",
              zIndex: 3,
            }}
          />

          {/* Nome + preço no overlay — igual ao card */}
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-5" style={{ zIndex: 4 }}>
            <p className="text-white font-bold text-lg leading-snug drop-shadow-sm">
              {currentProduct.name}
            </p>
            {isFixed && priceLabel && (
              <p className="text-white/70 text-sm font-medium mt-0.5">{priceLabel}</p>
            )}
          </div>

          {/* Fechar */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 flex items-center justify-center
              rounded-full backdrop-blur-md text-white text-sm font-bold"
            style={{ zIndex: 10, width: 36, height: 36, background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            ✕
          </button>

          {/* Counter X/Y */}
          {counter && (
            <div
              className="absolute top-4 left-4 text-white text-xs font-bold backdrop-blur-md rounded-full px-3 py-1"
              style={{ zIndex: 10, background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              {counter}
            </div>
          )}

          {/* Setas */}
          {allProducts.length > 1 && currentIndex > 0 && (
            <button
              onClick={goPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center
                rounded-full text-white text-xl backdrop-blur-md"
              style={{ zIndex: 10, width: 36, height: 36, background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.12)" }}
            >‹</button>
          )}
          {allProducts.length > 1 && currentIndex < allProducts.length - 1 && (
            <button
              onClick={goNext}
              className="absolute right-14 top-1/2 -translate-y-1/2 flex items-center justify-center
                rounded-full text-white text-xl backdrop-blur-md"
              style={{ zIndex: 10, width: 36, height: 36, background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.12)" }}
            >›</button>
          )}
        </div>

        {/* ── CONTEÚDO ── continuação natural do card */}
        <div
          className="overflow-y-auto"
          style={{ maxHeight: "46dvh", background: "#111", padding: "20px 20px 28px" }}
        >
          {/* Descrição */}
          {currentProduct.description && (
            <p className="text-zinc-400 text-sm leading-relaxed mb-5">
              {currentProduct.description}
            </p>
          )}

          {/* Variações */}
          {hasVariations && (
            <div className="mb-5">
              <p className="text-zinc-600 text-xs uppercase tracking-widest mb-3 font-semibold">
                Escolha uma opção
              </p>
              <div className="flex flex-col gap-2">
                {variations.map((v) => {
                  const isSelected = selectedVariation?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariation(v)}
                      className="flex items-center justify-between px-4 py-3 text-sm font-medium transition-all"
                      style={{
                        borderRadius: 14,
                        border: isSelected ? "1.5px solid #fff" : "1.5px solid rgba(255,255,255,0.1)",
                        background: isSelected ? "#fff" : "rgba(255,255,255,0.05)",
                        color: isSelected ? "#000" : "#fff",
                      }}
                    >
                      <span>{v.name}</span>
                      <span style={{ opacity: isSelected ? 1 : 0.5 }}>
                        R${Number(v.price).toFixed(2).replace(".", ",")}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Botão PEDIR */}
          {mode === "delivery" && (
            <button
              onClick={handleOrder}
              disabled={!canOrder}
              className="w-full flex items-center justify-center gap-2 font-bold text-sm tracking-wide uppercase transition-all active:scale-95"
              style={{
                borderRadius: 16,
                height: 52,
                background: canOrder ? "#fff" : "rgba(255,255,255,0.07)",
                color: canOrder ? "#000" : "rgba(255,255,255,0.25)",
                cursor: canOrder ? "pointer" : "not-allowed",
                letterSpacing: "0.06em",
              }}
            >
              {canOrder ? (
                <>
                  Pedir
                  {priceLabel && <span style={{ opacity: 0.6, fontWeight: 400 }}>• {priceLabel}</span>}
                </>
              ) : (
                "Selecione uma opção"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}