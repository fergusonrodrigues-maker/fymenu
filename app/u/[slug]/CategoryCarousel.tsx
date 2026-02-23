"use client";

import React, { useEffect, useRef } from "react";

type Variation = {
  id: string;
  product_id: string;
  name: string;
  price: number;
  order_index?: number;
};

type Product = {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price_type: "fixed" | "variable";
  base_price: number;
  thumbnail_url: string;
  video_url: string;
  variations?: Variation[];
};

function moneyBR(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getMinVariationPrice(p: Product): number | null {
  const vars = (p.variations ?? []).filter((v) => Number.isFinite(v.price));
  if (!vars.length) return null;
  let min = vars[0].price;
  for (const v of vars) if (v.price < min) min = v.price;
  return min;
}

/**
 * Categorias compactas:
 * - HERO central inicial (scrollLeft calculado)
 * - gap menor
 * - badge pill overlay (fora daqui; no MenuClient)
 * - scrollbar invisível (via class)
 * - sem travadinha: snap proximity + desliga durante drag
 * - iOS: touchAction pan-y pinch-zoom (vertical libera na hora)
 */
export default function CategoryCarousel({
  items,
  onOpen,
  compact = true,
}: {
  items: Product[];
  onOpen: (p: Product, index: number) => void;
  compact?: boolean;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const rafRef = useRef<number>(0);
  const settleTimer = useRef<any>(null);

  const cardW = compact ? 190 : 250; // wrapper apenas
  const gap = compact ? 10 : 14;

  function setSnapEnabled(enabled: boolean) {
    const el = scrollerRef.current;
    if (!el) return;
    el.style.scrollSnapType = enabled ? "x proximity" : "none";
  }

  function scheduleUpdate() {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      applyCenterEmphasis();
    });
  }

  function applyCenterEmphasis() {
    const el = scrollerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const cards = Array.from(el.querySelectorAll<HTMLElement>("[data-card='1']"));

    for (const c of cards) {
      const r = c.getBoundingClientRect();
      const cardCenter = r.left + r.width / 2;
      const dist = Math.abs(centerX - cardCenter);
      const max = rect.width * 0.60;
      const t = Math.max(0, 1 - dist / max);

      const base = compact ? 0.86 : 0.92;
      const grow = compact ? 0.10 : 0.12;
      const scale = base + t * grow;

      const alpha = (compact ? 0.52 : 0.60) + t * (compact ? 0.48 : 0.40);

      c.style.transform = `translateZ(0) scale(${scale})`;
      c.style.opacity = String(alpha);
    }
  }

  function centerFirstCard() {
    const el = scrollerRef.current;
    if (!el) return;
    const first = el.querySelector<HTMLElement>("[data-card='1']");
    if (!first) return;

    const target =
      first.offsetLeft - el.clientWidth / 2 + (first.clientWidth || cardW) / 2;

    el.scrollLeft = Math.max(0, target);
    applyCenterEmphasis();
  }

  function settleNearest() {
    const el = scrollerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const cards = Array.from(el.querySelectorAll<HTMLElement>("[data-card='1']"));

    let best: { x: number; dist: number } | null = null;

    for (const c of cards) {
      const r = c.getBoundingClientRect();
      const cardCenter = r.left + r.width / 2;
      const dist = Math.abs(centerX - cardCenter);
      if (!best || dist < best.dist) {
        best = { x: el.scrollLeft + (cardCenter - centerX), dist };
      }
    }

    if (best) el.scrollTo({ left: best.x, behavior: "smooth" });
  }

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    requestAnimationFrame(centerFirstCard);

    const onScroll = () => {
      scheduleUpdate();

      if (settleTimer.current) clearTimeout(settleTimer.current);
      settleTimer.current = setTimeout(() => {
        if (!draggingRef.current) settleNearest();
      }, 90);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", scheduleUpdate);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (settleTimer.current) clearTimeout(settleTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  function dragStart() {
    draggingRef.current = true;
    setSnapEnabled(false);
  }
  function dragEnd() {
    draggingRef.current = false;
    setTimeout(() => setSnapEnabled(true), 0);
    setTimeout(settleNearest, 0);
  }

  if (!items.length) return null;

  return (
    <div
      ref={scrollerRef}
      className="fy-scroll-x"
      style={{
        display: "flex",
        alignItems: "center",
        gap,
        overflowX: "auto",
        paddingTop: 14,
        paddingBottom: 12,
        paddingLeft: compact ? 18 : 26,
        paddingRight: compact ? 18 : 26,
        WebkitOverflowScrolling: "touch",
        overscrollBehaviorX: "contain",

        // CRÍTICO iOS: NÃO prender eixo horizontal (vertical sempre libera)
        touchAction: "pan-y pinch-zoom",

        scrollSnapType: "x proximity",
      }}
      onPointerDownCapture={dragStart}
      onPointerUpCapture={dragEnd}
      onPointerCancel={dragEnd}
      onTouchStartCapture={dragStart}
      onTouchEndCapture={dragEnd}
    >
      {items.map((p, idx) => {
        const minVar = p.price_type === "variable" ? getMinVariationPrice(p) : null;
        const priceLabel =
          p.price_type === "fixed"
            ? moneyBR(p.base_price)
            : minVar !== null
              ? `A partir de ${moneyBR(minVar)}`
              : "Preço variável";

        return (
          <button
            key={p.id}
            data-card="1"
            onClick={() => onOpen(p, idx)}
            className="fy-no-highlight"
            style={{
              minWidth: cardW,
              maxWidth: cardW,
              borderRadius: 22,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              overflow: "hidden",
              padding: 0,
              textAlign: "center",
              color: "#fff",
              cursor: "pointer",
              transition: "transform 140ms ease, opacity 140ms ease",
              scrollSnapAlign: "center",
              willChange: "transform, opacity",
              transform: "translateZ(0)",
              outline: "none",
            }}
          >
            {/* ✅ NÃO mexer no design interno do card */}
            <div
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "9 / 16",
                background: "rgba(255,255,255,0.06)",
              }}
            >
              {p.thumbnail_url ? (
                <img
                  src={p.thumbnail_url}
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
                    opacity: 0.55,
                    fontSize: 12,
                  }}
                >
                  sem foto
                </div>
              )}

              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(rgba(0,0,0,0.00) 35%, rgba(0,0,0,0.70) 78%, rgba(0,0,0,0.88) 100%)",
                }}
              />

              <div style={{ position: "absolute", left: 14, right: 14, bottom: 14 }}>
                <div
                  style={{
                    fontWeight: 950,
                    fontSize: 16,
                    lineHeight: 1.05,
                    textShadow: "0 1px 8px rgba(0,0,0,0.6)",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {p.name}
                </div>

                {!!p.description && (
                  <div
                    style={{
                      marginTop: 6,
                      opacity: 0.85,
                      fontSize: 12,
                      lineHeight: 1.2,
                      textShadow: "0 1px 8px rgba(0,0,0,0.6)",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {p.description}
                  </div>
                )}

                <div style={{ marginTop: 8, fontWeight: 950, fontSize: 16 }}>{priceLabel}</div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}