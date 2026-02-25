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
    <div style={{ width: "100%", overflow: "visible" }}>
      <CategoryCarousel
        items={items}
        compact={false}
        variant="featured"
        initialHeroIndex={1}
        onOpen={(p, idx) => onOpen(p, idx)}
      />
    </div>
  );
}