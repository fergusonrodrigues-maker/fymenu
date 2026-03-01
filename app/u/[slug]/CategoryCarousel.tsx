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
  // cardRefs: index 0 = guia início, 1..list.length = produtos, list.length+1 = guia fim
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rafRef = useRef<number | null>(null);
  const bounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const list = useMemo(() => items ?? [], [items]);

  // heroIndex 1 = primeiro produto (após o card guia de início)
  const [heroIndex, setHeroIndex] = useState(1);

  function centralizeCard(index: number, smooth = false) {
    const scroller = scrollerRef.current;
    const card = cardRefs.current[index];
    if (!scroller || !card) return;
    const left = card.offsetLeft - scroller.offsetWidth / 2 + card.offsetWidth / 2;
    if (smooth) scroller.scrollTo({ left, behavior: "smooth" });
    else scroller.scrollLeft = left;
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      centralizeCard(1);
      setHeroIndex(1);
    }, 200);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function computeHero() {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const sr = scroller.getBoundingClientRect();
    const center = sr.left + sr.width / 2;

    const total = list.length + 2; // guia início + produtos + guia fim
    let best = 1;
    let bestDist = Infinity;

    for (let i = 0; i < total; i++) {
      const el = cardRefs.current[i];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - center);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }

    setHeroIndex(best);

    // bounce-back: se card guia virou hero, volta para o produto mais próximo
    if (bounceTimerRef.current) clearTimeout(bounceTimerRef.current);
    if (best === 0) {
      bounceTimerRef.current = setTimeout(() => centralizeCard(1, true), 80);
    } else if (best === total - 1) {
      bounceTimerRef.current = setTimeout(() => centralizeCard(total - 2, true), 80);
    }
  }

  function onScroll() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(computeHero);
  }

  // sizing
  const baseWidth = compact ? 170 : 220;

  function cardStyle(renderedIdx: number) {
    const isHero = renderedIdx === heroIndex;
    return {
      flex: "0 0 auto" as const,
      width: baseWidth,
      scrollSnapAlign: "center" as const,
      transform: isHero ? "scale(1.13)" : "scale(0.92)",
      transformOrigin: "center center" as const,
      transition: isHero
        ? "transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)"
        : "transform 300ms ease",
      zIndex: isHero ? 5 : 1,
    };
  }

  return (
    <div style={{ width: "100%" }}>
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        style={{
          display: "flex",
          gap: 12,
          overflowX: "auto",
          overflowY: "hidden",
          padding: "10px 14px 18px",
          WebkitOverflowScrolling: "touch",
          scrollSnapType: "x mandatory",
          scrollBehavior: "smooth",
          touchAction: "pan-x pan-y",
          scrollbarWidth: "none",
        }}
      >
        {/* card guia início */}
        <div
          key="guide-start"
          ref={(el) => { cardRefs.current[0] = el; }}
          style={{ ...cardStyle(0), pointerEvents: "none" }}
        >
          <GuideCard text="← Deslize para explorar" />
        </div>

        {/* produtos */}
        {list.map((p, idx) => {
          const renderedIdx = idx + 1;
          const isHero = renderedIdx === heroIndex;
          return (
            <div
              key={p.id}
              ref={(el) => { cardRefs.current[renderedIdx] = el; }}
              style={cardStyle(renderedIdx)}
            >
              <MediaCard product={p} hero={isHero} onOpen={() => onOpen(p, idx)} />
            </div>
          );
        })}

        {/* card guia fim */}
        <div
          key="guide-end"
          ref={(el) => { cardRefs.current[list.length + 1] = el; }}
          style={{ ...cardStyle(list.length + 1), pointerEvents: "none" }}
        >
          <GuideCard text="Deslize para voltar →" />
        </div>
      </div>
    </div>
  );
}

function GuideCard({ text }: { text: string }) {
  return (
    <div
      style={{
        width: "100%",
        aspectRatio: "9 / 16",
        borderRadius: 22,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        color: "#fff",
        fontWeight: 800,
        fontSize: 13,
        opacity: 0.7,
        padding: "0 16px",
      }}
    >
      {text}
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

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.08) 76%, rgba(0,0,0,0.00) 100%)",
        }}
      />

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
