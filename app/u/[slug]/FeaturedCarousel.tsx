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

export default function FeaturedCarousel({
  items,
  onOpen,
}: {
  items: Product[];
  onOpen: (p: Product, originalIndex: number) => void;
}) {
  const { scrollerRef, activeIndex, bind } = useCarouselSnap({ initialIndex: 0 });

  const HERO_W = "88%";
  const SIDE_W = "80%";
  const GAP = 14;

  return (
    <div
      ref={scrollerRef}
      {...bind}
      className="fy-scroll-x"
      style={{
        display: "flex",
        gap: GAP,
        overflowX: "auto",
        padding: "10px 14px 14px",
        scrollBehavior: "auto",

        // ✅ crítico iOS
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
              transform: `scale(${isHero ? 1 : 0.93})`,
              transformOrigin: "center",
              transition: "transform 160ms ease",
              opacity: isHero ? 1 : 0.88,
            }}
            onClick={() => onOpen(p, idx)}
          >
            {/* ✅ aqui também: usar o MESMO card interno que já existia */}
            <div style={{ width: "100%" }} />
          </div>
        );
      })}
    </div>
  );
}