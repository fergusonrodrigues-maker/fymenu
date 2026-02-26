// FILE: /app/u/[slug]/CategoryCarousel.tsx
// ACTION: REPLACE ENTIRE FILE

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Product } from "./menuTypes";

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
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rafRef = useRef<number | null>(null);

  const list = useMemo(() => items ?? [], [items]);

  const [heroIndex, setHeroIndex] = useState(0);

  // começa no card 2 como HERO (index 1), mas sem travar depois.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    if (list.length < 2) return;

    // esperar layout
    const t = setTimeout(() => {
      const el = cardRefs.current[1];
      if (!el) return;
      el.scrollIntoView({ behavior: "instant" as any, inline: "center", block: "nearest" });
      setHeroIndex(1);
    }, 60);

    return () => clearTimeout(t);
  }, [list.length]);

  function computeHero() {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const sr = scroller.getBoundingClientRect();
    const center = sr.left + sr.width / 2;

    let best = 0;
    let bestDist = Infinity;

    for (let i = 0; i < list.length; i++) {
      const el = cardRefs.current[i];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const c = r.left + r.width / 2;
      const d = Math.abs(c - center);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }

    setHeroIndex(best);
  }

  function onScroll() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(computeHero);
  }

  useEffect(() => {
    computeHero();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.length]);

  // sizing
  const baseWidth = compact ? 170 : 220;
  const heroScale = compact ? 1.14 : 1.22;

  return (
    <div style={{ width: "100%", paddingTop: 10, paddingBottom: 8 }}>
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        style={{
          display: "flex",
          gap: 12,
          overflowX: "auto",
          overflowY: "visible",
          padding: "10px 14px 18px",
          WebkitOverflowScrolling: "touch",
          scrollSnapType: "x mandatory",
          touchAction: "pan-y pan-x",
          scrollbarWidth: "none",
        }}
      >
        {list.map((p, idx) => {
          const isHero = idx === heroIndex;

          return (
            <div
              key={p.id}
              ref={(el) => {
                cardRefs.current[idx] = el;
              }}
              style={{
                flex: "0 0 auto",
                width: baseWidth,
                scrollSnapAlign: "center",
                transform: isHero ? `scale(${heroScale})` : "scale(0.96)",
                transformOrigin: "center center",
                transition: "transform 220ms ease",
                zIndex: isHero ? 5 : 1,
              }}
            >
              <MediaCard product={p} hero={isHero} onOpen={() => onOpen(p, idx)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MediaCard({
  product,
  hero,
  onOpen,
}: {
  product: Product;
  hero: boolean;
  onOpen: () => void;
}) {
  const [videoReady, setVideoReady] = useState(false);
  const readyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setVideoReady(false);
    if (readyTimerRef.current) window.clearTimeout(readyTimerRef.current);
    readyTimerRef.current = null;
  }, [product.id, hero]);

  const showVideo = hero && !!product.video_url;

  return (
    <button
      onClick={onOpen}
      style={{
        width: "100%",
        aspectRatio: "9 / 16",
        borderRadius: 22,
        border: "1px solid rgba(255,255,255,0.12)",
        overflow: "hidden",
        background: "rgba(255,255,255,0.06)",
        position: "relative",
        padding: 0,
        cursor: "pointer",
      }}
    >
      {/* thumb */}
      {product.thumbnail_url ? (
        <img
          src={product.thumbnail_url}
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
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            opacity: 0.55,
            color: "#fff",
            fontWeight: 800,
            fontSize: 12,
          }}
        >
          Sem thumb
        </div>
      )}

      {/* vídeo só no HERO */}
      {showVideo ? (
        <video
          src={product.video_url!}
          autoPlay
          loop
          muted
          playsInline
          controls={false}
          preload="metadata"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
          onPlay={() => {
            if (readyTimerRef.current) window.clearTimeout(readyTimerRef.current);
            readyTimerRef.current = window.setTimeout(() => setVideoReady(true), 1000);
          }}
        />
      ) : null}

      {/* gradient */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.08) 76%, rgba(0,0,0,0.00) 100%)",
        }}
      />

      {/* text */}
      <div
        style={{
          position: "absolute",
          left: 12,
          right: 12,
          bottom: 12,
          textAlign: "left",
          color: "#fff",
        }}
      >
        <div style={{ fontWeight: 950, fontSize: 14, lineHeight: 1.1 }}>
          {product.name}
        </div>
      </div>
    </button>
  );
}