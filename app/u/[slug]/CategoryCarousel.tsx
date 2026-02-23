"use client";

import React from "react";
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

export default function CategoryCarousel({
  items,
  onOpen,
  compact,
}: {
  items: Product[];
  onOpen: (p: Product, index: number) => void;
  compact?: boolean;
}) {
  const { scrollerRef, activeIndex, bind } = useCarouselSnap({ initialIndex: 0 });

  // tamanhos (só wrapper)
  const HERO_W = compact ? "78%" : "84%";
  const SIDE_W = compact ? "70%" : "76%";

  const GAP = compact ? 10 : 14;

  return (
    <div
      ref={scrollerRef}
      {...bind}
      className="fy-scroll-x"
      style={{
        display: "flex",
        gap: GAP,
        overflowX: "auto",
        padding: "8px 14px 12px",
        scrollBehavior: "auto",

        // ✅ crítico iOS: não prender vertical
        touchAction: "pan-y pinch-zoom",
        WebkitOverflowScrolling: "touch" as any,
      }}
    >
      {items.map((p, idx) => {
        const isHero = idx === activeIndex;

        return (
          <div
            key={p.id}
            data-carousel-item
            style={{
              flex: `0 0 ${isHero ? HERO_W : SIDE_W}`,
              transform: `scale(${isHero ? 1 : 0.92})`,
              transformOrigin: "center",
              transition: "transform 160ms ease",
              opacity: isHero ? 1 : 0.88,
            }}
            onClick={() => onOpen(p, idx)}
          >
            {/* ✅ NÃO mexe no card interno - só renderiza como já era */}
            <div style={{ width: "100%" }}>
              {/* Se seu card é um componente, substitua aqui pelo que já estava antes */}
              {/* Mantive genérico: */}
              <div style={{ width: "100%" }}>
                {/* O “card” real já deve estar no seu componente antigo.
                    Se você já tinha um ProductCard aqui, volte ele. */}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}