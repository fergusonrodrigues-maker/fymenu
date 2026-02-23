"use client";

import React, { useEffect, useMemo, useRef } from "react";

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

function getPriceLabel(p: Product) {
  if (p.price_type === "fixed") return moneyBR(p.base_price);

  const vars = (p.variations ?? []).slice();
  vars.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  if (!vars.length) return "Preço variável";
  const min = Math.min(...vars.map((v) => v.price));
  return `A partir de ${moneyBR(min)}`;
}

function ProductCard({ p }: { p: Product }) {
  const price = useMemo(() => getPriceLabel(p), [p]);

  return (
    <div
      className="fy-no-highlight"
      style={{
        width: "100%",
        borderRadius: 26,
        overflow: "hidden",
        position: "relative",
        background: "#111",
        aspectRatio: "9 / 16",
        boxShadow: "0 22px 52px rgba(0,0,0,0.55)",
      }}
    >
      {p.video_url ? (
        <video
          src={p.video_url}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          controls={false}
          poster={p.thumbnail_url || undefined}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: "translateZ(0)",
          }}
        />
      ) : p.thumbnail_url ? (
        <img
          src={p.thumbnail_url}
          alt={p.name}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: "translateZ(0)",
          }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            opacity: 0.7,
            color: "#fff",
            fontWeight: 900,
          }}
        >
          Sem mídia
        </div>
      )}

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.00) 30%, rgba(0,0,0,0.72) 72%, rgba(0,0,0,0.94) 100%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 18,
          right: 18,
          bottom: 18,
          textAlign: "center",
          color: "#fff",
        }}
      >
        <div style={{ fontWeight: 950, fontSize: 18, lineHeight: 1.1 }}>
          {p.name}
        </div>

        {!!p.description && (
          <div style={{ marginTop: 6, fontSize: 13, opacity: 0.9 }}>
            {p.description}
          </div>
        )}

        <div style={{ marginTop: 10, fontSize: 22, fontWeight: 950 }}>
          {price}
        </div>
      </div>
    </div>
  );
}

export default function FeaturedCarousel({
  items,
  onOpen,
}: {
  items: Product[];
  onOpen: (p: Product, originalIndex: number) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    if (!items.length) return;

    requestAnimationFrame(() => {
      const children = Array.from(el.querySelectorAll<HTMLElement>("[data-carousel-item]"));
      if (!children.length) return;

      const heroIndex = Math.floor(children.length / 2);
      const hero = children[heroIndex];

      const heroCenter = hero.offsetLeft + hero.offsetWidth / 2;
      const target = heroCenter - el.clientWidth / 2;
      el.scrollLeft = Math.max(0, target);
    });
  }, [items.length]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    let t: any = null;

    const settle = () => {
      const children = Array.from(el.querySelectorAll<HTMLElement>("[data-carousel-item]"));
      if (!children.length) return;

      const center = el.scrollLeft + el.clientWidth / 2;

      let best: HTMLElement | null = null;
      let bestDist = Infinity;

      for (const c of children) {
        const cCenter = c.offsetLeft + c.offsetWidth / 2;
        const d = Math.abs(cCenter - center);
        if (d < bestDist) {
          bestDist = d;
          best = c;
        }
      }

      if (!best) return;

      const bestCenter = best.offsetLeft + best.offsetWidth / 2;
      const target = bestCenter - el.clientWidth / 2;

      el.scrollTo({ left: target, behavior: "smooth" });
    };

    const onScroll = () => {
      if (t) clearTimeout(t);
      t = setTimeout(settle, 110);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (t) clearTimeout(t);
      el.removeEventListener("scroll", onScroll);
    };
  }, []);

  const heroIndex = Math.floor(items.length / 2);
  const heroW = 320;
  const sideW = 270;

  return (
    <div style={{ position: "relative" }}>
      <div
        ref={scrollerRef}
        className="fy-scroll-x"
        style={{
          display: "flex",
          gap: 14,
          overflowX: "auto",
          overflowY: "visible",
          padding: "12px 14px",
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-y pinch-zoom",
        }}
      >
        {items.map((p, idx) => (
          <div
            key={p.id}
            data-carousel-item
            style={{
              flex: `0 0 ${idx === heroIndex ? heroW : sideW}px`,
              transform: `scale(${idx === heroIndex ? 1 : 0.94})`,
              transition: "transform 160ms ease",
            }}
            onClick={() => onOpen(p, idx)}
          >
            <ProductCard p={p} />
          </div>
        ))}
      </div>
    </div>
  );
}