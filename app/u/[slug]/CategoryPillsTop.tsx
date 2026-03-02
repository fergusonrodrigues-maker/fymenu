// FILE: /app/u/[slug]/CategoryPillsTop.tsx
"use client";

import React, { useEffect, useRef, useMemo } from "react";
import type { CategoryWithProducts, Unit } from "./menuTypes";

export default function CategoryPillsTop({
  unit,
  categories,
  activeCategoryId,
  onSelect,
}: {
  unit: Unit;
  categories: CategoryWithProducts[];
  activeCategoryId: string | null;
  onSelect: (id: string) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const highlightRef = useRef<HTMLDivElement | null>(null);
  const pillRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const pills = useMemo(() => categories ?? [], [categories]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const highlight = highlightRef.current;
    if (!scroller || !highlight || !activeCategoryId) return;

    const activeIdx = pills.findIndex((c) => c.id === activeCategoryId);
    const activeBtn = pillRefs.current[activeIdx];
    if (!activeBtn) return;

    // move highlight para cima do pill ativo
    highlight.style.left = `${activeBtn.offsetLeft}px`;
    highlight.style.width = `${activeBtn.offsetWidth}px`;

    // centraliza pill ativo no scroll horizontal
    const sr = scroller.getBoundingClientRect();
    const br = activeBtn.getBoundingClientRect();
    const elCenter = br.left + br.width / 2;
    const scCenter = sr.left + sr.width / 2;
    scroller.scrollBy({ left: elCenter - scCenter, behavior: "smooth" });
  }, [activeCategoryId, pills]);

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div style={{ padding: "12px 14px 10px" }}>
        <div style={{ fontWeight: 950, color: "#fff", fontSize: 16 }}>{unit.name}</div>
        <div style={{ marginTop: 4, fontSize: 12, opacity: 0.65, color: "#fff" }}>
          {(unit.city || "") + (unit.neighborhood ? ` • ${unit.neighborhood}` : "")}
        </div>

        {/* scroller com position relative para o highlight absoluto */}
        <div
          ref={scrollerRef}
          style={{
            marginTop: 10,
            position: "relative",
            display: "flex",
            gap: 8,
            overflowX: "auto",
            paddingBottom: 6,
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
          }}
        >
          {/* highlight deslizante */}
          <div
            ref={highlightRef}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              height: "100%",
              borderRadius: 999,
              background: "rgba(255,255,255,0.92)",
              transition: "left 0.28s cubic-bezier(0.34,1.56,0.64,1), width 0.28s cubic-bezier(0.34,1.56,0.64,1)",
              pointerEvents: "none",
              zIndex: 0,
            }}
          />

          {pills.map((c, i) => {
            const active = c.id === activeCategoryId;
            return (
              <button
                key={c.id}
                ref={(el) => { pillRefs.current[i] = el; }}
                onClick={() => onSelect(c.id)}
                style={{
                  position: "relative",
                  zIndex: 1,
                  flex: "0 0 auto",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.16)",
                  background: "transparent",
                  color: active ? "#111" : "rgba(255,255,255,0.92)",
                  padding: "10px 14px",
                  fontWeight: 950,
                  fontSize: 13,
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  transition: "color 0.25s ease",
                }}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
