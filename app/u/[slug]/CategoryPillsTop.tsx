// FILE: /app/u/[slug]/CategoryPillsTop.tsx
// ACTION: REPLACE ENTIRE FILE

"use client";

import React, { useEffect, useMemo, useRef } from "react";
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

  const pills = useMemo(() => categories ?? [], [categories]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !activeCategoryId) return;

    const el = scroller.querySelector<HTMLButtonElement>(`button[data-id="${activeCategoryId}"]`);
    if (!el) return;

    const r = el.getBoundingClientRect();
    const sr = scroller.getBoundingClientRect();
    const elCenter = r.left + r.width / 2;
    const scCenter = sr.left + sr.width / 2;

    scroller.scrollBy({ left: elCenter - scCenter, behavior: "smooth" });
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

        <div
          ref={scrollerRef}
          style={{
            marginTop: 10,
            display: "flex",
            gap: 10,
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
                data-id={c.id}
                onClick={() => onSelect(c.id)}
                style={{
                  flex: "0 0 auto",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.16)",
                  background: active ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.08)",
                  color: active ? "#111" : "rgba(255,255,255,0.92)",
                  padding: "10px 14px",
                  fontWeight: 950,
                  fontSize: 13,
                  transform: active ? "scale(1.14)" : "scale(0.96)",
                  transition: "transform 200ms ease, background 200ms ease, color 200ms ease",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
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