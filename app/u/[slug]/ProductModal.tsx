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
  // ── swipe lateral: índice do produto exibido ─────────────────────────────
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  useEffect(() => {
    if (!product) return;
    const idx = allProducts.findIndex((p) => p.id === product.id);
    setCurrentIndex(idx >= 0 ? idx : 0);
  }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentProduct =
    allProducts.length > 0 ? (allProducts[currentIndex] ?? product) : product;

  // ── reset variação ao trocar produto ─────────────────────────────────────
  const [selectedVariation, setSelectedVariation] =
    useState<ProductVariation | null>(null);
  useEffect(() => {
    setSelectedVariation(null);
  }, [currentProduct?.id]);

  // ── fade da thumbnail quando vídeo inicia ────────────────────────────────
  const [thumbVisible, setThumbVisible] = useState(true);
  useEffect(() => {
    setThumbVisible(true);
  }, [currentProduct?.id]);

  // ── swipe ─────────────────────────────────────────────────────────────────
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
    if (Math.abs(dy) > Math.abs(dx) && dy > THRESHOLD) {
      onClose();
      return;
    }
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx < -THRESHOLD) goNext();
      else if (dx > THRESHOLD) goPrev();
    }
  }

  // ── guard ─────────────────────────────────────────────────────────────────
  if (!product || !currentProduct) return null;

  // ── preço ─────────────────────────────────────────────────────────────────
  const isFixed = currentProduct.price_type === "fixed";
  const hasVariations = variations && variations.length > 0;
  const activePrice: number | null = isFixed
    ? currentProduct.base_price ?? null
    : selectedVariation?.price ?? null;
  const canOrder = isFixed || selectedVariation !== null;
  const priceLabel = activePrice
    ? `R$\u00a0${Number(activePrice).toFixed(2).replace(".", ",")}`
    : null;

  // ── mídia — campos REAIS do schema ───────────────────────────────────────
  // NUNCA usar: thumb_path | image_path | video_path
  const thumbUrl: string | null = currentProduct.thumbnail_url ?? null;
  const videoUrl: string | null = currentProduct.video_url ?? null;
  const hasMedia = !!(thumbUrl || videoUrl);

  // ── counter X/Y ───────────────────────────────────────────────────────────
  const total = allProducts.length;
  const counter = total > 1 ? `${currentIndex + 1} / ${total}` : null;

  function handleOrder() {
    if (!canOrder) return;
    onOrder({
      product: currentProduct!,
      variation: selectedVariation ?? undefined,
      upsells: [],
      total: activePrice ?? 0,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Container — mesma linguagem do card: rounded-2xl, bg-zinc-900, shadow-lg */}
      <div
        className="w-full max-w-md rounded-t-2xl bg-zinc-900 overflow-hidden shadow-lg
          animate-in slide-in-from-bottom duration-300"
        style={{ maxHeight: "92dvh" }}
      >
        {/* ── MEDIA — mesma estética do card ─────────────────────────────── */}
        <div
          className="relative w-full overflow-hidden bg-zinc-900"
          style={{ aspectRatio: "4/3" }}
        >
          {hasMedia ? (
            <>
              {/* Thumbnail com fade quando vídeo inicia */}
              {thumbUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thumbUrl}
                  alt={currentProduct.name}
                  className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
                  style={{ opacity: thumbVisible ? 1 : 0, zIndex: 1 }}
                />
              )}
              {/* Vídeo */}
              {videoUrl && (
                <video
                  key={videoUrl}
                  src={videoUrl}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ zIndex: 2 }}
                  autoPlay
                  loop
                  muted
                  playsInline
                  onPlay={() => setTimeout(() => setThumbVisible(false), 1000)}
                />
              )}
            </>
          ) : (
            /* Placeholder igual ao card */
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
              <span className="text-4xl opacity-20">🍽️</span>
            </div>
          )}

          {/* Gradiente inferior igual ao card */}
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"
            style={{ zIndex: 3 }}
          />

          {/* Nome + preço no overlay inferior — igual ao card */}
          <div
            className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-8"
            style={{ zIndex: 4 }}
          >
            <p className="text-white font-semibold text-base leading-tight drop-shadow">
              {currentProduct.name}
            </p>
            {isFixed && priceLabel && (
              <p className="text-white/80 text-sm font-medium mt-0.5">
                {priceLabel}
              </p>
            )}
          </div>

          {/* Botão fechar */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center
              rounded-full bg-black/50 text-white text-sm backdrop-blur-sm"
            style={{ zIndex: 10 }}
          >
            ✕
          </button>

          {/* Counter X / Y */}
          {counter && (
            <div
              className="absolute top-3 left-3 px-3 py-1 rounded-full
                bg-black/50 text-white text-xs font-bold backdrop-blur-sm"
              style={{ zIndex: 10 }}
            >
              {counter}
            </div>
          )}

          {/* Setas laterais */}
          {allProducts.length > 1 && currentIndex > 0 && (
            <button
              onClick={goPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9
                flex items-center justify-center rounded-full
                bg-black/50 text-white text-xl backdrop-blur-sm"
              style={{ zIndex: 10 }}
            >
              ‹
            </button>
          )}
          {allProducts.length > 1 && currentIndex < allProducts.length - 1 && (
            <button
              onClick={goNext}
              className="absolute right-12 top-1/2 -translate-y-1/2 w-9 h-9
                flex items-center justify-center rounded-full
                bg-black/50 text-white text-xl backdrop-blur-sm"
              style={{ zIndex: 10 }}
            >
              ›
            </button>
          )}
        </div>

        {/* ── CONTENT — continuação natural da mídia ──────────────────────── */}
        <div
          className="overflow-y-auto px-4 pt-4 pb-6"
          style={{ maxHeight: "50dvh" }}
        >
          {/* Descrição — nome já está no overlay da mídia */}
          {currentProduct.description && (
            <p className="text-zinc-400 text-sm leading-relaxed mb-4">
              {currentProduct.description}
            </p>
          )}

          {/* Variações */}
          {hasVariations && (
            <div className="mb-5">
              <p className="text-zinc-500 text-xs uppercase tracking-widest mb-3 font-semibold">
                Escolha uma opção
              </p>
              <div className="flex flex-col gap-2">
                {variations.map((v) => {
                  const isSelected = selectedVariation?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariation(v)}
                      className={`flex items-center justify-between px-4 py-3 rounded-2xl border
                        transition-all text-sm font-medium
                        ${
                          isSelected
                            ? "border-white bg-white text-black"
                            : "border-zinc-700 bg-zinc-800 text-white hover:border-zinc-500"
                        }`}
                    >
                      <span>{v.name}</span>
                      <span className={isSelected ? "text-black" : "text-zinc-400"}>
                        R${Number(v.price).toFixed(2).replace(".", ",")}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Botão PEDIR — só no modo delivery */}
          {mode === "delivery" && (
            <button
              onClick={handleOrder}
              disabled={!canOrder}
              className={`w-full py-3.5 rounded-2xl font-bold text-sm tracking-wide uppercase
                transition-all flex items-center justify-center gap-2
                ${
                  canOrder
                    ? "bg-white text-black active:scale-95 hover:bg-zinc-100"
                    : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                }`}
            >
              {canOrder ? (
                <>
                  Pedir
                  {priceLabel && (
                    <span className="font-bold opacity-80">• {priceLabel}</span>
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
  );
}