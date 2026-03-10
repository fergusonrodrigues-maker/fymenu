"use client";

import { useEffect, useRef, useState } from "react";
import { Product, ProductVariation } from "./menuTypes";
import { OrderPayload } from "./orderBuilder";

interface ProductModalProps {
  product: Product | null;
  variations: ProductVariation[];
  onClose: () => void;
  onOrder: (payload: OrderPayload) => void;
  mode?: "delivery" | "presencial";
}

export default function ProductModal({
  product,
  variations,
  onClose,
  onOrder,
  mode = "delivery",
}: ProductModalProps) {
  const [selectedVariation, setSelectedVariation] = useState<ProductVariation | null>(null);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    setSelectedVariation(null);
    setMediaIndex(0);
    setFadeIn(true);
  }, [product?.id]);

  if (!product) return null;

  const isFixed = product.price_type === "fixed";
  const hasVariations = variations && variations.length > 0;

  const activePrice: number | null = isFixed
    ? product.base_price ?? null
    : selectedVariation?.price ?? null;

  const canOrder = isFixed || selectedVariation !== null;

  const priceLabel = activePrice
    ? `R$${Number(activePrice).toFixed(2).replace(".", ",")}`
    : null;

  // Build media list from thumb_path (thumbnail_url mapped) and video_path (video_url mapped)
  type MediaItem =
    | { type: "image"; path: string }
    | { type: "video"; path: string };

  const mediaItems: MediaItem[] = [];
  if (product.thumbnail_url) mediaItems.push({ type: "image", path: product.thumbnail_url });
  if (product.video_url) mediaItems.push({ type: "video", path: product.video_url });

  const STORAGE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products`;

  function goToMedia(idx: number) {
    if (idx === mediaIndex) return;
    setFadeIn(false);
    setTimeout(() => {
      setMediaIndex(idx);
      setFadeIn(true);
    }, 150);
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;

    // Vertical swipe down → close
    if (dy > 60 && Math.abs(dy) > Math.abs(dx)) {
      onClose();
      return;
    }

    // Horizontal swipe → navigate media
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0 && mediaIndex < mediaItems.length - 1) goToMedia(mediaIndex + 1);
      if (dx > 0 && mediaIndex > 0) goToMedia(mediaIndex - 1);
    }
  }

  function handleOrder() {
    if (!product || !canOrder) return;
    onOrder({
      product,
      variation: selectedVariation ?? undefined,
      upsells: [],
      total: activePrice ?? 0,
    });
  }

  const currentMedia = mediaItems[mediaIndex] ?? null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-t-3xl bg-zinc-950 overflow-hidden
          animate-in slide-in-from-bottom duration-300"
        style={{ maxHeight: "92dvh" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Media */}
        {currentMedia ? (
          <div className="relative w-full bg-zinc-900" style={{ aspectRatio: "4/3" }}>
            <div
              className="w-full h-full transition-opacity duration-150"
              style={{ opacity: fadeIn ? 1 : 0 }}
            >
              {currentMedia.type === "video" ? (
                <video
                  key={currentMedia.path}
                  src={`${STORAGE}/${currentMedia.path}`}
                  className="w-full h-full object-cover"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`${STORAGE}/${currentMedia.path}`}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              )}
            </div>

            {/* Counter X/Y dots */}
            {mediaItems.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {mediaItems.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goToMedia(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      i === mediaIndex ? "bg-white scale-125" : "bg-white/40"
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center
                rounded-full bg-black/50 text-white text-lg backdrop-blur-sm"
            >
              ✕
            </button>
          </div>
        ) : (
          /* No media — close button only */
          <div className="flex items-center justify-end px-5 pt-5">
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center
                rounded-full bg-zinc-800 text-white text-lg"
            >
              ✕
            </button>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto px-5 pt-5 pb-8" style={{ maxHeight: "60dvh" }}>
          {/* Name + price */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <h2 className="text-white font-bold text-xl leading-tight flex-1">
              {product.name}
            </h2>
            {isFixed && priceLabel && (
              <span className="text-white font-bold text-xl whitespace-nowrap">
                {priceLabel}
              </span>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <p className="text-zinc-400 text-sm leading-relaxed mb-5">
              {product.description}
            </p>
          )}

          {/* Variations */}
          {hasVariations && (
            <div className="mb-6">
              <p className="text-zinc-400 text-xs uppercase tracking-widest mb-3 font-semibold">
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
                        ${isSelected
                          ? "border-white bg-white text-black"
                          : "border-zinc-700 bg-zinc-900 text-white hover:border-zinc-500"
                        }`}
                    >
                      <span>{v.name}</span>
                      <span className={isSelected ? "text-black" : "text-zinc-300"}>
                        R${Number(v.price).toFixed(2).replace(".", ",")}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Order button — delivery only */}
          {mode === "delivery" && (
            <button
              onClick={handleOrder}
              disabled={!canOrder}
              className={`w-full py-4 rounded-2xl font-bold text-base tracking-wide
                transition-all flex items-center justify-center gap-2
                ${canOrder
                  ? "bg-white text-black active:scale-95 hover:bg-zinc-100"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                }`}
            >
              {canOrder ? (
                <>
                  PEDIR
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
