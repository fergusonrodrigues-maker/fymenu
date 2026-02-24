// FILE: /app/u/[slug]/CategoryCarousel.tsx
// ACTION: REPLACE ENTIRE FILE

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Product } from "./menuTypes";

function moneyBR(v: number | null) {
  if (v === null || v === undefined) return "";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function CategoryCarousel({
  items,
  compact,
  onOpen,
}: {
  items: Product[];
  compact: boolean;
  onOpen: (p: Product, originalIndex: number) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  // índice do HERO (card central)
  const [heroIndex, setHeroIndex] = useState<number>(0);

  // refs de video por card
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  const safeItems = useMemo(() => (items ?? []).filter(Boolean), [items]);

  // ===== SNAP PREMIUM (evita “parar torto”) =====
  const snapRafRef = useRef<number | null>(null);
  const snapTRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function snapToNearest(behavior: ScrollBehavior = "smooth") {
    const el = scrollerRef.current;
    if (!el) return;

    const cards = Array.from(el.querySelectorAll<HTMLElement>('[data-card="1"]'));
    if (!cards.length) return;

    const center = el.scrollLeft + el.clientWidth / 2;

    let bestIdx = 0;
    let bestDist = Number.POSITIVE_INFINITY;

    for (let i = 0; i < cards.length; i++) {
      const c = cards[i];
      const cardCenter = c.offsetLeft + c.offsetWidth / 2;
      const d = Math.abs(cardCenter - center);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }

    const target = cards[bestIdx];
    const targetLeft = target.offsetLeft + target.offsetWidth / 2 - el.clientWidth / 2;

    el.scrollTo({ left: targetLeft, behavior });
  }

  function scheduleSnap() {
    if (snapRafRef.current) cancelAnimationFrame(snapRafRef.current);
    snapRafRef.current = requestAnimationFrame(() => {
      if (snapTRef.current) clearTimeout(snapTRef.current);
      // “fim do gesto”: se parou por ~90ms, centraliza
      snapTRef.current = setTimeout(() => snapToNearest("smooth"), 90);
    });
  }

  // ===== HERO by center (bounding + centro do container) =====
  function computeHeroIndex() {
    const el = scrollerRef.current;
    if (!el) return;

    const cards = Array.from(el.querySelectorAll<HTMLElement>('[data-card="1"]'));
    if (!cards.length) return;

    const center = el.scrollLeft + el.clientWidth / 2;

    let bestIdx = 0;
    let bestDist = Number.POSITIVE_INFINITY;

    for (let i = 0; i < cards.length; i++) {
      const c = cards[i];
      const cardCenter = c.offsetLeft + c.offsetWidth / 2;
      const d = Math.abs(cardCenter - center);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }

    setHeroIndex(bestIdx);
  }

  // init + resize recalcula
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    // deixa iniciar no centro (se já estiver ok, não “pula”)
    requestAnimationFrame(() => {
      computeHeroIndex();
      snapToNearest("auto");
      computeHeroIndex();
    });

    function onResize() {
      computeHeroIndex();
      snapToNearest("auto");
      computeHeroIndex();
    }

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeItems.length]);

  // autoplay: só no HERO
  useEffect(() => {
    const p = safeItems[heroIndex];
    if (!p) return;

    // pausa todos
    for (const it of safeItems) {
      const v = videoRefs.current[it.id];
      if (!v) continue;
      try {
        v.pause();
      } catch {}
    }

    // toca só o do hero (mutado)
    if (p.video_url) {
      const v = videoRefs.current[p.id];
      if (v) {
        try {
          v.muted = true;
          v.playsInline = true;
          v.currentTime = 0;
        } catch {}
        const play = v.play();
        if (play && typeof (play as any).catch === "function") {
          (play as any).catch(() => {});
        }
      }
    }
  }, [heroIndex, safeItems]);

  // tamanhos (mantém teu look, só controla proporção e hierarquia)
  const cardW = compact ? 150 : 175; // largura base
  const heroScale = compact ? 1.12 : 1.16; // hero maior
  const gap = 14;
  const padX = 14;

  // altura sempre 9:16 por aspectRatio
  const cardRadius = 26;

  // overlay do texto (mantém padrão)
  const titleSize = compact ? 14 : 15;
  const priceSize = compact ? 16 : 17;

  // scroll/gesto: não travar vertical
  const touchAction = "pan-y pan-x";

  return (
    <div style={{ width: "100%" }}>
      <div
        ref={scrollerRef}
        className="fy-scroll-x"
        onScroll={() => {
          computeHeroIndex();
          scheduleSnap();
        }}
        onPointerUp={() => snapToNearest("smooth")}
        onTouchEnd={() => snapToNearest("smooth")}
        style={{
          display: "flex",
          gap,
          overflowX: "auto",
          overflowY: "hidden",
          padding: `8px ${padX}px`,
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          touchAction,
          scrollBehavior: "smooth",
        }}
      >
        {/* espaçador para centralizar o primeiro/último no meio */}
        <div style={{ flex: "0 0 auto", width: "calc((100% - 0px)/2)" }} />

        {safeItems.map((p, idx) => {
          const isHero = idx === heroIndex;

          // morph thumb <-> video (sutil)
          const showVideo = isHero && !!p.video_url;
          const videoOpacity = showVideo ? 1 : 0;
          const imgOpacity = showVideo ? 0 : 1;

          return (
            <button
              key={p.id}
              type="button"
              className="fy-no-highlight"
              data-card="1"
              onClick={() => onOpen(p, idx)}
              style={{
                all: "unset" as any,
                cursor: "pointer",
                flex: "0 0 auto",
                width: cardW,
                scrollSnapAlign: "center",
                transform: `scale(${isHero ? heroScale : 1})`,
                transformOrigin: "center center",
                transition: "transform 180ms ease",
                position: "relative",
              }}
            >
              <div
                style={{
                  width: "100%",
                  aspectRatio: "9 / 16",
                  borderRadius: cardRadius,
                  overflow: "hidden",
                  position: "relative",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  boxShadow: isHero ? "0 18px 40px rgba(0,0,0,0.45)" : "0 10px 26px rgba(0,0,0,0.35)",
                }}
              >
                {/* THUMB */}
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
                      opacity: imgOpacity,
                      transition: "opacity 180ms ease",
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
                      fontWeight: 800,
                      color: "#fff",
                    }}
                  >
                    Sem mídia
                  </div>
                )}

                {/* VÍDEO (só HERO) */}
                {p.video_url && (
                  <video
                    ref={(el) => {
                      videoRefs.current[p.id] = el;
                    }}
                    src={p.video_url}
                    muted
                    playsInline
                    preload="metadata"
                    loop
                    controls={false}
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      opacity: videoOpacity,
                      transition: "opacity 180ms ease",
                      pointerEvents: "none",
                    }}
                  />
                )}

                {/* GRADIENTE */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.0) 32%, rgba(0,0,0,0.72) 78%, rgba(0,0,0,0.92) 100%)",
                  }}
                />

                {/* TEXTO */}
                <div
                  style={{
                    position: "absolute",
                    left: 14,
                    right: 14,
                    bottom: 14,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    color: "#fff",
                    textShadow: "0 6px 18px rgba(0,0,0,0.45)",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 950,
                      fontSize: titleSize,
                      lineHeight: 1.1,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {p.name}
                  </div>

                  <div style={{ fontWeight: 950, fontSize: priceSize }}>
                    {p.variations && p.variations.length
                      ? "Preço variável"
                      : moneyBR(p.price)}
                  </div>
                </div>
              </div>
            </button>
          );
        })}

        {/* espaçador final */}
        <div style={{ flex: "0 0 auto", width: "calc((100% - 0px)/2)" }} />
      </div>

      {/* CSS local escondendo scrollbar + sem highlight */}
      <style>{`
        .fy-scroll-x::-webkit-scrollbar { width: 0; height: 0; display: none; }
        .fy-scroll-x { scrollbar-width: none; -ms-overflow-style: none; }
        .fy-no-highlight, button, a { -webkit-tap-highlight-color: transparent; }
        .fy-no-highlight:focus, .fy-no-highlight:focus-visible,
        button:focus, button:focus-visible,
        a:focus, a:focus-visible { outline: none; }
      `}</style>
    </div>
  );
}