"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Unit, Category, Product, ProductVariation } from "./menuTypes";
import CategoryPillsTop from "./CategoryPillsTop";
import CategoryCarousel from "./CategoryCarousel";
import FeaturedCarousel from "./FeaturedCarousel";
import BottomGlassBar from "./BottomGlassBar";
import ProductModal from "./ProductModal";
import UpsellModal, { UpsellSuggestion } from "./UpsellModal";
import { OrderPayload } from "./orderBuilder";

interface MenuClientProps {
  unit: Unit;
  categories: Category[];
  products: Product[];
  variations: Record<string, ProductVariation[]>;
  upsells: Record<string, UpsellSuggestion[]>;
  mode?: "delivery" | "presencial";
}

export default function MenuClient({
  unit,
  categories,
  products,
  variations,
  upsells,
  mode = "delivery",
}: MenuClientProps) {
  const [activeCategoryId, setActiveCategoryId] = useState<string>(
    categories[0]?.id ?? ""
  );
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [pendingPayload, setPendingPayload] = useState<OrderPayload | null>(null);

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const isScrollingTo = useRef(false); // evita loop: scroll programático ≠ scroll do usuário

  const featuredCategories = categories.filter((c) => c.is_featured);
  const regularCategories  = categories.filter((c) => !c.is_featured);

  // ── IntersectionObserver: scroll vertical → pill ativo ───────────────────
  useEffect(() => {
    if (regularCategories.length === 0) return;

    const observers: IntersectionObserver[] = [];

    regularCategories.forEach((cat) => {
      const el = sectionRefs.current[cat.id];
      if (!el) return;

      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !isScrollingTo.current) {
              setActiveCategoryId(cat.id);
            }
          });
        },
        {
          rootMargin: "-40% 0px -40% 0px", // zona central da viewport
          threshold: 0,
        }
      );

      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regularCategories.length]);

  // ── Scroll programático ao clicar num pill ───────────────────────────────
  const scrollToCategory = useCallback((id: string) => {
    setActiveCategoryId(id);
    isScrollingTo.current = true;
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
    // libera o observer após a animação de scroll
    setTimeout(() => { isScrollingTo.current = false; }, 800);
  }, []);

  function handleOpenProduct(product: Product) {
    setSelectedProduct(product);
  }

  function handleProductOrder(payload: OrderPayload) {
    setSelectedProduct(null);
    if (mode === "presencial") return;
    setPendingPayload(payload);
  }

  function handleUpsellClose() {
    setPendingPayload(null);
  }

  const productsByCategory = (categoryId: string) =>
    products.filter((p) => p.category_id === categoryId && p.is_active);

  return (
    <>
      {/* Pills fixos no topo */}
      <CategoryPillsTop
        categories={regularCategories}
        activeCategoryId={activeCategoryId}
        onSelect={scrollToCategory}
      />

      {/* Conteúdo scrollável */}
      <div
        className="min-h-dvh bg-black"
        style={{ paddingTop: 64, paddingBottom: 96 }}
      >
        {/* Categorias em destaque */}
        {featuredCategories.map((cat) => {
          const catProducts = productsByCategory(cat.id);
          if (!catProducts.length) return null;
          return (
            <FeaturedCarousel
              key={cat.id}
              items={catProducts}
              onOpen={(p) => handleOpenProduct(p)}
            />
          );
        })}

        {/* Categorias regulares */}
        {regularCategories.map((cat) => {
          const catProducts = productsByCategory(cat.id);
          if (!catProducts.length) return null;
          const isActive = cat.id === activeCategoryId;

          return (
            <div
              key={cat.id}
              ref={(el) => { sectionRefs.current[cat.id] = el; }}
              style={{
                marginBottom: 4,
                transition: "opacity 0.4s ease",
                opacity: isActive ? 1 : 0.55,
              }}
            >
              <CategoryCarousel
                items={catProducts}
                active={isActive}
                onOpen={(p) => handleOpenProduct(p)}
              />
            </div>
          );
        })}
      </div>

      {/* Bottom bar */}
      <BottomGlassBar unit={unit} />

      {/* Product modal */}
      <ProductModal
        product={selectedProduct}
        variations={selectedProduct ? (variations[selectedProduct.id] ?? []) : []}
        onClose={() => setSelectedProduct(null)}
        onOrder={handleProductOrder}
        allProducts={products}
        mode={mode}
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
