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
  const heroTextRef = useRef<HTMLSpanElement | null>(null);
  const prevIdxRef  = useRef<number>(-1);

  const l2Ref = useRef<HTMLButtonElement | null>(null);
  const l1Ref = useRef<HTMLButtonElement | null>(null);
  const r1Ref = useRef<HTMLButtonElement | null>(null);
  const r2Ref = useRef<HTMLButtonElement | null>(null);

  const pills = useMemo(() => categories ?? [], [categories]);

  // largura fixa baseada no nome mais longo
  const heroWidth = useMemo(() => {
    if (typeof document === "undefined") return 140;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return 140;
    ctx.font = "950 15px -apple-system, sans-serif";
    const max = Math.max(...pills.map(c => ctx.measureText(c.name).width));
    return Math.ceil(max) + 40;
  }, [pills]);

  const sideWidth = Math.round(heroWidth * 0.80);

  useEffect(() => {
    const heroText = heroTextRef.current;
    if (!heroText || !activeCategoryId) return;

    const activeIdx = pills.findIndex((c) => c.id === activeCategoryId);
    if (activeIdx < 0) return;

    const prevIdx    = prevIdxRef.current;
    const goingRight = prevIdx >= 0 && activeIdx > prevIdx;
    const newName    = pills[activeIdx]?.name ?? "";

    // atualiza pills laterais
    const setSide = (ref: React.RefObject<HTMLButtonElement | null>, offset: number) => {
      const el = ref.current;
      if (!el) return;
      const idx = activeIdx + offset;
      if (idx >= 0 && idx < pills.length) {
        el.textContent    = pills[idx].name;
        el.style.opacity  = Math.abs(offset) === 1 ? "0.72" : "0.35";
        el.style.visibility = "visible";
      } else {
        el.style.visibility = "hidden";
      }
    };
    setSide(l2Ref, -2);
    setSide(l1Ref, -1);
    setSide(r1Ref, +1);
    setSide(r2Ref, +2);

    if (prevIdx >= 0 && prevIdx !== activeIdx) {
      // zoom out → reposiciona do lado oposto → zoom in
      const pillW  = heroWidth + 10;
      const exitTo = pillW * (goingRight ? -1 : 1);
      const enter  = pillW * (goingRight ?  1 : -1);

      heroText.style.transition = "transform 0.18s cubic-bezier(0.4,0,1,1), opacity 0.18s ease";
      heroText.style.transform  = `translateX(${exitTo}px) scale(0.72)`;
      heroText.style.opacity    = "0";

      setTimeout(() => {
        if (!heroText) return;
        heroText.textContent      = newName;
        heroText.style.transition = "none";
        heroText.style.transform  = `translateX(${enter}px) scale(0.72)`;
        heroText.style.opacity    = "0";

        requestAnimationFrame(() => requestAnimationFrame(() => {
          if (!heroText) return;
          heroText.style.transition = "transform 0.32s cubic-bezier(0.2,0,0.2,1), opacity 0.22s ease";
          heroText.style.transform  = "translateX(0) scale(1)";
          heroText.style.opacity    = "1";
        }));
      }, 160);
    } else {
      heroText.textContent      = newName;
      heroText.style.transition = "none";
      heroText.style.transform  = "translateX(0) scale(1)";
      heroText.style.opacity    = "1";
    }

    prevIdxRef.current = activeIdx;
  }, [activeCategoryId, pills, heroWidth]);

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100%",
      zIndex: 50,
      background: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)",
      pointerEvents: "none",
      padding: "10px 0 28px",
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        pointerEvents: "auto",
      }}>

        {/* L2 */}
        <button ref={l2Ref} onClick={() => {
          const idx = pills.findIndex(c => c.id === activeCategoryId);
          if (idx - 2 >= 0) onSelect(pills[idx - 2].id);
        }} style={{
          width: sideWidth, height: 40, borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "transparent",
          color: "rgba(255,255,255,0.85)",
          fontWeight: 800, fontSize: 12,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          cursor: "pointer", opacity: 0.35,
          transition: "opacity 0.25s ease",
          padding: "0 10px",
        }} />

        {/* L1 */}
        <button ref={l1Ref} onClick={() => {
          const idx = pills.findIndex(c => c.id === activeCategoryId);
          if (idx - 1 >= 0) onSelect(pills[idx - 1].id);
        }} style={{
          width: sideWidth, height: 44, borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.16)",
          background: "transparent",
          color: "rgba(255,255,255,0.85)",
          fontWeight: 800, fontSize: 13,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          cursor: "pointer", opacity: 0.72,
          transition: "opacity 0.25s ease",
          padding: "0 10px",
        }} />

        {/* HERO */}
        <div style={{
          width: heroWidth, height: 52, borderRadius: 999,
          background: "rgba(255,255,255,0.92)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden",
          flexShrink: 0,
          pointerEvents: "none",
        }}>
          <span ref={heroTextRef} style={{
            fontWeight: 950, fontSize: 15, color: "#111",
            whiteSpace: "nowrap", display: "block",
            willChange: "transform, opacity",
          }} />
        </div>

        {/* R1 */}
        <button ref={r1Ref} onClick={() => {
          const idx = pills.findIndex(c => c.id === activeCategoryId);
          if (idx + 1 < pills.length) onSelect(pills[idx + 1].id);
        }} style={{
          width: sideWidth, height: 44, borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.16)",
          background: "transparent",
          color: "rgba(255,255,255,0.85)",
          fontWeight: 800, fontSize: 13,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          cursor: "pointer", opacity: 0.72,
          transition: "opacity 0.25s ease",
          padding: "0 10px",
        }} />

        {/* R2 */}
        <button ref={r2Ref} onClick={() => {
          const idx = pills.findIndex(c => c.id === activeCategoryId);
          if (idx + 2 < pills.length) onSelect(pills[idx + 2].id);
        }} style={{
          width: sideWidth, height: 40, borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "transparent",
          color: "rgba(255,255,255,0.85)",
          fontWeight: 800, fontSize: 12,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          cursor: "pointer", opacity: 0.35,
          transition: "opacity 0.25s ease",
          padding: "0 10px",
        }} />

      </div>
    </div>
  );
}
