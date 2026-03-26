// FILE: /app/u/[slug]/CategoryPillsTop.tsx
"use client";

import React, { useEffect, useRef, useMemo } from "react";
import type { Category } from "./menuTypes";

export default function CategoryPillsTop({
  categories,
  activeCategoryId,
  onSelect,
}: {
  categories: Category[];
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

  // hero pill cresce com o texto do nome mais longo
  const heroWidth = useMemo(() => {
    if (typeof document === "undefined") return 140;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return 140;
    ctx.font = "500 15px -apple-system, sans-serif";
    const activeIdx = pills.findIndex(c => c.id === activeCategoryId);
    const name = pills[activeIdx]?.name ?? "";
    return Math.ceil(ctx.measureText(name).width) + 48;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategoryId, pills]);

  const sideWidth = Math.round(heroWidth * 0.78);

  function animateSide(
    el: HTMLButtonElement,
    newText: string,
    visible: boolean,
    opacity: number,
    goingRight: boolean,
  ) {
    if (!visible) {
      el.style.transition = "opacity 0.2s ease, transform 0.2s ease";
      el.style.opacity = "0";
      el.style.transform = "scale(0.7)";
      setTimeout(() => {
        el.textContent = "";
        el.style.visibility = "hidden";
      }, 200);
      return;
    }

    const exitX = goingRight ? -30 : 30;
    el.style.transition = "opacity 0.15s ease, transform 0.15s ease";
    el.style.opacity = "0";
    el.style.transform = `translateX(${exitX}px) scale(0.75)`;

    setTimeout(() => {
      el.textContent = newText;
      el.style.visibility = "visible";
      const enterX = goingRight ? 30 : -30;
      el.style.transition = "none";
      el.style.transform = `translateX(${enterX}px) scale(0.75)`;
      el.style.opacity = "0";

      requestAnimationFrame(() => requestAnimationFrame(() => {
        el.style.transition = "opacity 0.25s ease, transform 0.28s cubic-bezier(0.34,1.56,0.64,1)";
        el.style.transform = "translateX(0) scale(1)";
        el.style.opacity = String(opacity);
      }));
    }, 150);
  }

  useEffect(() => {
    const heroText = heroTextRef.current;
    if (!heroText || !activeCategoryId) return;

    const activeIdx = pills.findIndex((c) => c.id === activeCategoryId);
    if (activeIdx < 0) return;

    const prevIdx    = prevIdxRef.current;
    const goingRight = prevIdx >= 0 && activeIdx > prevIdx;
    const newName    = pills[activeIdx]?.name ?? "";
    const isFirst    = prevIdx < 0 || prevIdx === activeIdx;

    const sides = [
      { ref: l2Ref, offset: -2, opacity: 0.3 },
      { ref: l1Ref, offset: -1, opacity: 0.6 },
      { ref: r1Ref, offset: +1, opacity: 0.6 },
      { ref: r2Ref, offset: +2, opacity: 0.3 },
    ];

    sides.forEach(({ ref, offset, opacity }) => {
      const el = ref.current;
      if (!el) return;
      const idx = activeIdx + offset;
      const visible = idx >= 0 && idx < pills.length;
      const text = visible ? pills[idx].name : "";

      if (isFirst) {
        el.textContent = text;
        el.style.opacity = visible ? String(opacity) : "0";
        el.style.visibility = visible ? "visible" : "hidden";
        el.style.transform = "translateX(0) scale(1)";
      } else {
        animateSide(el, text, visible, opacity, goingRight);
      }
    });

    if (!isFirst) {
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
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      zIndex: 50,
      background: "linear-gradient(to bottom, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 60%, rgba(255,255,255,0) 100%)",
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      borderBottom: "none",
      pointerEvents: "none",
      padding: "10px 0 18px",
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        pointerEvents: "auto",
        overflow: "hidden",
        padding: "0 12px",
      }}>

        {/* L2 */}
        <button ref={l2Ref} onClick={() => {
          const idx = pills.findIndex(c => c.id === activeCategoryId);
          if (idx - 2 >= 0) onSelect(pills[idx - 2].id);
        }} style={{
          width: sideWidth,
          height: 36,
          borderRadius: 999,
          border: "0.5px solid rgba(0,0,0,0.10)",
          background: "rgba(0,0,0,0.04)",
          color: "rgba(0,0,0,0.7)",
          fontWeight: 500,
          fontSize: 11,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          cursor: "pointer",
          padding: "0 10px",
          willChange: "transform, opacity",
          flexShrink: 0,
        }} />

        {/* L1 */}
        <button ref={l1Ref} onClick={() => {
          const idx = pills.findIndex(c => c.id === activeCategoryId);
          if (idx - 1 >= 0) onSelect(pills[idx - 1].id);
        }} style={{
          width: sideWidth,
          height: 38,
          borderRadius: 999,
          border: "0.5px solid rgba(0,0,0,0.12)",
          background: "rgba(0,0,0,0.05)",
          color: "rgba(0,0,0,0.7)",
          fontWeight: 500,
          fontSize: 12,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          cursor: "pointer",
          padding: "0 10px",
          willChange: "transform, opacity",
          flexShrink: 0,
        }} />

        {/* HERO — laranja, responsivo ao texto */}
        <div style={{
          width: heroWidth,
          height: 44,
          borderRadius: 999,
          background: "#FF6B00",
          boxShadow: "0 2px 16px rgba(255,107,0,0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          flexShrink: 0,
          pointerEvents: "none",
          transition: "width 0.3s cubic-bezier(0.34,1.56,0.64,1)",
        }}>
          <span ref={heroTextRef} style={{
            fontWeight: 500,
            fontSize: 15,
            color: "#fff",
            whiteSpace: "nowrap",
            display: "block",
            willChange: "transform, opacity",
          }} />
        </div>

        {/* R1 */}
        <button ref={r1Ref} onClick={() => {
          const idx = pills.findIndex(c => c.id === activeCategoryId);
          if (idx + 1 < pills.length) onSelect(pills[idx + 1].id);
        }} style={{
          width: sideWidth,
          height: 38,
          borderRadius: 999,
          border: "0.5px solid rgba(0,0,0,0.12)",
          background: "rgba(0,0,0,0.05)",
          color: "rgba(0,0,0,0.7)",
          fontWeight: 500,
          fontSize: 12,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          cursor: "pointer",
          padding: "0 10px",
          willChange: "transform, opacity",
          flexShrink: 0,
        }} />

        {/* R2 */}
        <button ref={r2Ref} onClick={() => {
          const idx = pills.findIndex(c => c.id === activeCategoryId);
          if (idx + 2 < pills.length) onSelect(pills[idx + 2].id);
        }} style={{
          width: sideWidth,
          height: 36,
          borderRadius: 999,
          border: "0.5px solid rgba(0,0,0,0.10)",
          background: "rgba(0,0,0,0.04)",
          color: "rgba(0,0,0,0.7)",
          fontWeight: 500,
          fontSize: 11,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          cursor: "pointer",
          padding: "0 10px",
          willChange: "transform, opacity",
          flexShrink: 0,
        }} />

      </div>
    </div>
  );
}
