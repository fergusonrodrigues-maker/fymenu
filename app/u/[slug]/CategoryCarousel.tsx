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

function ProductCard({
  p,
  compact,
}: {
  p: Product;
  compact?: boolean;
}) {
  const price = useMemo(() => getPriceLabel(p), [p]);

  return (
    <div
      className="fy-no-highlight"
      style={{
        width: "100%",
        borderRadius: 22,
        overflow: "hidden",
        position: "relative",
        background: "#111",
        aspectRatio: "9 / 16",
        boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
      }}
    >
      {/* Media */}
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

      {/* Overlay gradient */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.00) 32%, rgba(0,0,0,0.70) 72%, rgba(0,0,0,0.92) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Text */}
      <div
        style={{
          position: "absolute",
          left: 16,
          right: 16,
          bottom: 16,
          textAlign: "center",
          color: "#fff",
        }}
      >
        <div
          style={{
            fontWeight: 950,
            fontSize: compact ? 16 : 18,
            lineHeight: 1.1,
            textShadow: "0 2px 14px rgba(0,0,0,0.55)",
          }}
        >
          {p.name}
        </div>

        {!!p.description && (
          <div
            style={{
              marginTop: 6,
              fontSize: compact ? 12 : 13,
              opacity: 0.9,
              textShadow: "0 2px 14px rgba(0,0,0,0.55)",
            }}
          >
            {p.description}
          </div>
        )}

        <div
          style={{
            marginTop: 8,
            fontSize: compact ? 18 : 20,
            fontWeight: 950,
            textShadow: "0 2px 14px rgba(0,0,0,0.55)",
          }}
        >
          {price}
        </div>
      </div>
    </div>
  );
}

export default function CategoryCarousel({
  items,
  onOpen,
  compact,
}: {
  items: Product[];
  onOpen: (p: Product, index: number) => void;
  compact?: boolean;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  // ✅ Centraliza o HERO inicial (meio) sem smooth (evita engasgo no iOS)
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

  // ✅ Snap NEAREST ao soltar (sem setState no onScroll)
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
      t = setTimeout(settle, 110); // debounce curtinho = “soltou”
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (t) clearTimeout(t);
      el.removeEventListener("scroll", onScroll);
    };
  }, []);

  // tamanhos: HERO levemente maior, laterais menores
  const heroW = compact ? 260 : 290;
  const sideW = compact ? 220 : 250;

  return (
    <div style={{ position: "relative" }}>
      <div
        ref={scrollerRef}
        className="fy-scroll-x"
        style={{
          display: "flex",
          gap: compact ? 12 : 14,
          overflowX: "auto",
          overflowY: "visible",
          padding: compact ? "10px 12px" : "12px 14px",
          scrollBehavior: "auto",
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-y pinch-zoom", // ✅ não trava vertical no iOS
        }}
      >
        {items.map((p, idx) => (
          <div
            key={p.id}
            data-carousel-item
            style={{
              flex: `0 0 ${idx === Math.floor(items.length / 2) ? heroW : sideW}px`,
              transform: `scale(${idx === Math.floor(items.length / 2) ? 1 : 0.94})`,
              transformOrigin: "center",
              transition: "transform 160ms ease",
            }}
            onClick={() => onOpen(p, idx)}
          >
            <ProductCard p={p} compact={compact} />
          </div>
        ))}
      </div>
    </div>
  );
}