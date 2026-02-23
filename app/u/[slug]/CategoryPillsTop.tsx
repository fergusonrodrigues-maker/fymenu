"use client";

import React, { useEffect, useMemo, useRef } from "react";

type Category = {
  id: string;
  name: string;
};

export default function CategoryPillsTop({
  categories,
  activeCategoryId,
  onSelectCategory,
}: {
  categories: Category[];
  activeCategoryId: string;
  onSelectCategory: (id: string) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const didDragRef = useRef(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const isUserInteractingRef = useRef(false);
  const interactTimerRef = useRef<any>(null);

  const ordered = useMemo(() => categories ?? [], [categories]);

  function markInteracting() {
    isUserInteractingRef.current = true;
    if (interactTimerRef.current) clearTimeout(interactTimerRef.current);
    interactTimerRef.current = setTimeout(() => {
      isUserInteractingRef.current = false;
    }, 220);
  }

  useEffect(() => {
    if (!activeCategoryId) return;
    if (isUserInteractingRef.current) return;

    const scroller = scrollerRef.current;
    const btn = btnRefs.current[activeCategoryId];
    if (!scroller || !btn) return;

    const target = btn.offsetLeft - scroller.clientWidth / 2 + btn.clientWidth / 2;
    scroller.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [activeCategoryId]);

  return (
    <div
      ref={scrollerRef}
      className="fy-scroll-x"
      style={{
        display: "flex",
        gap: 10,
        overflowX: "auto",
        paddingBottom: 8,
        paddingTop: 2,
        paddingLeft: 18,
        paddingRight: 18,
        WebkitOverflowScrolling: "touch",
        scrollPaddingLeft: 60,
        scrollPaddingRight: 60,
        touchAction: "auto",
      }}
      onTouchStart={(e) => {
        markInteracting();

        const t = e.touches[0];
        if (!t) return;
        didDragRef.current = false;
        startRef.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchMove={(e) => {
        markInteracting();

        const t = e.touches[0];
        const s = startRef.current;
        if (!t || !s) return;

        const dx = Math.abs(t.clientX - s.x);
        const dy = Math.abs(t.clientY - s.y);

        if (dx > 8 || dy > 8) didDragRef.current = true;
      }}
      onTouchEnd={() => {
        markInteracting();
        startRef.current = null;
        setTimeout(() => (didDragRef.current = false), 0);
      }}
      onWheel={() => markInteracting()}
      onPointerDown={() => markInteracting()}
      onPointerMove={() => markInteracting()}
      onPointerUp={() => markInteracting()}
    >
      {ordered.map((c) => {
        const active = c.id === activeCategoryId;

        return (
          <button
            key={c.id}
            ref={(el) => {
              btnRefs.current[c.id] = el;
            }}
            onClick={() => {
              if (didDragRef.current) return;
              onSelectCategory(c.id);
            }}
            style={{
              border: `1px solid ${active ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.10)"}`,
              background: active ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.03)",
              color: "#fff",
              padding: active ? "10px 16px" : "9px 14px",
              borderRadius: 999,
              fontWeight: 900,
              fontSize: active ? 14 : 13,
              whiteSpace: "nowrap",
              opacity: active ? 1 : 0.72,
              transform: active ? "scale(1.06)" : "scale(0.98)",
              transition: "transform 160ms ease, opacity 160ms ease, background 160ms ease",
              cursor: "pointer",
            }}
          >
            {c.name}
          </button>
        );
      })}
    </div>
  );
}