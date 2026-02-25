"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Product } from "./menuTypes";

type Props = {
  items: Product[];
  compact: boolean;
  onOpen: (p: Product, originalIndex: number) => void;
  variant?: "featured" | "normal";
  initialHeroIndex?: number; // padrão 1 (card 2)
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

/**
 * Compat: seu schema pode não ter `thumbnail_url`.
 * Então buscamos a melhor imagem disponível sem quebrar TS.
 */
function getThumb(p: Product): string | null {
  const anyP = p as any;
  return (
    anyP?.thumbnail_url ||
    anyP?.thumb_url ||
    anyP?.image_url ||
    anyP?.photo_url ||
    anyP?.image ||
    anyP?.photo ||
    null
  );
}

function getVideo(p: Product): string | null {
  const anyP = p as any;
  return anyP?.video_url || anyP?.video || anyP?.media_video_url || null;
}

export default function CategoryCarousel({
  items,
  compact,
  onOpen,
  variant = "normal",
  initialHeroIndex = 1,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const [heroIndex, setHeroIndex] = useState(0);
  const heroIndexRef = useRef(0);

  const snapTimer = useRef<number | null>(null);

  // tap vs drag (para não travar scroll horizontal)
  const gestureRef = useRef<{
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);

  const DRAG_THRESHOLD = 10; // px

  // dimensões (sempre 9:16) — destaque 30% maior
  const size = useMemo(() => {
    const baseW = compact ? 168 : 192;
    const mult = variant === "featured" ? 1.3 : 1;
    const w = Math.round(baseW * mult);
    const h = Math.round((w * 16) / 9);
    return { w, h };
  }, [compact, variant]);

  // hero sempre 9:16, só “zoom”
  const scaleMax = variant === "featured" ? 1.12 : 1.10;
  const scaleMin = 0.90;

  function getCenterIndex() {
    const wrap = wrapRef.current;
    if (!wrap) return 0;

    const rect = wrap.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;

    let best = 0;
    let bestDist = Infinity;

    for (let i = 0; i < items.length; i++) {
      const el = cardRefs.current[i];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const icx = r.left + r.width / 2;
      const d = Math.abs(icx - cx);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    return best;
  }

  function applyTransforms() {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const rect = wrap.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const maxDist = rect.width / 2;

    for (let i = 0; i < items.length; i++) {
      const el = cardRefs.current[i];
      if (!el) continue;

      const r = el.getBoundingClientRect();
      const icx = r.left + r.width / 2;
      const dist = Math.abs(icx - cx);

      const p = 1 - clamp(dist / maxDist, 0, 1); // 1 no centro
      const s = scaleMin + (scaleMax - scaleMin) * (p * p);

      el.style.transform = `scale(${s.toFixed(3)})`;

      // morph thumb <-> video (sutil)
      const img = el.querySelector<HTMLImageElement>("[data-media='img']");
      const vid = el.querySelector<HTMLVideoElement>("[data-media='video']");
      if (img) img.style.opacity = `${clamp(1 - p * 0.85, 0.12, 1)}`;
      if (vid) vid.style.opacity = `${clamp(p, 0, 1)}`;
    }

    const idx = getCenterIndex();
    if (idx !== heroIndexRef.current) {
      heroIndexRef.current = idx;
      setHeroIndex(idx);
    }
  }

  function scrollToIndex(idx: number, behavior: ScrollBehavior = "auto") {
    const el = cardRefs.current[idx];
    if (!el) return;
    el.scrollIntoView({ behavior, inline: "center", block: "nearest" });
  }

  // iniciar no card 2 como HERO (se existir)
  useEffect(() => {
    if (!items.length) return;

    const desired =
      items.length >= 2 ? clamp(initialHeroIndex, 0, items.length - 1) : 0;

    requestAnimationFrame(() => {
      scrollToIndex(desired, "auto");
      requestAnimationFrame(() => applyTransforms());
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  // scroll -> transform + snap firme
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        applyTransforms();

        if (snapTimer.current) window.clearTimeout(snapTimer.current);
        snapTimer.current = window.setTimeout(() => {
          const idx = getCenterIndex();
          scrollToIndex(idx, "smooth");
        }, 120);
      });
    };

    const wrap = wrapRef.current;
    if (!wrap) return;

    wrap.addEventListener("scroll", onScroll, { passive: true });
    requestAnimationFrame(() => applyTransforms());

    return () => {
      wrap.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
      if (snapTimer.current) window.clearTimeout(snapTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  // autoplay só no HERO
  useEffect(() => {
    for (let i = 0; i < items.length; i++) {
      const v = videoRefs.current[i];
      if (!v) continue;

      v.muted = true;
      v.playsInline = true;
      v.controls = false;

      const hasVideo = !!getVideo(items[i]);

      if (i === heroIndex && hasVideo) {
        try {
          v.currentTime = 0;
        } catch {}
        const p = v.play();
        if (p && typeof (p as any).catch === "function") (p as any).catch(() => {});
      } else {
        try {
          v.pause();
          v.currentTime = 0;
        } catch {}
      }
    }
  }, [heroIndex, items]);

  // handlers: detecta drag (não abre) vs tap (abre)
  function onPointerDown(e: React.PointerEvent) {
    gestureRef.current = { startX: e.clientX, startY: e.clientY, moved: false };
  }

  function onPointerMove(e: React.PointerEvent) {
    const g = gestureRef.current;
    if (!g) return;
    const dx = Math.abs(e.clientX - g.startX);
    const dy = Math.abs(e.clientY - g.startY);
    if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) g.moved = true;
  }

  function onPointerUp(idx: number) {
    const g = gestureRef.current;
    gestureRef.current = null;
    if (!g) return;

    // se arrastou, não abre
    if (g.moved) return;

    // tap real
    const p = items[idx];
    if (p) onOpen(p, idx);
  }

  const css = `
  .fy-x{
    display:flex;
    gap:14px;
    overflow-x: scroll;
    overflow-y: visible;
    padding: 8px 14px 18px 14px;
    scroll-snap-type: x mandatory;
    scroll-padding-left: 50%;
    scroll-padding-right: 50%;
    -webkit-overflow-scrolling: touch;
    scrollbar-width:none;
    touch-action: pan-x pan-y;
  }
  .fy-x::-webkit-scrollbar{ width:0; height:0; display:none; }

  .fy-cardWrap{
    scroll-snap-align:center;
    flex: 0 0 auto;
    transform-origin:center center;
    transition: transform 120ms linear;
    user-select: none;
    -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  .fy-card{
    width:${size.w}px;
    aspect-ratio: 9 / 16;
    border-radius:28px;
    overflow:hidden;
    position:relative;
    background:#111;
    box-shadow: 0 18px 60px rgba(0,0,0,0.55);
    border: 1px solid rgba(255,255,255,0.12);
    cursor: pointer;
    touch-action: pan-x pan-y;
  }

  .fy-media{
    position:absolute;
    inset:0;
    width:100%;
    height:100%;
    object-fit:cover;
    transition: opacity 140ms linear;
    will-change: opacity;
    pointer-events: none;
  }

  .fy-grad{
    position:absolute;
    inset:0;
    background: linear-gradient(rgba(0,0,0,0.05) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.75) 78%, rgba(0,0,0,0.92) 100%);
    pointer-events: none;
  }

  .fy-txt{
    position:absolute;
    left:16px;
    right:16px;
    bottom:14px;
    color:#fff;
    text-shadow: 0 8px 18px rgba(0,0,0,0.6);
    pointer-events: none;
  }

  .fy-name{
    font-weight: 950;
    font-size: 18px;
    line-height: 1.1;
    letter-spacing: -0.2px;
    overflow:hidden;
    display:-webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .fy-price{
    margin-top: 10px;
    font-weight: 950;
    font-size: 22px;
    letter-spacing: -0.3px;
  }
  `;

  return (
    <div style={{ position: "relative", overflow: "visible" }}>
      <style>{css}</style>

      <div ref={wrapRef} className="fy-x">
        {items.map((p, idx) => {
          const thumb = getThumb(p);
          const videoUrl = getVideo(p);
          const hasVideo = !!videoUrl;

          return (
            <div
              key={(p as any).id ?? idx}
              ref={(el) => {
                cardRefs.current[idx] = el;
              }}
              className="fy-cardWrap"
              onPointerMove={onPointerMove}
            >
              <div
                className="fy-card"
                role="button"
                aria-label={`Abrir ${(p as any).name ?? "produto"}`}
                onPointerDown={onPointerDown}
                onPointerUp={() => onPointerUp(idx)}
              >
                {hasVideo ? (
                  <video
                    ref={(el) => {
                      videoRefs.current[idx] = el;
                    }}
                    data-media="video"
                    className="fy-media"
                    src={videoUrl ?? undefined}
                    muted
                    playsInline
                    preload="metadata"
                    loop
                    autoPlay={false}
                    style={{ opacity: 0 }}
                    poster={thumb ?? undefined}
                  />
                ) : null}

                {thumb ? (
                  <img
                    data-media="img"
                    className="fy-media"
                    src={thumb}
                    alt={(p as any).name ?? "produto"}
                    style={{ opacity: 1 }}
                  />
                ) : (
                  <div
                    data-media="img"
                    className="fy-media"
                    style={{
                      display: "grid",
                      placeItems: "center",
                      background: "#0b0b0b",
                      opacity: 1,
                    }}
                  >
                    <span style={{ color: "rgba(255,255,255,0.65)", fontWeight: 900 }}>
                      Sem mídia
                    </span>
                  </div>
                )}

                <div className="fy-grad" />

                <div className="fy-txt">
                  <div className="fy-name">{(p as any).name ?? "Produto"}</div>

                  <div className="fy-price">
                    {(p as any).price_type === "fixed"
                      ? `R$ ${Number((p as any).base_price ?? 0).toFixed(2).replace(".", ",")}`
                      : "Preço variável"}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}