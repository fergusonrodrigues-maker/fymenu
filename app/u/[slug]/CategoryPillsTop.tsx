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
  const pillRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const activeIndex = useMemo(() => {
    const i = categories.findIndex((c) => c.id === activeCategoryId);
    return i >= 0 ? i : 0;
  }, [categories, activeCategoryId]);

  useEffect(() => {
    const btn = pillRefs.current[activeCategoryId];
    if (!btn) return;
    btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeCategoryId]);

  const css = `
  .fy-pills{
    position: sticky;
    top: 0;
    z-index: 30;
    padding: 12px 10px 10px 10px;
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    background: rgba(0,0,0,0.35);
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .fy-pillsRow{
    display:flex;
    gap:10px;
    overflow-x:auto;
    scrollbar-width:none;
    -webkit-overflow-scrolling: touch;
    scroll-snap-type: x mandatory;
    padding: 2px 6px 6px 6px;
  }
  .fy-pillsRow::-webkit-scrollbar{ width:0;height:0;display:none; }

  .fy-pill{
    scroll-snap-align:center;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.16);
    background: rgba(255,255,255,0.08);
    color:#fff;
    font-weight: 900;
    padding: 10px 16px;
    cursor:pointer;
    white-space: nowrap;
    transition: transform 180ms ease, background 180ms ease, border 180ms ease, opacity 180ms ease;
    outline:none;
    -webkit-tap-highlight-color: transparent;
  }

  .fy-pill.isActive{
    transform: scale(1.14);
    background: rgba(255,255,255,0.16);
    border: 1px solid rgba(255,255,255,0.22);
  }
  `;

  return (
    <div className="fy-pills">
      <style>{css}</style>
      <div className="fy-pillsRow">
        {categories.map((c, idx) => {
          const isActive = c.id === activeCategoryId;
          return (
            <button
              key={c.id}
              ref={(el) => {
                pillRefs.current[c.id] = el;
              }}
              className={`fy-pill ${isActive ? "isActive" : ""}`}
              onClick={() => onSelectCategory(c.id)}
              style={{
                opacity: isActive ? 1 : idx === activeIndex - 1 || idx === activeIndex + 1 ? 0.9 : 0.8,
              }}
            >
              {c.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}