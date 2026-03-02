// FILE: /app/u/[slug]/CategoryPillsTop.tsx
// ACTION: REPLACE ENTIRE FILE

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
  const activeButtonRef = useRef<HTMLButtonElement | null>(null);

  const pills = useMemo(() => categories ?? [], [categories]);

  // Atualiza clip-path e centraliza pill ativa
  useEffect(() => {
    const scroller = scrollerRef.current;
    const highlight = highlightRef.current;
    const activeBtn = activeButtonRef.current;
    if (!scroller || !highlight || !activeBtn) return;

    // centraliza pill ativa no scroll
    const sr = scroller.getBoundingClientRect();
    const br = activeBtn.getBoundingClientRect();
    const elCenter = br.left + br.width / 2;
    const scCenter = sr.left + sr.width / 2;
    scroller.scrollBy({ left: elCenter - scCenter, behavior: "smooth" });

    // clip-path: relativo ao container highlight (mesma largura do scroller)
    const containerLeft = sr.left - scroller.scrollLeft;
    const offsetLeft = br.left - containerLeft;
    const clipLeft = offsetLeft;
    const clipRight = offsetLeft + br.width;
    const totalWidth = highlight.scrollWidth;

    const leftPct = ((clipLeft) / totalWidth * 100).toFixed(1);
    const rightPct = (100 - (clipRight / totalWidth * 100)).toFixed(1);

    highlight.style.clipPath = `inset(0 ${rightPct}% 0 ${leftPct}% round 999px)`;
  }, [activeCategoryId]);

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
        <div style={{ fontWeight: 950, color: "#fff", fontSize: 16, lineHeight: 1.1 }}>
          {unit.name}
        </div>
        <div style={{ marginTop: 4, fontSize: 12, opacity: 0.65, color: "#fff" }}>
          {(unit.city || "") + (unit.neighborhood ? ` • ${unit.neighborhood}` : "")}
        </div>

        {/* Container relativo para o clip-path */}
        <div style={{ marginTop: 10, position: "relative" }}>

          {/* Camada highlight (clip-path deslizante) */}
          <div
            ref={highlightRef}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 10,
              pointerEvents: "none",
              display: "flex",
              gap: 8,
              overflowX: "visible",
              clipPath: "inset(0 100% 0 0% round 999px)",
              transition: "clip-path 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)",
              background: "rgba(255,255,255,0.92)",
              borderRadius: 999,
            }}
          >
            {/* Pills fantasma — só pra ocupar espaço e alinhar com a base */}
            {pills.map((c) => (
              <div
                key={c.id}
                style={{
                  flex: "0 0 auto",
                  borderRadius: 999,
                  padding: "10px 14px",
                  fontWeight: 950,
                  fontSize: 13,
                  whiteSpace: "nowrap",
                  color: "#111",
                  visibility: "hidden",
                }}
              >
                {c.name}
              </div>
            ))}
          </div>

          {/* Camada base (scrollável, interativa) */}
          <div
            ref={scrollerRef}
            style={{
              display: "flex",
              gap: 8,
              overflowX: "auto",
              paddingBottom: 6,
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
            }}
          >
            {pills.map((c) => {
              const active = c.id === activeCategoryId;
              return (
                <button
                  key={c.id}
                  ref={active ? activeButtonRef : null}
                  data-id={c.id}
                  onClick={() => onSelect(c.id)}
                  style={{
                    flex: "0 0 auto",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.16)",
                    background: "rgba(255,255,255,0.08)",
                    color: active ? "transparent" : "rgba(255,255,255,0.92)",
                    padding: "10px 14px",
                    fontWeight: 950,
                    fontSize: 13,
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                    transition: "color 0.28s ease",
                  }}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
