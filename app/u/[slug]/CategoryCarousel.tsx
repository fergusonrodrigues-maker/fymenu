// FILE: /app/u/[slug]/CategoryCarousel.tsx
"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import type { Product } from "./menuTypes";

// ─── tipos ────────────────────────────────────────────────────────────────────
interface CategoryCarouselProps {
  items: Product[];
  compact?: boolean;
  active?: boolean;           // true = categoria vigente (hero)
  onOpen: (p: Product, originalIndex: number) => void;
}

// ─── constantes ───────────────────────────────────────────────────────────────
const HERO_W   = 150;   // largura card hero (categoria ativa) — 25% maior que SMALL_W
const SIDE_W   = 112;   // largura cards laterais (categoria ativa)
const SMALL_W  = 90;    // largura cards (categoria inativa)
const GHOST_W  = 28;    // largura card DESLIZE — estreito
const GAP      = 10;

export default function CategoryCarousel({
  items,
  active = false,
  onOpen,
}: CategoryCarouselProps) {
  const scrollerRef  = useRef<HTMLDivElement | null>(null);
  const cardRefs     = useRef<(HTMLDivElement | null)[]>([]);
  const rafRef       = useRef<number | null>(null);
  const snapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [heroIndex, setHeroIndex] = useState(1); // índice 0 = ghost start
  const heroIndexRef = useRef(1);

  const list = items ?? [];
  const cardW = active ? HERO_W : SMALL_W;

  // centraliza o card de índice `idx` (índice no array renderizado, 0 = ghost)
  const centerCard = useCallback((idx: number, smooth = false) => {
    const scroller = scrollerRef.current;
    const card = cardRefs.current[idx];
    if (!scroller || !card) return;
    const sr = scroller.getBoundingClientRect();
    const cr = card.getBoundingClientRect();
    const cardCenter = scroller.scrollLeft + (cr.left - sr.left) + cr.width / 2;
    const target = cardCenter - scroller.offsetWidth / 2;
    if (smooth) scroller.scrollTo({ left: target, behavior: "smooth" });
    else scroller.scrollLeft = target;
  }, []);

  // ao montar ou mudar active: centraliza produto 1 (renderedIdx = 1)
  useEffect(() => {
    const t1 = setTimeout(() => { centerCard(1); setHeroIndex(1); heroIndexRef.current = 1; }, 60);
    const t2 = setTimeout(() => { centerCard(1); }, 380);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // detecta qual card está mais próximo do centro durante o scroll
  function computeHero(snap = false) {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const sr = scroller.getBoundingClientRect();
    const center = sr.left + sr.width / 2;
    const total = list.length + 2; // ghost + produtos + ghost
    let best = 1, bestDist = Infinity;
    for (let i = 1; i < total - 1; i++) { // ignora ghosts
      const el = cardRefs.current[i];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - center);
      if (d < bestDist) { bestDist = d; best = i; }
    }
    setHeroIndex(best);
    heroIndexRef.current = best;
    if (snap) centerCard(best, true);
  }

  function onScroll() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => computeHero(false));
    if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
    snapTimerRef.current = setTimeout(() => computeHero(true), 120);
  }

  // largura do ghost para centralizar o primeiro e o último produto
  const guideW = `calc(50% - ${GAP + (active ? HERO_W : SMALL_W) / 2}px)`;

  return (
    <div
      ref={scrollerRef}
      onScroll={onScroll}
      style={{
        display: "flex",
        alignItems: "center",
        gap: GAP,
        overflowX: "auto",
        overflowY: "hidden",
        padding: active ? "48px 0 52px" : "14px 0 16px",
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none",
        transition: "padding 0.4s ease",
      }}
    >
      <style>{`.fy-carousel::-webkit-scrollbar{display:none}`}</style>

      {/* Ghost início */}
      <div
        ref={el => { cardRefs.current[0] = el; }}
        style={{ flex: "0 0 auto", width: guideW, minWidth: GHOST_W, pointerEvents: "none" }}
      >
        <GhostCard />
      </div>

      {/* Produtos */}
      {list.map((p, idx) => {
        const ri = idx + 1; // rendered index
        const isHero = active && ri === heroIndex;
        const w = active
          ? (isHero ? HERO_W : SIDE_W)
          : SMALL_W;

        return (
          <div
            key={p.id}
            ref={el => { cardRefs.current[ri] = el; }}
            style={{
              flex: "0 0 auto",
              width: w,
              maxWidth: 280,
              transition: "width 0.35s cubic-bezier(0.34,1.56,0.64,1), transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease",
              transform: isHero ? "scale(1.04)" : "scale(1)",
              opacity: active ? (isHero ? 1 : 0.72) : 0.6,
              borderRadius: 18,
              border: isHero
                ? "1.5px solid #FF6B00"
                : active
                ? "1px solid rgba(255,255,255,0.1)"
                : "1px solid rgba(255,255,255,0.07)",
              overflow: "hidden",
              zIndex: isHero ? 5 : 1,
            }}
          >
            <MediaCard
              product={p}
              hero={isHero}
              active={active}
              onOpen={() => onOpen(p, idx)}
            />
          </div>
        );
      })}

      {/* Ghost fim */}
      <div
        ref={el => { cardRefs.current[list.length + 1] = el; }}
        style={{ flex: "0 0 auto", width: guideW, minWidth: GHOST_W, pointerEvents: "none" }}
      >
        <GhostCard />
      </div>
    </div>
  );
}

