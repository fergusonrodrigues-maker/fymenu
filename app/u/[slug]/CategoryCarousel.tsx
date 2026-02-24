// FILE: /app/u/[slug]/CategoryCarousel.tsx
// ACTION: REPLACE ENTIRE FILE

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Product } from "./menuTypes";

type Props = {
  items: Product[];
  compact?: boolean;
  onOpen: (p: Product, index: number) => void;
};

function moneyBRL(value: number | null) {
  if (value == null || Number.isNaN(value)) return "";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function CategoryCarousel({ items, compact = true, onOpen }: Props) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const [heroIndex, setHeroIndex] = useState(0);

  const sizes = useMemo(() => {
    // compact = categorias normais (menor)
    // featured vai usar FeaturedCarousel (maior)
    if (compact) {
      return {
        heroW: 210,
        sideW: 170,
        h: 280,
        radius: 22,
      };
    }
    return {
      heroW: 260,
      sideW: 210,
      h: 340,
      radius: 26,
    };
  }, [compact]);

  // calcula qual card está no centro do container
  function computeHeroIndex() {
    const el = scrollerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;

    let bestIdx = 0;
    let bestDist = Number.POSITIVE_INFINITY;

    for (let i = 0; i < items.length; i++) {
      const c = cardRefs.current[i];
      if (!c) continue;
      const r = c.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const d = Math.abs(cx - centerX);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }

    setHeroIndex(bestIdx);
  }

  // onScroll “leve” (RAF)
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    let raf = 0;

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        computeHeroIndex();
        // também atualiza o scale conforme distância do centro
        updateScales();
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    // primeira medição
    computeHeroIndex();
    updateScales();

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  // aplica scale baseado na distância do centro (premium sutil)
  function updateScales() {
    const container = scrollerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const maxDist = rect.width * 0.55;

    for (let i = 0; i < items.length; i++) {
      const c = cardRefs.current[i];
      if (!c) continue;

      const r = c.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const dist = Math.min(maxDist, Math.abs(cx - centerX));
      const t = 1 - dist / maxDist; // 0..1
      const scale = 0.92 + t * 0.10; // 0.92..1.02 (sutil)

      c.style.transform = `scale(${scale.toFixed(4)})`;
      c.style.opacity = String(0.70 + t * 0.30);
    }
  }

  // autoplay: só no HERO
  useEffect(() => {
    for (let i = 0; i < items.length; i++) {
      const v = videoRefs.current[i];
      if (!v) continue;

      const shouldPlay = i === heroIndex && !!items[i]?.video_url;

      if (shouldPlay) {
        v.muted = true;
        v.playsInline = true;
        try {
          const p = v.play();
          if (p && typeof (p as any).catch === "function") (p as any).catch(() => {});
        } catch {}
      } else {
        try {
          v.pause();
          v.currentTime = 0;
        } catch {}
      }
    }
  }, [heroIndex, items]);

  return (
    <div style={{ width: "100%" }}>
      <div
        ref={scrollerRef}
        className="fy-scroll-x fy-no-highlight"
        style={{
          display: "flex",
          gap: 12,
          overflowX: "auto",
          overflowY: "hidden",
          padding: "10px 2px 14px 2px",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-y pan-x",
        }}
      >
        {items.map((p, idx) => {
          const isHero = idx === heroIndex;
          const w = isHero ? sizes.heroW : sizes.sideW;

          return (
            <button
              key={p.id}
              ref={(r) => {
                cardRefs.current[idx] = r;
              }}
              onClick={() => onOpen(p, idx)}
              className="fy-no-highlight"
              style={{
                width: w,
                flex: "0 0 auto",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                borderRadius: sizes.radius,
                overflow: "hidden",
                cursor: "pointer",
                padding: 0,
                scrollSnapAlign: "center",
                transition: "width 180ms ease",
                willChange: "transform",
              }}
            >
              <div
                style={{
                  height: sizes.h,
                  position: "relative",
                  background: "rgba(0,0,0,0.55)",
                }}
              >
                {/* mídia: se tem vídeo e é HERO => mostra vídeo; senão mostra imagem */}
                {p.video_url && isHero ? (
                  <video
                    ref={(r) => {
                      videoRefs.current[idx] = r;
                    }}
                    src={p.video_url}
                    muted
                    playsInline
                    loop
                    preload="metadata"
                    poster={p.image_url ?? undefined}
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.image_url}
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
                      color: "rgba(255,255,255,0.55)",
                      fontSize: 12,
                      fontWeight: 800,
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
                      "linear-gradient(rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.00) 35%, rgba(0,0,0,0.75) 78%, rgba(0,0,0,0.92) 100%)",
                  }}
                />

                <div
                  style={{
                    position: "absolute",
                    left: 14,
                    right: 14,
                    bottom: 12,
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 950,
                      fontSize: 14,
                      lineHeight: 1.15,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {p.name}
                  </div>

                  <div style={{ marginTop: 6, fontSize: 14, fontWeight: 950 }}>
                    {moneyBRL(p.price)}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}