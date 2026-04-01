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

  // Busca
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
      return [...prev, { product_id: productId, name, qty: 1, unit_price: payload.total, addons: payload.upsells.length > 0 ? payload.upsells : undefined }];
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
  const isScrollingTo = useRef(false);

  useEffect(() => {
    function updateThemeColor() {
      const isDark = document.documentElement.classList.contains('dark');
      let meta = document.querySelector('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'theme-color');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', isDark ? '#000000' : '#ffffff');
    }
    updateThemeColor();
    const obs = new MutationObserver(updateThemeColor);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const featuredCategories = categories.filter((c) => c.is_featured);
  const regularCategories  = categories.filter((c) => !c.is_featured);

  // ── Snap suave vertical (proximity = só encaixa quando perto, não força) ──
  useEffect(() => {
    document.documentElement.classList.add("menu-snap");
    return () => document.documentElement.classList.remove("menu-snap");
  }, []);

  // ── IntersectionObserver: scroll → pill ativo ───────────────────────────
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
          rootMargin: "-30% 0px -50% 0px",
          threshold: 0,
        }
      );

      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regularCategories.length]);

  // ── Snap suave manual: quando o scroll para, encaixa na categoria mais próxima ──
  useEffect(() => {
    let snapTimer: ReturnType<typeof setTimeout> | null = null;
    let isSnapping = false;

    function onScrollEnd() {
      if (isScrollingTo.current || isSnapping) return;

      if (snapTimer) clearTimeout(snapTimer);
      snapTimer = setTimeout(() => {
        // Encontra a seção mais próxima do topo
        let closestId: string | null = null;
        let closestDist = Infinity;
        const offset = 60; // compensa pills fixos

        for (const cat of regularCategories) {
          const el = sectionRefs.current[cat.id];
          if (!el) continue;
          const rect = el.getBoundingClientRect();
          const dist = Math.abs(rect.top - offset);
          if (dist < closestDist) {
            closestDist = dist;
            closestId = cat.id;
          }
        }

        // Só faz snap se a distância for entre 10px e 150px (não snapa se já está encaixado ou se está muito longe)
        if (closestId && closestDist > 10 && closestDist < 150) {
          isSnapping = true;
          const el = sectionRefs.current[closestId];
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
            setActiveCategoryId(closestId);
          }
          setTimeout(() => { isSnapping = false; }, 600);
        }
      }, 200); // 200ms de pausa antes de encaixar
    }

    window.addEventListener("scroll", onScrollEnd, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScrollEnd);
      if (snapTimer) clearTimeout(snapTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regularCategories.length]);

  // ── Scroll programático ao clicar num pill ───────────────────────────────
  const scrollToCategory = useCallback((id: string) => {
    isScrollingTo.current = true;
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

  const searchResults = searchQuery.trim()
    ? products.filter(
        (p) =>
          p.is_active &&
          p.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : [];

  const coverUrl = unit.cover_url ?? unit.banner_url ?? null;

  return (
    <>
      <style>{`
  html.menu-snap {
    -webkit-overflow-scrolling: touch;
  }
  .menu-bg-themed {
    background-color: #ffffff;
    background-image: radial-gradient(rgba(0,0,0,0.06) 1px, transparent 1px);
    background-size: 18px 18px;
    transition: background-color 0.4s ease;
  }
  html.dark .menu-bg-themed {
    background-color: #050505;
    background-image: radial-gradient(rgba(0,255,174,0.12) 1px, transparent 1px);
    background-size: 18px 18px;
  }
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .search-result-card:active {
    opacity: 0.7;
  }
`}</style>
      {/* Conteúdo scrollável */}
      <div
        className="min-h-dvh menu-bg-themed"
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: "calc(360px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {/* ── HEADER: Capa + Logo + Busca ──────────────────────────────── */}
        <div style={{ position: "relative" }}>
          {/* A) Foto de capa */}
          <div style={{ position: "relative", width: "100%", height: 200, overflow: "hidden" }}>
            {coverUrl ? (
              <img
                src={coverUrl}
                alt={unit.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)",
                }}
              />
            )}
            {/* Gradiente inferior */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: "60%",
                background: "linear-gradient(to top, #000 0%, transparent 100%)",
              }}
            />
            {/* Botão de busca (ícone lupa) */}
            <button
              onClick={() => setSearchOpen((o) => !o)}
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                zIndex: 10,
                width: 36,
                height: 36,
                borderRadius: 12,
                background: "rgba(0,0,0,0.3)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                border: "none",
                color: "rgba(255,255,255,0.7)",
                fontSize: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              aria-label="Buscar"
            >
              🔍
            </button>
          </div>

          {/* B) Logo + Nome (sobrepõe a parte inferior da capa) */}
          <div
            style={{
              position: "relative",
              marginTop: -40,
              textAlign: "center",
              paddingBottom: 16,
            }}
          >
            {unit.logo_url && (
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  overflow: "hidden",
                  margin: "0 auto 10px",
                  border: "2px solid rgba(255,255,255,0.15)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                }}
              >
                <img
                  src={unit.logo_url}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            )}
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: "#fff",
                letterSpacing: "-0.3px",
              }}
            >
              {unit.name}
            </div>
            {unit.description && (
              <div
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.5)",
                  marginTop: 4,
                }}
              >
                {unit.description}
              </div>
            )}
            <div
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.35)",
                marginTop: 6,
                letterSpacing: "0.5px",
              }}
            >
              Assista · Escolha · Peça
            </div>
          </div>

          {/* C) Campo de busca expansível */}
          {searchOpen && (
            <div
              style={{
                padding: "0 16px 12px",
                animation: "slideDown 0.2s ease",
              }}
            >
              <input
                type="text"
                placeholder="Buscar pratos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                style={{
                  width: "100%",
                  padding: "10px 16px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.06)",
                  border: "none",
                  color: "#fff",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          )}
        </div>
        {/* ── FIM HEADER ───────────────────────────────────────────────── */}

        {/* ── PILLS STICKY ─────────────────────────────────────────────── */}
        {regularCategories.length > 0 && (
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 50,
              background: "rgba(0,0,0,0.9)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            }}
          >
            <CategoryPillsTop
              categories={regularCategories}
              activeCategoryId={activeCategoryId}
              onSelect={scrollToCategory}
            />
          </div>
        )}
        {/* ── FIM PILLS STICKY ─────────────────────────────────────────── */}

        {/* Resultados de busca (flat list) */}
        {searchQuery.trim() ? (
          <div style={{ padding: "0 12px" }}>
            {searchResults.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  color: "rgba(255,255,255,0.4)",
                  padding: "32px 0",
                  fontSize: 14,
                }}
              >
                Nenhum prato encontrado
              </div>
            ) : (
              searchResults.map((p) => (
                <button
                  key={p.id}
                  className="search-result-card"
                  onClick={() => handleOpenProduct(p)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    width: "100%",
                    padding: "10px 0",
                    borderBottom: "0.5px solid rgba(255,255,255,0.07)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  {p.thumbnail_url && (
                    <img
                      src={p.thumbnail_url}
                      alt=""
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 10,
                        objectFit: "cover",
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#fff",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {p.name}
                    </div>
                    {p.description && (
                      <div
                        style={{
                          fontSize: 12,
                          color: "rgba(255,255,255,0.45)",
                          marginTop: 2,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {p.description}
                      </div>
                    )}
                    {p.base_price != null && (
                      <div
                        style={{
                          fontSize: 13,
                          color: "rgba(255,255,255,0.7)",
                          marginTop: 4,
                        }}
                      >
                        {p.price_type === "variable"
                          ? "A partir de "
                          : ""}
                        R${" "}
                        {p.base_price.toFixed(2).replace(".", ",")}
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        ) : (
          <>
            {/* Categorias em destaque */}
            {featuredCategories.map((cat) => {
              const catProducts = productsByCategory(cat.id);
              if (!catProducts.length) return null;
              return (
                <div key={cat.id}>
                  <FeaturedCarousel
                    items={catProducts}
                    onOpen={(p) => handleOpenProduct(p)}
                  />
                </div>
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
                    opacity: isActive ? 1 : 1,
                    scrollMarginTop: 66,
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
          </>
        )}
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
        unitId={unit.id}
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

      {mode === "delivery" && (
        <button
          onClick={() => {
            const html = document.documentElement;
            const isDark = html.classList.contains("dark");
            if (isDark) {
              html.classList.remove("dark");
              html.classList.add("light");
            } else {
              html.classList.remove("light");
              html.classList.add("dark");
            }
          }}
          style={{
            position: "fixed",
            bottom: "calc(100px + env(safe-area-inset-bottom, 0px))",
            left: 16,
            width: 36,
            height: 36,
            borderRadius: 12,
            background: "rgba(255,255,255,0.10)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "0.5px solid rgba(255,255,255,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: 14,
            zIndex: 40,
          }}
          aria-label="Alternar tema"
        >
          🌗
        </button>
      )}
    </>
  );
}
