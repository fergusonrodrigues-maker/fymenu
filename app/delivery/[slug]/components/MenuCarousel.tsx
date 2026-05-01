"use client";

import { useEffect, useRef, useState } from "react";
import { formatCents } from "@/lib/money";

interface MenuCarouselProps {
  categories: Array<{
    id: string;
    name: string;
    products: Array<{
      id: string;
      name: string;
      description?: string;
      base_price: number;
      thumbnail_url?: string;
      video_url?: string;
    }>;
  }>;
  onCategoryChange?: (categoryId: string) => void;
}

export function MenuCarousel({
  categories,
  onCategoryChange,
}: MenuCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id || "");
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const children = Array.from(
        container.querySelectorAll("[data-category-id]")
      ) as HTMLElement[];

      let closestId = activeCategory;
      let closestDistance = Infinity;

      children.forEach((child) => {
        const rect = child.getBoundingClientRect();
        const distance = Math.abs(rect.left);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestId = child.dataset.categoryId || activeCategory;
        }
      });

      if (closestId !== activeCategory) {
        setActiveCategory(closestId);
        onCategoryChange?.(closestId);
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [activeCategory, onCategoryChange]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startXRef.current = e.clientX;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    startXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Suppress unused var warning
  void isDragging;

  return (
    <div className="relative w-full h-full">
      {/* Container de scroll snap */}
      <div
        ref={scrollContainerRef}
        className="w-full h-full overflow-x-scroll overflow-y-hidden scroll-smooth"
        style={{
          scrollSnapType: "x mandatory",
          scrollBehavior: "smooth",
          WebkitOverflowScrolling: "touch",
        }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex h-full">
          {categories.map((category) => (
            <div
              key={category.id}
              data-category-id={category.id}
              className="flex-shrink-0 w-full h-full p-4 flex flex-col"
              style={{ scrollSnapAlign: "start", scrollSnapStop: "always" }}
            >
              {/* Header da categoria */}
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-white">{category.name}</h2>
                <div className="w-12 h-1 bg-orange-500 rounded mt-2" />
              </div>

              {/* Grid de produtos */}
              <div className="flex-1 overflow-y-auto space-y-3">
                {category.products.map((product) => (
                  <div
                    key={product.id}
                    className="flex gap-3 p-3 bg-zinc-900 rounded-xl"
                  >
                    {product.thumbnail_url && (
                      <img
                        src={product.thumbnail_url}
                        alt={product.name}
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{product.name}</p>
                      {product.description && (
                        <p className="text-gray-400 text-xs line-clamp-2 mt-0.5">{product.description}</p>
                      )}
                      <p className="text-orange-400 font-bold text-sm mt-1">
                        {formatCents(product.base_price)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Indicator de categorias */}
      <div className="absolute bottom-4 left-4 right-4 flex gap-2 flex-wrap">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => {
              const element = scrollContainerRef.current?.querySelector(
                `[data-category-id="${category.id}"]`
              ) as HTMLElement;
              element?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
              activeCategory === category.id
                ? "bg-orange-500 text-white"
                : "bg-gray-600 text-gray-100 hover:bg-gray-500"
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>
    </div>
  );
}
