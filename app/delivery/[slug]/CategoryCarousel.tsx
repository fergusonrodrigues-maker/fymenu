// FILE: /app/delivery/[slug]/CategoryCarousel.tsx
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
const HW = 220;                          // hero width (categoria ativa)
const SW = Math.round(HW * 0.72);       // side width (categoria ativa)
const IW = 185;                          // width (categoria inativa)
const GAP = 13;

// marginTop para alinhar cards menores pelo centro com o hero
const heroH = HW * (16 / 9);
const sideH = SW * (16 / 9);
const SIDE_MT = Math.round((heroH - sideH) / 2);
// Altura fixa do viewport quando ativo — baseada no hero + paddings
const ACTIVE_VP_HEIGHT = Math.round(heroH + 12 + 55); // heroH + paddingTop + paddingBottom

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
  const dragStartY = useRef(0);

  const list = (items ?? []).filter((p: any) => p.is_active !== false);

  // posiciona o track para centralizar heroIdx
  function positionTrack(idx: number, animate: boolean) {
    const track = trackRef.current;
    const vp = vpRef.current;
    if (!track || !vp) return;

    const vpW = vp.offsetWidth;
    const heroW = active ? HW : IW;
    const ghostW = active ? Math.round(heroW * 0.55) : 105;

    let offset = ghostW + GAP;
    for (let i = 0; i < idx; i++) {
      const w = active ? (i === heroIdxRef.current ? HW : SW) : IW;
      offset += w + GAP;
    }
    const cardCenter = offset + heroW / 2;
    const tx = vpW / 2 - cardCenter;

    track.style.transition = animate
      ? "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)"
      : "none";
    track.style.transform = `translateX(${tx}px)`;
  }

  // centraliza produto 0 ao montar / mudar active
  useEffect(() => {
    const startIdx = list.length > 1 ? 1 : 0;
    heroIdxRef.current = startIdx;
    setHeroIdx(startIdx);
    const t1 = setTimeout(() => positionTrack(startIdx, false), 40);
    const t2 = setTimeout(() => positionTrack(startIdx, false), 220);
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
    dragStartY.current = e.clientY;
  }

  function onPointerUp(e: React.PointerEvent) {
    const dx = e.clientX - dragStartX.current;
    const dy = e.clientY - dragStartY.current;
    // Ignorar se o gesto foi mais vertical que horizontal
    if (Math.abs(dy) > Math.abs(dx)) return;
    // Threshold mais alto para evitar indecisão
    if (Math.abs(dx) < 40) return;
    if (dx < -40) goTo(heroIdxRef.current + 1);
    else if (dx > 40) goTo(heroIdxRef.current - 1);
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
        padding: active ? "12px 0 55px" : "10px 0 20px",
        height: active ? ACTIVE_VP_HEIGHT : "auto",
        transition: "padding 0.35s ease, height 0.35s ease",
        cursor: active ? "grab" : "default",
        touchAction: "pan-y",
      }}
      onPointerDown={active ? onPointerDown : undefined}
      onPointerUp={active ? onPointerUp : undefined}
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
          // preço exibido apenas no modal

          return (
            <div
              key={p.id}
              onClick={() => {
                if (!active) { onOpen(p, idx); return; }
                if (idx !== heroIdx) { goTo(idx); return; }
                onOpen(p, idx);
              }}
              style={{
                flexShrink: 0,
                width: w,
                borderRadius: 18,
                overflow: "hidden",
                cursor: "pointer",
                transition: "all 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
                opacity: active ? (isHero ? 1 : 0.85) : 1,
                border: "1px solid rgba(128,128,128,0.08)",
                marginTop: mt,
              }}
            >
              <div
                style={{
                  aspectRatio: "9 / 16",
                  position: "relative",
                  background: "#f0f0f0",
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
                    bottom: 10,
                    left: 6,
                    right: 6,
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      color: "#fff",
                      fontSize: isHero ? 13 : 9,
                      fontWeight: 600,
                      margin: 0,
                      lineHeight: 1.25,
                      transition: "font-size 0.3s",
                    }}
                  >
                    {p.name}
                  </p>
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
        border: "1px solid rgba(128,128,128,0.08)",
        background: "rgba(0,0,0,0.02)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginTop,
      }}
    >
      <span
        style={{
          fontSize: 6,
          color: "rgba(0,0,0,0.15)",
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
