"use client";

import React, { useEffect, useMemo, useRef } from "react";

type Category = {
  id: string;
  name: string;
  type?: string;
  slug?: string;
};

export default function CategoryPillsTop({
  categories,
  activeCategoryId,
  onSelectCategory,
}: {
  categories: Category[];
  activeCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const draggingRef = useRef(false);
  const settleTimer = useRef<any>(null);

  const ordered = useMemo(() => categories, [categories]);

  useEffect(() => {
    if (draggingRef.current) return;
    const btn = btnRefs.current[activeCategoryId];
    if (!btn) return;
    btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeCategoryId]);

  function settleToCenter() {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const rect = wrap.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;

    let bestId = "";
    let bestDist = Infinity;

    for (const c of ordered) {
      const btn = btnRefs.current[c.id];
      if (!btn) continue;
      const r = btn.getBoundingClientRect();
      const mid = r.left + r.width / 2;
      const dist = Math.abs(centerX - mid);

      if (dist < bestDist) {
        bestDist = dist;
        bestId = c.id;
      }
    }

    if (bestId) onSelectCategory(bestId);
  }

  function onDragStart() {
    draggingRef.current = true;
    if (settleTimer.current) clearTimeout(settleTimer.current);
  }

  function onDragEnd() {
    draggingRef.current = false;
    settleTimer.current = setTimeout(settleToCenter, 90);
  }

  return (
    <div
      ref={wrapRef}
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

        touchAction: "pan-x",
        overscrollBehaviorX: "contain",
      }}
      onPointerDownCapture={onDragStart}
      onPointerUpCapture={onDragEnd}
      onPointerCancel={onDragEnd}
      onTouchStartCapture={onDragStart}
      onTouchEndCapture={onDragEnd}
      onTouchCancel={onDragEnd}
    >
      {ordered.map((c) => {
        const active = c.id === activeCategoryId;

        return (
          <button
            key={c.id}
            ref={(el) => {
              btnRefs.current[c.id] = el;
            }}
            onClick={() => onSelectCategory(c.id)}
            style={{
              border: `1px solid ${
                active ? "rgba(255,255,255,0.26)" : "rgba(255,255,255,0.10)"
              }`,
              background: active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
              color: "#fff",
              padding: active ? "11px 18px" : "9px 14px",
              borderRadius: 999,
              fontWeight: 900,
              fontSize: active ? 14 : 13,
              whiteSpace: "nowrap",
              opacity: active ? 1 : 0.72,
              transform: active ? "scale(1.06)" : "scale(0.98)",
              transition: "transform 160ms ease, opacity 160ms ease, background 160ms ease",
              outline: "none",
              cursor: "pointer",
              backdropFilter: "blur(14px)",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {c.name}
          </button>
        );
      })}
    </div>
  );
}