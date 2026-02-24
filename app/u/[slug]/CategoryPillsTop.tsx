// FILE: /app/u/[slug]/CategoryPillsTop.tsx
// ACTION: REPLACE ENTIRE FILE

"use client";

import React from "react";

type Cat = { id: string; name: string };

export default function CategoryPillsTop({
  categories,
  activeCategoryId,
  onSelectCategory,
}: {
  categories: Cat[];
  activeCategoryId: string;
  onSelectCategory: (id: string) => void;
}) {
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(11,11,11,0.78)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(255,255,255,0.10)",
      }}
    >
      <div
        className="fy-scroll-x fy-no-highlight"
        style={{
          display: "flex",
          gap: 10,
          overflowX: "auto",
          padding: "14px 14px 12px 14px",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {categories.map((c) => {
          const active = c.id === activeCategoryId;
          return (
            <button
              key={c.id}
              onClick={() => onSelectCategory(c.id)}
              className="fy-no-highlight"
              style={{
                flex: "0 0 auto",
                padding: "10px 14px",
                borderRadius: 999,
                border: `1px solid ${active ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.12)"}`,
                background: active ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.06)",
                color: "#fff",
                fontWeight: 950,
                fontSize: 13,
                cursor: "pointer",
                outline: "none",
                opacity: active ? 1 : 0.88,
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