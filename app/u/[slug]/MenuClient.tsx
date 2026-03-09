"use client";

import { useRef, useState } from "react";
import { Unit, Category, Product, ProductVariation } from "./menuTypes";
import CategoryPillsTop from "./CategoryPillsTop";
import CategoryCarousel from "./CategoryCarousel";
import FeaturedCarousel from "./FeaturedCarousel";
import BottomGlassBar from "./BottomGlassBar";
import ProductCard from "./ProductCard";
import ProductModal from "./ProductModal";
import UpsellModal, { UpsellSuggestion } from "./UpsellModal";
import { OrderPayload } from "./orderBuilder";

interface MenuClientProps {
  unit: Unit;
  categories: Category[];
  products: Product[];
  variations: Record<string, ProductVariation[]>;
  upsells: Record<string, UpsellSuggestion[]>;
}

export default function MenuClient({
  unit,
  categories,
  products,
  variations,
  upsells,
}: MenuClientProps) {
  const [activeCategoryId, setActiveCategoryId] = useState<string>(
    categories[0]?.id ?? ""
  );
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [pendingPayload, setPendingPayload] = useState<OrderPayload | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const featuredCategories = categories.filter((c) => c.is_featured);
  const regularCategories = categories.filter((c) => !c.is_featured);

  function scrollToCategory(id: string) {
    setActiveCategoryId(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleOpenProduct(product: Product) {
    setSelectedProduct(product);
  }

  function handleProductOrder(payload: OrderPayload) {
    setSelectedProduct(null);
    setPendingPayload(payload);
  }

  function handleUpsellClose() {
    setPendingPayload(null);
  }

  const productsByCategory = (categoryId: string) =>
    products.filter((p) => p.category_id === categoryId && p.is_active);

  return (
    <>
      {/* Fixed top: pills nav */}
      <CategoryPillsTop
        categories={categories}
        activeCategoryId={activeCategoryId}
        onSelect={scrollToCategory}
      />

      {/* Scrollable content */}
      <div className="pt-14 pb-28 min-h-dvh bg-black">
        {/* Featured carousels */}
        {featuredCategories.map((cat) => {
          const catProducts = productsByCategory(cat.id);
          if (!catProducts.length) return null;
          return (
            <FeaturedCarousel
              key={cat.id}
              category={cat}
              products={catProducts}
              onProductClick={handleOpenProduct}
            />
          );
        })}

        {/* Regular categories */}
        {regularCategories.map((cat) => {
          const catProducts = productsByCategory(cat.id);
          if (!catProducts.length) return null;
          return (
            <div
              key={cat.id}
              ref={(el) => { sectionRefs.current[cat.id] = el; }}
            >
              <CategoryCarousel
                category={cat}
                products={catProducts}
                renderCard={(product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onOrder={handleOpenProduct}
                  />
                )}
              />
            </div>
          );
        })}
      </div>

      {/* Bottom glass bar */}
      <BottomGlassBar unit={unit} />

      {/* Product modal */}
      <ProductModal
        product={selectedProduct}
        variations={selectedProduct ? (variations[selectedProduct.id] ?? []) : []}
        onClose={() => setSelectedProduct(null)}
        onOrder={handleProductOrder}
      />

      {/* Upsell modal */}
      <UpsellModal
        payload={pendingPayload}
        suggestions={
          pendingPayload
            ? (upsells[pendingPayload.product.id] ?? [])
            : []
        }
        unit={unit}
        onClose={handleUpsellClose}
      />
    </>
  );
}
