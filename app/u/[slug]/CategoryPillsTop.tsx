// FILE: /app/u/[slug]/CategoryPillsTop.tsx
"use client";

import React, { useEffect, useRef, useMemo } from "react";
import type { CategoryWithProducts } from "./menuTypes";

export default function CategoryPillsTop({
  categories,
  activeCategoryId,
  onSelect,
}: {
  categories: CategoryWithProducts[];
  activeCategoryId: string | null;
  onSelect: (id: string) => void;
}) {
  const scrollerRef   = useRef<HTMLDivElement | null>(null);
  const highlightRef  = useRef<HTMLDivElement | null>(null);
  const heroTextRef   = useRef<HTMLSpanElement | null>(null);
  const pillRefs      = useRef<(HTMLButtonElement | null)[]>([]);
  const prevIdxRef    = useRef<number>(-1);

  const pills = useMemo(() => categories ?? [], [categories]);

  useEffect(() => {
    const scroller  = scrollerRef.current;
    const highlight = highlightRef.current;
    const heroText  = heroTextRef.current;
    if (!scroller || !highlight || !heroText || !activeCategoryId) return;

    const activeIdx = pills.findIndex((c) => c.id === activeCategoryId);
    const activeBtn = pillRefs.current[activeIdx];
    if (!activeBtn) return;

    const prevIdx    = prevIdxRef.current;
    const goingRight = prevIdx >= 0 && activeIdx > prevIdx;
    const newName    = pills[activeIdx]?.name ?? "";

    if (prevIdx >= 0 && prevIdx !== activeIdx) {
      // ─── PILL CARD ANIMATION ────────────────────────────────────────
      const pillW  = heroText.offsetWidth + 10;
      const exitTo = pillW * (goingRight ? -1 : 1);
      const enter  = pillW * (goingRight ?  1 : -1);

      // 1. sai na direção do movimento
      heroText.style.transition = "transform 0.18s cubic-bezier(0.4,0,1,1)";
      heroText.style.transform  = `translateX(${exitTo}px) scale(0.75)`;

      // troca o texto no meio da saída
      setTimeout(() => {
        if (heroText) heroText.textContent = newName;
      }, 140);

      setTimeout(() => {
        if (!heroText) return;
        // 2. reposiciona do outro lado sem transição
        heroText.style.transition = "none";
        heroText.style.transform  = `translateX(${enter}px) scale(0.78)`;

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (!heroText) return;
            // 3. desliza ao centro crescendo
            heroText.style.transition = "transform 0.32s cubic-bezier(0.2,0,0.2,1)";
            heroText.style.transform  = "translateX(0) scale(1)";
          });
        });
      }, 160);
      // ────────────────────────────────────────────────────────────────
    } else {
      // primeira renderização ou mesmo índice: sem animação
      heroText.textContent = newName;
      heroText.style.transition = "none";
      heroText.style.transform  = "translateX(0) scale(1)";
    }

    prevIdxRef.current = activeIdx;

    // move highlight para cima do pill ativo
    highlight.style.left  = `${activeBtn.offsetLeft}px`;
    highlight.style.width = `${activeBtn.offsetWidth}px`;

    // centraliza pill ativo no scroll horizontal
    const sr = scroller.getBoundingClientRect();
    const br = activeBtn.getBoundingClientRect();
    scroller.scrollBy({ left: br.left + br.width / 2 - (sr.left + sr.width / 2), behavior: "smooth" });
  }, [activeCategoryId, pills]);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        zIndex: 50,
        background: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)",
        pointerEvents: "none",
      }}
    >
      <div style={{ padding: "10px 14px 24px" }}>
        <div
          ref={scrollerRef}
          style={{
            position: "relative",
            display: "flex",
            gap: 8,
            overflowX: "auto",
            paddingBottom: 6,
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            pointerEvents: "auto",
          }}
        >
          {/* highlight deslizante — contém o heroText que anima */}
          <div
            ref={highlightRef}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              height: "calc(100% - 6px)", // desconsidera o paddingBottom do scroller
              borderRadius: 999,
              background: "rgba(255,255,255,0.92)",
              transition: "left 0.28s cubic-bezier(0.34,1.56,0.64,1), width 0.28s cubic-bezier(0.34,1.56,0.64,1)",
              pointerEvents: "none",
              zIndex: 0,
              overflow: "hidden",           // clipa o slide da animação
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              ref={heroTextRef}
              style={{
                fontWeight: 950,
                fontSize: 15,
                color: "#111",
                whiteSpace: "nowrap",
                display: "block",
                willChange: "transform",
              }}
            />
          </div>

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
                  // ativo: texto transparente (o heroText cobre)
                  color: active ? "transparent" : "rgba(255,255,255,0.92)",
                  padding: "11.5px 16px",
                  fontWeight: 950,
                  fontSize: 15,
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
