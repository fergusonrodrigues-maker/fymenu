// FILE: /app/u/[slug]/FeaturedCarousel.tsx
// ACTION: REPLACE ENTIRE FILE

"use client";

import React from "react";
import type { Product } from "./menuTypes";
import CategoryCarousel from "./CategoryCarousel";

type Props = {
  items: Product[];
  onOpen: (p: Product, originalIndex: number) => void;
};

export default function FeaturedCarousel({ items, onOpen }: Props) {
  return (
    <div style={{ width: "100%" }}>
      <CategoryCarousel
        items={items}
        compact={false}
        onOpen={(p, idx) => onOpen(p, idx)}

/>
    </div>
  );
}