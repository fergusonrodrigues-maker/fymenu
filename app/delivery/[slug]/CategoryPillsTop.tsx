"use client";

import { useEffect, useRef, useState } from "react";
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
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);
  const pillRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Auto-center the active pill when it changes
  useEffect(() => {
    const idx = categories.findIndex((c) => c.id === activeCategoryId);
    if (idx < 0) return;
    const pill = pillRefs.current[idx];
    const container = scrollRef.current;
    if (!pill || !container) return;
    const scrollLeft =
      pill.offsetLeft - container.offsetWidth / 2 + pill.offsetWidth / 2;
    container.scrollTo({ left: scrollLeft, behavior: "smooth" });
  }, [activeCategoryId, categories]);

  return (
    <div
      ref={scrollRef}
      style={{
        display: "flex",
        gap: 8,
        overflowX: "auto",
        paddingLeft: 16,
        paddingRight: 16,
        paddingTop: 8,
        paddingBottom: 10,
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        scrollBehavior: "smooth",
      } as React.CSSProperties}
    >
      {categories.map((cat, index) => {
        const isActive = cat.id === activeCategoryId;
        return (
          <button
            key={cat.id}
            ref={(el) => { pillRefs.current[index] = el; }}
            onClick={() => onSelect(cat.id)}
            style={{
              flexShrink: 0,
              padding: "8px 20px",
              borderRadius: 20,
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: isActive ? 700 : 500,
              background: isActive
                ? "#FF6B00"
                : isDark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.04)",
              color: isActive
                ? "#fff"
                : isDark
                  ? "rgba(255,255,255,0.5)"
                  : "rgba(0,0,0,0.5)",
              transition: "all 0.25s ease",
              whiteSpace: "nowrap",
            }}
          >
            {cat.name}
          </button>
        );
      })}
    </div>
  );
}
