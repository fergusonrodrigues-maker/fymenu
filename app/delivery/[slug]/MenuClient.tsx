"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Unit, Category, Product, ProductVariation } from "./menuTypes";
import { useTrack } from "./useTrack";
import CategoryPillsTop from "./CategoryPillsTop";
import CategoryCarousel from "./CategoryCarousel";
import FeaturedCarousel from "./FeaturedCarousel";
import BottomGlassBar from "./BottomGlassBar";
import ProductModal from "./ProductModal";
import UpsellModal, { UpsellSuggestion } from "./UpsellModal";
import CartBar from "./CartBar";
import CartModal, { CartItem } from "./CartModal";
import { OrderPayload } from "./orderBuilder";

interface MenuClientProps {
  unit: Unit;
  categories: Category[];
  products: Product[];
  variations: Record<string, ProductVariation[]>;
  upsells: Record<string, UpsellSuggestion[]>;
  mode?: "delivery" | "presencial";
  initialTable?: number | null;
}

export default function MenuClient({
  unit,
  categories,
  products,
  variations,
  upsells,
  mode = "delivery",
  initialTable = null,
}: MenuClientProps) {
  const [activeCategoryId, setActiveCategoryId] = useState<string>(
    categories[0]?.id ?? ""
  );
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [pendingPayload, setPendingPayload] = useState<OrderPayload | null>(null);

  // Carrinho para modo presencial
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  function addToCart(payload: OrderPayload) {
    const productId = payload.variation?.id
      ? `${payload.product.id}__${payload.variation.id}`
      : payload.product.id;
    const name = payload.variation
      ? `${payload.product.name} — ${payload.variation.name}`
      : payload.product.name;
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === productId);
      if (existing) {
        return prev.map((i) =>
          i.product_id === productId ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { product_id: productId, name, qty: 1, unit_price: payload.total }];
    });
  }

  function updateCartQty(productId: string, qty: number) {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.product_id !== productId));
    } else {
      setCart((prev) =>
        prev.map((i) => (i.product_id === productId ? { ...i, qty } : i))
      );
    }
  }

  const cartTotal = cart.reduce((s, i) => s + i.qty * i.unit_price, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const { track } = useTrack(unit.id);

  // Rastrear abertura do cardápio
  useEffect(() => {
    track({ event: "menu_view" });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    isScrollingTo.current = true;
    // Scroll ANTES do setState para evitar que o re-render invalide os refs
    const el = sectionRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setActiveCategoryId(id);
    setTimeout(() => { isScrollingTo.current = false; }, 800);
  }, []);

  function handleOpenProduct(product: Product) {
    setSelectedProduct(product);
    track({ event: "product_click", product_id: product.id, category_id: product.category_id });
  }

  function handleProductOrder(payload: OrderPayload) {
    setSelectedProduct(null);
    if (mode === "presencial") {
      addToCart(payload);
      return;
    }
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
        className="min-h-dvh bg-white"
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

      {/* Bottom bar (apenas no modo delivery) */}
      {mode === "delivery" && <BottomGlassBar unit={unit} />}

      {/* Cart bar flutuante (modo presencial) */}
      {mode === "presencial" && (
        <CartBar
          itemCount={cartCount}
          total={cartTotal}
          onOpen={() => setCartOpen(true)}
        />
      )}

      {/* Product modal */}
      <ProductModal
        product={selectedProduct}
        variations={selectedProduct ? (variations[selectedProduct.id] ?? []) : []}
        onClose={() => setSelectedProduct(null)}
        onOrder={handleProductOrder}
        allProducts={products}
        mode={mode}
      />

      {/* Upsell modal (delivery) */}
      {mode === "delivery" && (
        <UpsellModal
          payload={pendingPayload}
          suggestions={
            pendingPayload ? (upsells[pendingPayload.product.id] ?? []) : []
          }
          unit={unit}
          onClose={handleUpsellClose}
        />
      )}

      {/* Cart modal (presencial) */}
      {mode === "presencial" && cartOpen && (
        <CartModal
          items={cart}
          unitId={unit.id}
          initialTable={initialTable}
          onClose={() => setCartOpen(false)}
          onSuccess={() => setCart([])}
          onUpdateQty={updateCartQty}
        />
      )}
    </>
  );
}
