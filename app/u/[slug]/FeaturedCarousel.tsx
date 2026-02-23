"use client";

import React, { useEffect } from "react";
import { useCarouselSnap } from "./useCarouselSnap";

type Variation = {
  id: string;
  product_id: string;
  name: string;
  price: number;
  order_index?: number;
};

type Product = {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price_type: "fixed" | "variable";
  base_price: number;
  thumbnail_url: string;
  video_url: string;
  variations?: Variation[];
};

function moneyBR(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getMinVariationPrice(p: Product): number | null {
  const vars = (p.variations ?? []).filter((v) => Number.isFinite(v.price));
  if (!vars.length) return null;
  let min = vars[0].price;
  for (const v of vars) if (v.price < min) min = v.price;
  return min;
}

export default function FeaturedCarousel({
  items,
  onOpen,
}: {
  items: Product[];
  onOpen: (p: Product, index: number) => void;
}) {
  const { scrollerRef, DebugOverlay } = useCarouselSnap({
    cardSelector: "[data-card='1']",
    settleMs: 90,
    smoothWhenSlow: true,
  });

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const first = el.querySelector<HTMLElement>("[data-card='1']");
    if (!first) return;

    const targetLeft = first.offsetLeft - (el.clientWidth / 2 - first.clientWidth / 2);
    el.scrollTo({ left: Math.max(0, targetLeft), behavior: "auto" });
  }, [scrollerRef, items.length]);

  const W = 280;

  return (
    <>
      {DebugOverlay}

      <div
        ref={scrollerRef}
        className="fy-scroll-x"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 14,
          overflowX: "auto",
          paddingTop: 14,
          paddingBottom: 12,
          paddingLeft: 26,
          paddingRight: 26,
          WebkitOverflowScrolling: "touch",

          // IMPORTANT: não travar vertical no iOS
          touchAction: "pan-y pinch-zoom",
        }}
      >
        {items.map((p, idx) => {
          const minVar = p.price_type === "variable" ? getMinVariationPrice(p) : null;
          const priceLabel =
            p.price_type === "fixed"
              ? moneyBR(p.base_price)
              : minVar !== null
              ? `A partir de ${moneyBR(minVar)}`
              : "Preço variável";

          return (
            <button
              key={p.id}
              data-card="1"
              onClick={() => onOpen(p, idx)}
              style={{
                minWidth: W,
                maxWidth: W,
                borderRadius: 24,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                overflow: "hidden",
                padding: 0,
                textAlign: "center",
                color: "#fff",
                cursor: "pointer",
                scrollSnapAlign: "center",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {/* ✅ NÃO ALTERAR DESIGN INTERNO */}
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "9 / 16",
                  background: "rgba(255,255,255,0.06)",
                }}
              >
                {p.thumbnail_url ? (
                  <img
                    src={p.thumbnail_url}
                    alt={p.name}
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "grid",
                      placeItems: "center",
                      opacity: 0.55,
                      fontSize: 12,
                    }}
                  >
                    sem foto
                  </div>
                )}

                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(rgba(0,0,0,0.00) 35%, rgba(0,0,0,0.70) 78%, rgba(0,0,0,0.88) 100%)",
                  }}
                />

                <div style={{ position: "absolute", left: 14, right: 14, bottom: 14 }}>
                  <div
                    style={{
                      fontWeight: 950,
                      fontSize: 16,
                      lineHeight: 1.05,
                      textShadow: "0 1px 8px rgba(0,0,0,0.6)",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {p.name}
                  </div>

                  {!!p.description && (
                    <div
                      style={{
                        marginTop: 6,
                        opacity: 0.85,
                        fontSize: 12,
                        lineHeight: 1.2,
                        textShadow: "0 1px 8px rgba(0,0,0,0.6)",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {p.description}
                    </div>
                  )}

                  <div style={{ marginTop: 8, fontWeight: 950, fontSize: 16 }}>{priceLabel}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <style jsx>{`
        .fy-scroll-x::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }
      `}</style>
    </>
  );
}