// ─── Ghost card "DESLIZE" ─────────────────────────────────────────────────────
function GhostCard() {
  return (
    <div style={{
      width: "100%",
      aspectRatio: "9 / 16",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.05)",
      background: "rgba(255,255,255,0.02)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <span style={{
        fontSize: 7,
        color: "rgba(255,255,255,0.15)",
        writingMode: "vertical-rl",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        fontWeight: 500,
      }}>
        Deslize
      </span>
    </div>
  );
}

// ─── Media card ───────────────────────────────────────────────────────────────
function MediaCard({
  product,
  hero,
  active,
  onOpen,
}: {
  product: Product;
  hero: boolean;
  active: boolean;
  onOpen: () => void;
}) {
  const [videoReady, setVideoReady] = useState(false);
  const readyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setVideoReady(false);
    if (readyTimerRef.current) window.clearTimeout(readyTimerRef.current);
  }, [product.id, hero]);

  const loadVideo = hero && !!product.video_url;
  const showVideo = hero && !!product.video_url;

  // NUNCA usar: thumb_path | image_path | video_path
  const thumbUrl = product.thumbnail_url ?? null;
  const videoUrl = product.video_url ?? null;

  const priceLabel = product.price_type === "fixed" && product.base_price != null
    ? `R$ ${Number(product.base_price).toFixed(2).replace(".", ",")}`
    : null;

  return (
    <button
      onClick={onOpen}
      style={{
        width: "100%",
        aspectRatio: "9 / 16",
        borderRadius: "inherit",
        border: "none",
        overflow: "hidden",
        background: "#111",
        position: "relative",
        padding: 0,
        cursor: "pointer",
        WebkitMaskImage: "-webkit-radial-gradient(white, black)",
      }}
    >
      {/* Thumbnail */}
      {thumbUrl ? (
        <img
          src={thumbUrl}
          alt={product.name}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: showVideo && videoReady ? 0 : 1,
            transition: "opacity 240ms ease",
          }}
        />
      ) : (
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0.15,
          fontSize: 28,
        }}>
          🍽️
        </div>
      )}

      {/* Vídeo — só carrega no hero */}
      {loadVideo && videoUrl && (
        <video
          src={videoUrl}
          autoPlay={showVideo}
          loop
          muted
          playsInline
          preload={showVideo ? "auto" : "metadata"}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: showVideo ? 1 : 0,
          }}
          onPlay={() => {
            if (readyTimerRef.current) window.clearTimeout(readyTimerRef.current);
            readyTimerRef.current = window.setTimeout(() => setVideoReady(true), 800);
          }}
        />
      )}

      {/* Gradiente */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 45%, transparent 75%)",
      }} />

      {/* Info */}
      <div style={{
        position: "absolute",
        left: 10,
        right: 10,
        bottom: 10,
        textAlign: "left",
      }}>
        <p style={{
          color: "#fff",
          fontWeight: 500,
          fontSize: hero ? 13 : 10,
          lineHeight: 1.2,
          margin: "0 0 3px",
          transition: "font-size 0.3s ease",
        }}>
          {product.name}
        </p>
        {priceLabel && (
          <p style={{
            color: active && hero ? "#FF6B00" : "rgba(255,255,255,0.45)",
            fontSize: hero ? 12 : 9,
            fontWeight: 500,
            margin: 0,
            transition: "color 0.3s ease, font-size 0.3s ease",
          }}>
            {priceLabel}
          </p>
        )}
      </div>
    </button>
  );
}
