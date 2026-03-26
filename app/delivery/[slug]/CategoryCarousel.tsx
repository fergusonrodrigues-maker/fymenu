// FILE: /app/u/[slug]/CategoryCarousel.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import type { Product } from "./menuTypes";

interface CategoryCarouselProps {
  items: Product[];
  compact?: boolean;
  active?: boolean;
  onOpen: (p: Product, originalIndex: number) => void;
}

// Dimensões — hero domina, side 72%, proporção 9:16 garante altura proporcional
const HW = 130;                          // hero width (categoria ativa)
const SW = Math.round(HW * 0.72);       // side width (categoria ativa)
const IW = Math.round(HW / 1.4);        // width (categoria inativa)
const GAP = 8;

// marginTop para alinhar cards menores pelo centro com o hero
const heroH = HW * (16 / 9);
const sideH = SW * (16 / 9);
const SIDE_MT = Math.round((heroH - sideH) / 2);

export default function CategoryCarousel({
  items,
  active = false,
  onOpen,
}: CategoryCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const vpRef = useRef<HTMLDivElement>(null);
  const [heroIdx, setHeroIdx] = useState(0);
  const heroIdxRef = useRef(0);
  const dragStartX = useRef(0);

  const list = items ?? [];

  // posiciona o track para centralizar heroIdx
  function positionTrack(idx: number, animate: boolean) {
    const track = trackRef.current;
    const vp = vpRef.current;
    if (!track || !vp) return;

    const vpW = vp.offsetWidth;
    const heroW = active ? HW : IW;
    const ghostW = Math.round(heroW * 0.55);

    let offset = ghostW + GAP;
    for (let i = 0; i < idx; i++) {
      const w = active ? (i === heroIdxRef.current ? HW : SW) : IW;
      offset += w + GAP;
    }
    const cardCenter = offset + heroW / 2;
    const tx = vpW / 2 - cardCenter;

    track.style.transition = animate
      ? "transform 0.32s cubic-bezier(0.34,1.56,0.64,1)"
      : "none";
    track.style.transform = `translateX(${tx}px)`;
  }

  // centraliza produto 0 ao montar / mudar active
  useEffect(() => {
    heroIdxRef.current = 0;
    setHeroIdx(0);
    const t1 = setTimeout(() => positionTrack(0, false), 40);
    const t2 = setTimeout(() => positionTrack(0, false), 220);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, list.length]);

  function goTo(newIdx: number) {
    if (newIdx < 0 || newIdx >= list.length) return;
    heroIdxRef.current = newIdx;
    setHeroIdx(newIdx);
    positionTrack(newIdx, true);
  }

  // touch / mouse drag
  function onPointerDown(e: React.PointerEvent) {
    dragStartX.current = e.clientX;
  }

  function onPointerUp(e: React.PointerEvent) {
    const dx = e.clientX - dragStartX.current;
    if (Math.abs(dx) < 8) return;
    if (dx < -30) goTo(heroIdxRef.current + 1);
    else if (dx > 30) goTo(heroIdxRef.current - 1);
  }

  if (!list.length) return null;

  const heroW = active ? HW : IW;
  const ghostW = Math.round(heroW * 0.55);

  return (
    <div
      ref={vpRef}
      style={{
        overflow: "hidden",
        width: "100%",
        padding: active ? "28px 0 32px" : "8px 0 10px",
        transition: "padding 0.35s ease",
        cursor: "grab",
      }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <div
        ref={trackRef}
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: GAP,
          userSelect: "none",
        }}
      >
        {/* Ghost início */}
        <GhostCard width={ghostW} marginTop={active ? SIDE_MT : 0} />

        {/* Produtos */}
        {list.map((p, idx) => {
          const isHero = active && idx === heroIdx;
          const w = active ? (isHero ? HW : SW) : IW;
          const mt = active ? (isHero ? 0 : SIDE_MT) : 0;

          // NUNCA usar: thumb_path | image_path | video_path
          const thumbUrl = p.thumbnail_url ?? null;
          const videoUrl = p.video_url ?? null;
          const priceLabel =
            p.price_type === "fixed" && p.base_price != null
              ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(p.base_price / 100)
              : null;

          return (
            <div
              key={p.id}
              onClick={() => {
                if (active && idx !== heroIdx) { goTo(idx); return; }
                onOpen(p, idx);
              }}
              style={{
                flexShrink: 0,
                width: w,
                borderRadius: 14,
                overflow: "hidden",
                cursor: "pointer",
                transition: "all 0.32s cubic-bezier(0.34,1.56,0.64,1)",
                opacity: active ? (isHero ? 1 : 0.62) : 0.45,
                border: isHero && active
                  ? "1.5px solid #FF6B00"
                  : "1px solid rgba(255,255,255,0.07)",
                marginTop: mt,
              }}
            >
              <div
                style={{
                  aspectRatio: "9 / 16",
                  position: "relative",
                  background: "#1a1a1a",
                }}
              >
                {thumbUrl && (
                  <img
                    src={thumbUrl}
                    alt={p.name}
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                )}
                {videoUrl && active && isHero && (
                  <video
                    src={videoUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                )}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(to top, rgba(0,0,0,0.92) 0%, transparent 62%)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: 8,
                    left: 8,
                    right: 8,
                  }}
                >
                  <p
                    style={{
                      color: "#fff",
                      fontSize: isHero ? 12 : 9,
                      fontWeight: 500,
                      margin: "0 0 2px",
                      lineHeight: 1.2,
                      transition: "font-size 0.3s",
                    }}
                  >
                    {p.name}
                  </p>
                  {priceLabel && (
                    <p
                      style={{
                        color: active && isHero ? "#FF6B00" : "rgba(255,255,255,0.4)",
                        fontSize: isHero ? 10 : 8,
                        fontWeight: 500,
                        margin: 0,
                        transition: "all 0.3s",
                      }}
                    >
                      {priceLabel}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Ghost fim */}
        <GhostCard width={ghostW} marginTop={active ? SIDE_MT : 0} />
      </div>
    </div>
  );
}

function GhostCard({ width, marginTop }: { width: number; marginTop: number }) {
  return (
    <div
      style={{
        flexShrink: 0,
        width,
        aspectRatio: "9 / 16",
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.05)",
        background: "rgba(255,255,255,0.02)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginTop,
      }}
    >
      <span
        style={{
          fontSize: 6,
          color: "rgba(255,255,255,0.1)",
          writingMode: "vertical-rl",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        Deslize
      </span>
    </div>
  );
}
