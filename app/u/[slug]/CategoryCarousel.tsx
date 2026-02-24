// FILE: /app/u/[slug]/CategoryCarousel.tsx
// ACTION: REPLACE ENTIRE FILE

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Product } from "./menuTypes";

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export default function CategoryCarousel({
  items,
  compact,
  onOpen,
  initialIndex = 1, // ✅ começa no card 2 por padrão
}: {
  items: Product[];
  compact: boolean;
  onOpen: (p: Product, originalIndex: number) => void;
  initialIndex?: number;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const [heroIndex, setHeroIndex] = useState<number>(() => clamp(initialIndex, 0, Math.max(0, items.length - 1)));

  const dims = useMemo(() => {
    // ✅ todos em 9:16 (inclusive HERO)
    // compact = categorias normais (menor)
    // destaque pode passar compact={false} e fica maior
    const baseW = compact ? 140 : 165;
    const baseH = Math.round((baseW * 16) / 9);

    // escala do HERO
    const heroScale = compact ? 1.14 : 1.22; // destaque fica naturalmente maior
    const sideScale = compact ? 0.94 : 0.92;

    return { baseW, baseH, heroScale, sideScale };
  }, [compact]);

  // ✅ Snap perfeito (não fica torto)
  function snapToIndex(idx: number, behavior: ScrollBehavior = "smooth") {
    const scroller = scrollerRef.current;
    const el = cardRefs.current[idx];
    if (!scroller || !el) return;

    const sRect = scroller.getBoundingClientRect();
    const cRect = el.getBoundingClientRect();

    const scrollerCenter = sRect.left + sRect.width / 2;
    const cardCenter = cRect.left + cRect.width / 2;

    const delta = cardCenter - scrollerCenter;
    scroller.scrollTo({ left: scroller.scrollLeft + delta, behavior });
  }

  // ✅ Ao abrir: já centraliza no card 2 como HERO (sem vazio)
  useEffect(() => {
    const idx = clamp(initialIndex, 0, Math.max(0, items.length - 1));
    setHeroIndex(idx);

    // espera layout
    const t = setTimeout(() => snapToIndex(idx, "auto"), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  // ✅ Determinar HERO pelo centro do container (bounding box + centro)
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    let raf = 0;

    const tick = () => {
      raf = 0;
      const sRect = scroller.getBoundingClientRect();
      const centerX = sRect.left + sRect.width / 2;

      let best = { idx: 0, dist: Infinity };

      for (let i = 0; i < items.length; i++) {
        const el = cardRefs.current[i];
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const c = r.left + r.width / 2;
        const d = Math.abs(c - centerX);
        if (d < best.dist) best = { idx: i, dist: d };
      }

      setHeroIndex(best.idx);

      // autoplay só no HERO
      for (let i = 0; i < items.length; i++) {
        const v = videoRefs.current[i];
        if (!v) continue;

        if (i === best.idx) {
          v.muted = true;
          v.playsInline = true;
          const p = v.play();
          if (p && typeof (p as any).catch === "function") (p as any).catch(() => {});
        } else {
          try {
            v.pause();
            v.currentTime = 0;
          } catch {}
        }
      }
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(tick);
    };

    scroller.addEventListener("scroll", onScroll, { passive: true });
    tick();

    return () => {
      scroller.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [items]);

  // ✅ ao soltar, garante snap perfeito no centro
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    let to: any = null;

    const onScroll = () => {
      if (to) clearTimeout(to);
      to = setTimeout(() => {
        snapToIndex(heroIndex, "smooth");
      }, 90);
    };

    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      if (to) clearTimeout(to);
    };
  }, [heroIndex]);

  return (
    <div style={{ width: "100%" }}>
      <div
        ref={scrollerRef}
        className="fy-scroll-x fy-no-highlight"
        style={{
          display: "flex",
          gap: 14,
          overflowX: "auto",
          overflowY: "hidden",
          padding: "8px 10px",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-y",
        }}
      >
        {items.map((p, idx) => {
          const isHero = idx === heroIndex;

          const scale = isHero ? dims.heroScale : dims.sideScale;

          return (
            <div
              key={p.id}
              ref={(el) => {
                cardRefs.current[idx] = el;
              }}
              onClick={() => onOpen(p, idx)}
              style={{
                flex: "0 0 auto",
                width: dims.baseW,
                height: dims.baseH,
                borderRadius: 22,
                overflow: "hidden",
                position: "relative",
                background: "#111",
                border: "1px solid rgba(255,255,255,0.10)",
                boxShadow: isHero ? "0 20px 50px rgba(0,0,0,0.55)" : "0 10px 24px rgba(0,0,0,0.35)",
                transform: `scale(${scale})`,
                transition: "transform 180ms ease, box-shadow 180ms ease",
                scrollSnapAlign: "center",
                cursor: "pointer",
              }}
            >
              {/* mídia */}
              <div style={{ position: "absolute", inset: 0, background: "#000" }}>
                {p.video_url ? (
                  <>
                    {/* poster sempre existe (morph visual simples) */}
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          opacity: isHero ? 0 : 1,
                          transition: "opacity 160ms ease",
                        }}
                      />
                    ) : null}

                    <video
                      ref={(el) => {
                        videoRefs.current[idx] = el;
                      }}
                      src={p.video_url}
                      muted
                      playsInline
                      loop
                      preload="metadata"
                      controls={false}
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        opacity: isHero ? 1 : 0,
                        transition: "opacity 160ms ease",
                      }}
                    />
                  </>
                ) : p.image_url ? (
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
                      color: "rgba(255,255,255,0.65)",
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
                      "linear-gradient(rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.00) 35%, rgba(0,0,0,0.78) 78%, rgba(0,0,0,0.94) 100%)",
                  }}
                />
              </div>

              {/* texto */}
              <div style={{ position: "absolute", left: 14, right: 14, bottom: 12 }}>
                <div
                  style={{
                    fontWeight: 950,
                    fontSize: 14,
                    lineHeight: 1.15,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {p.name}
                </div>

                {typeof p.price === "number" ? (
                  <div style={{ marginTop: 6, fontSize: 18, fontWeight: 950 }}>
                    {p.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </div>
                ) : (
                  <div style={{ marginTop: 6, fontSize: 16, fontWeight: 950 }}>Preço variável</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}