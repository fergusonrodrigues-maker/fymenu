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
  return (
    <div style={{ width: "100%" }}>
      <CategoryCarousel
        items={items}
        compact={false}       // ✅ destaque maior
        initialIndex={1}      // ✅ começa no card 2 como HERO
        onOpen={(p, idx) => onOpen(p, idx)}
      />
    </div>
  );
}