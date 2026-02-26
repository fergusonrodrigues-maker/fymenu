// FILE: /app/u/[slug]/CategoryCarousel.tsx
// ACTION: REPLACE ENTIRE FILE

"use client";

import React, { useEffect, useMemo, useRef } from "react";
import type { Product } from "./menuTypes";

type Props = {
  items: Product[];
  compact: boolean; // <- obrigatório (resolve seu erro)
  onOpen: (p: Product, originalIndex: number) => void;

  // Destaque (quando true, escala 30%)
  isFeatured?: boolean;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function CategoryCarousel({ items, compact, onOpen, isFeatured }: Props) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const list = useMemo(() => items ?? [], [items]);

  // --- tamanhos (9:16 sempre)
  // base: hero 9:16 e cards 9:16
  // destaque: +30% (hero + cards)
  const scale = isFeatured ? 1.3 : 1;

  const heroWidth = Math.round((compact ? 220 : 260) * scale);
  const heroHeight = Math.round((heroWidth * 16) / 9); // 9:16
  const sideWidth = Math.round((compact ? 160 : 190) * scale);
  const sideHeight = Math.round((sideWidth * 16) / 9);

  // snap + “não ficar torto”
  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;

    let t: any = null;

    const onEnd = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        const r = root.getBoundingClientRect();
        const centerX = r.left + r.width / 2;

        let bestIdx = 0;
        let bestDist = Number.POSITIVE_INFINITY;

        cardRefs.current.forEach((el, idx) => {
          if (!el) return;
          const b = el.getBoundingClientRect();
          const cx = b.left + b.width / 2;
          const d = Math.abs(cx - centerX);
          if (d < bestDist) {
            bestDist = d;
            bestIdx = idx;
          }
        });

        const el = cardRefs.current[bestIdx];
        if (el) el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }, 80);
    };

    root.addEventListener("touchend", onEnd, { passive: true });
    root.addEventListener("mouseup", onEnd);

    return () => {
      root.removeEventListener("touchend", onEnd as any);
      root.removeEventListener("mouseup", onEnd as any);
      if (t) clearTimeout(t);
    };
  }, []);

  return (
    <div style={{ width: "100%", overflow: "visible" }}>
      <div
        ref={scrollerRef}
        style={{
          display: "flex",
          gap: 14,
          padding: "12px 14px 18px",
          overflowX: "auto",
          overflowY: "visible", // <- evita cortar o hero
          WebkitOverflowScrolling: "touch",

          scrollSnapType: "x mandatory",
          scrollPaddingLeft: "50%",
          scrollPaddingRight: "50%",

          // sem “travamento torto”
          overscrollBehaviorX: "contain",
        }}
      >
        {list.map((p, idx) => {
          // por padrão: card 2 como hero (idx 1)
          // (você pode mudar depois com intro/fim)
          const heroIndex = 1;
          const isHero = idx === heroIndex;

          const w = isHero ? heroWidth : sideWidth;
          const h = isHero ? heroHeight : sideHeight;

          const thumb = p.thumbnail_url ?? null;

          return (
            <button
              key={p.id}
              ref={(el) => {
                cardRefs.current[idx] = el;
              }}
              onClick={() => onOpen(p, idx)}
              style={{
                flex: "0 0 auto",
                width: w,
                height: h,
                borderRadius: 28,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.03)",
                padding: 0,
                position: "relative",
                overflow: "hidden",
                cursor: "pointer",

                scrollSnapAlign: "center",

                transform: "translateZ(0)",
                transition: "transform 260ms cubic-bezier(.22,.9,.3,1)",
              }}
            >
              {/* Thumb (sem misturar com vídeo aqui — só imagem no card) */}
              {thumb ? (
                <img
                  src={thumb}
                  alt={p.name}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    filter: "saturate(1.05)",
                    opacity: 0.95,
                  }}
                />
              ) : (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(140deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
                  }}
                />
              )}

              {/* overlay */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.35) 42%, rgba(0,0,0,0.10) 72%, rgba(0,0,0,0.00) 100%)",
                }}
              />

              {/* Texto */}
              <div
                style={{
                  position: "absolute",
                  left: 16,
                  right: 16,
                  bottom: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    color: "white",
                    fontWeight: 900,
                    fontSize: clamp(isHero ? 22 : 16, 14, 24),
                    lineHeight: 1.05,
                    textShadow: "0 10px 30px rgba(0,0,0,0.6)",
                  }}
                >
                  {p.name}
                </div>

                <div
                  style={{
                    color: "rgba(255,255,255,0.90)",
                    fontWeight: 900,
                    fontSize: clamp(isHero ? 26 : 18, 16, 28),
                    lineHeight: 1,
                    textShadow: "0 10px 30px rgba(0,0,0,0.6)",
                  }}
                >
                  {p.price_type === "variable" ? "Preço variável" : p.price != null ? `R$ ${Number(p.price).toFixed(2).replace(".", ",")}` : ""}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}