"use client";

import React, { useEffect, useRef } from "react";

type Product = {
  id: string;
  name: string;
  description: string;
  price_type: "fixed" | "variable";
  base_price: number;
  thumbnail_url: string;
  video_url: string;
};

export default function FeaturedCarousel({
  items,
  onOpen,
}: {
  items: Product[];
  onOpen: (p: Product, index: number) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !items.length) return;

    requestAnimationFrame(() => {
      const children = Array.from(el.querySelectorAll<HTMLElement>("[data-item]"));
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

    let timeout: any = null;

    const settle = () => {
      const children = Array.from(el.querySelectorAll<HTMLElement>("[data-item]"));
      if (!children.length) return;

      const center = el.scrollLeft + el.clientWidth / 2;

      let best: HTMLElement | null = null;
      let bestDist = Infinity;

      for (const c of children) {
        const cCenter = c.offsetLeft + c.offsetWidth / 2;
        const dist = Math.abs(cCenter - center);

        if (dist < bestDist) {
          bestDist = dist;
          best = c;
        }
      }

      if (!best) return;

      const bestCenter = best.offsetLeft + best.offsetWidth / 2;
      const target = bestCenter - el.clientWidth / 2;

      el.scrollTo({ left: target, behavior: "smooth" });
    };

    const onScroll = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(settle, 120);
    };

    el.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      if (timeout) clearTimeout(timeout);
      el.removeEventListener("scroll", onScroll);
    };
  }, []);

  const heroW = 320;
  const sideW = 260;
  const heroIndex = Math.floor(items.length / 2);

  return (
    <div>
      <div
        ref={scrollerRef}
        className="fy-scroll-x"
        style={{
          display: "flex",
          gap: 14,
          overflowX: "auto",
          padding: "12px 14px",
          WebkitOverflowScrolling: "touch",
          touchAction: "auto",
        }}
      >
        {items.map((p, i) => (
          <div
            key={p.id}
            data-item
            style={{
              flex: `0 0 ${i === heroIndex ? heroW : sideW}px`,
              transform: `scale(${i === heroIndex ? 1 : 0.94})`,
              transition: "transform 160ms ease",
            }}
            onClick={() => onOpen(p, i)}
          >
            {/* seu ProductCard aqui (mantém o design interno) */}
            <div style={{ height: 520, background: "#222", borderRadius: 24 }} />
          </div>
        ))}
      </div>
    </div>
  );
}