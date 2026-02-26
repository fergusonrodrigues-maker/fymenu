// FILE: /app/u/[slug]/CategoryPillsTop.tsx
// ACTION: CREATE NEW FILE

"use client";

import React, { useEffect, useMemo, useRef } from "react";
import type { Category } from "./menuTypes";

type Props = {
  categories: Category[];
  activeCategoryId: string | null;
  onSelect: (categoryId: string) => void;
};

export default function CategoryPillsTop({ categories, activeCategoryId, onSelect }: Props) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const ordered = useMemo(() => {
    return [...categories].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  }, [categories]);

  useEffect(() => {
    if (!activeCategoryId) return;
    const root = scrollerRef.current;
    if (!root) return;
    const el = root.querySelector<HTMLButtonElement>(`button[data-cat="${activeCategoryId}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeCategoryId]);

  return (
    <div
      ref={scrollerRef}
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        padding: "10px 12px 8px",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        background: "rgba(0,0,0,0.35)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        overflowX: "auto",
        display: "flex",
        gap: 10,

        // ajuda a centralizar “inline center”
        scrollPaddingLeft: "50%",
        scrollPaddingRight: "50%",
      }}
    >
      {ordered.map((c) => {
        const active = c.id === activeCategoryId;
        return (
          <button
            key={c.id}
            data-cat={c.id}
            onClick={() => onSelect(c.id)}
            style={{
              flex: "0 0 auto",
              border: "1px solid rgba(255,255,255,0.14)",
              color: active ? "#111" : "rgba(255,255,255,0.90)",
              background: active ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.08)",
              padding: active ? "14px 20px" : "12px 18px",
              borderRadius: 999,
              fontWeight: 800,
              fontSize: active ? 18 : 16,
              letterSpacing: 0.2,
              transform: active ? "scale(1.04)" : "scale(1)",
              transition: "all 240ms cubic-bezier(.22,.9,.3,1)",
              boxShadow: active ? "0 10px 30px rgba(0,0,0,0.35)" : "none",
              cursor: "pointer",
              outline: "none",
            }}
          >
            {c.name}
          </button>
        );
      })}
    </div>
  );
}