// FILE: /app/u/[slug]/FeaturedCarousel.tsx
// ACTION: REPLACE ENTIRE FILE

"use client";

import React from "react";
import type { Product } from "./menuTypes";
import CategoryCarousel from "./CategoryCarousel";

export default function FeaturedCarousel({
  items,
  onOpen,
}: {
  items: Product[];
  onOpen: (p: Product, originalIndex: number) => void;
}) {
  // Só reaproveita o CategoryCarousel, mas com compact=false (maior)
  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <div style={{ fontWeight: 950, fontSize: 16 }}>Destaque</div>
      </div>

      <CategoryCarousel
        items={items}
        compact={false}
        onOpen={(p, idx) => onOpen(p, idx)}
      />
    </div>
  );
}