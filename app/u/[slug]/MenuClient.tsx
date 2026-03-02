"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { CategoryWithProducts, Product, Unit } from "./menuTypes";
import CategoryPillsTop from "./CategoryPillsTop";
import FeaturedCarousel from "./FeaturedCarousel";
import CategoryCarousel from "./CategoryCarousel";
import BottomGlassBar from "./BottomGlassBar";

type Props = { unit: Unit; categories: CategoryWithProducts[] };

function moneyBR(v: number) {
  return `R$ ${v.toFixed(2).replace(".", ",")}`;
}

export default function MenuClient({ unit, categories }: Props) {
  const orderedCategories = useMemo(() => {
    const arr = categories ?? [];
    return [...arr].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  }, [categories]);

  // ✅ FIX 1: sempre inicia na categoria destaque (index 0)
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(
    orderedCategories[0]?.id ?? null
  );

  const [modal, setModal] = useState<null | { list: Product[]; index: number }>(null);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pillSpanRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const ignoreObserverRef = useRef(false);

  // ✅ FIX 2: IntersectionObserver com rootMargin apertado — só ativa quando
  // a seção cruza o topo da tela, evitando Cat2 disparar no load
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (ignoreObserverRef.current) return;
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = (entry.target as HTMLElement).dataset.categoryId;
            if (id) setActiveCategoryId(id);
          }
        });
      },
      { threshold: 0, rootMargin: "-30% 0px -65% 0px" }
    );

    sectionRefs.current.forEach((el) => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [orderedCategories]);

  // Fade-out das pills divisórias ao subir até a top bar
  useEffect(() => {
    const handleScroll = () => {
      pillSpanRefs.current.forEach((pill) => {
        if (!pill) return;
        const rect = pill.getBoundingClientRect();
        if (rect.top < 50) {
          pill.style.opacity = "0";
          pill.style.pointerEvents = "none";
        } else if (rect.top < 150) {
          pill.style.opacity = String((rect.top - 50) / 100);
          pill.style.pointerEvents = "auto";
        } else {
          pill.style.opacity = "1";
          pill.style.pointerEvents = "auto";
        }
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const onSelectCategory = (categoryId: string) => {
    // bloqueia observer por 1s enquanto faz scroll programático
    ignoreObserverRef.current = true;
    setActiveCategoryId(categoryId);
    const idx = orderedCategories.findIndex((c) => c.id === categoryId);
    const el = sectionRefs.current[idx];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => { ignoreObserverRef.current = false; }, 1000);
  };

  const featuredCategory = orderedCategories[0] ?? null;
  const otherCategories = featuredCategory ? orderedCategories.slice(1) : orderedCategories;

  return (
    // ✅ FIX 3: overflow: clip ao invés de hidden — não bloqueia position:sticky
    <div style={{ width: "100%", minHeight: "100vh", background: "#000", overflowX: "clip" }}>

      {/* ✅ FIX 4: sticky funciona porque o pai não tem overflow:hidden */}
      <CategoryPillsTop
        categories={orderedCategories}
        activeCategoryId={activeCategoryId}
        onSelect={onSelectCategory}
      />

      {/* paddingTop: afasta do fixed top bar; paddingBottom: GlassBar não cobre */}
      <div style={{ paddingTop: 80, paddingBottom: 100 }}>

        {/* Featured — sem pill, é a Destaque */}
        {featuredCategory && (
          <div
            ref={(el) => { sectionRefs.current[0] = el; }}
            data-category-id={featuredCategory.id}
          >
            <FeaturedCarousel
              items={featuredCategory.products}
              onOpen={(_, idx) => setModal({ list: featuredCategory.products, index: idx })}
            />
          </div>
        )}

        {otherCategories.map((cat, i) => (
          <div
            key={cat.id}
            ref={(el) => { sectionRefs.current[i + 1] = el; }}
            data-category-id={cat.id}
            style={{ position: "relative", overflow: "visible", paddingTop: 24 }}
          >
            {/* Pill ancorado na borda do topo — metade acima, metade abaixo */}
            <div style={{
              position: "absolute",
              top: 0,
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 20,
            }}>
              <span
                ref={(el) => { pillSpanRefs.current[i] = el; }}
                style={{
                  display: "inline-block",
                  background: "rgba(0,0,0,0.60)",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 15,
                  borderRadius: 999,
                  minWidth: 80,
                  maxWidth: "50vw",
                  padding: "8px 20px",
                  textAlign: "center",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  boxShadow: "0 2px 16px rgba(0,0,0,0.4)",
                  transition: "opacity 0.2s ease-out",
                }}
              >
                {cat.name}
              </span>
            </div>

            <CategoryCarousel
              items={cat.products}
              compact={true}
              onOpen={(_, idx) => setModal({ list: cat.products, index: idx })}
            />
          </div>
        ))}
      </div>

      {/* ✅ FIX 7: GlassBar renderizando */}
      <BottomGlassBar unit={unit} />

      {modal && (
        <ProductBoardModal
          list={modal.list}
          index={modal.index}
          onClose={() => setModal(null)}
          onIndexChange={(i) => setModal((m) => (m ? { ...m, index: i } : m))}
        />
      )}
    </div>
  );
}

function ProductBoardModal({
  list, index, onClose, onIndexChange,
}: {
  list: Product[]; index: number; onClose: () => void; onIndexChange: (i: number) => void;
}) {
  const product = list[index];
  const [videoReady, setVideoReady] = useState(false);
  const startRef = useRef<{ x: number; y: number; t: number } | null>(null);

  useEffect(() => { setVideoReady(false); }, [index]);
  if (!product) return null;

  const video = product.video_url ?? null;
  const thumb = product.thumbnail_url ?? null;

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    startRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const s = startRef.current; if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x, dy = t.clientY - s.y;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    if (ay > ax && ay > 55) { onClose(); return; }
    if (ax > ay && ax > 45) {
      if (dx < 0) onIndexChange(Math.min(list.length - 1, index + 1));
      else onIndexChange(Math.max(0, index - 1));
    }
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 999,
      background: "rgba(0,0,0,0.60)",
      backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 14,
    }}>
      <div onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
        style={{
          width: "min(520px, 92vw)", aspectRatio: "9/16",
          borderRadius: 28, border: "1px solid rgba(255,255,255,0.10)",
          overflow: "hidden", position: "relative",
          background: "#000", boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
          touchAction: "pan-y pan-x",
        }}>
        <div style={{ position: "absolute", top: 14, left: 18, zIndex: 5, fontSize: 12, fontWeight: 900, color: "rgba(255,255,255,0.95)" }}>
          {index + 1} / {list.length}
        </div>
        <button onClick={onClose} style={{
          position: "absolute", top: 12, right: 12, zIndex: 5,
          borderRadius: 999, border: "1px solid rgba(255,255,255,0.15)",
          background: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.92)",
          padding: "10px 14px", fontWeight: 900, cursor: "pointer",
        }}>Fechar</button>

        {thumb && (
          <img src={thumb} alt={product.name} style={{
            position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
            opacity: video && videoReady ? 0 : 1,
            visibility: video && videoReady ? "hidden" : "visible",
            transition: "opacity 220ms ease",
          }} />
        )}

        {video && (
          <video src={video} autoPlay muted playsInline style={{
            position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
          }} onTimeUpdate={(e) => {
            if (!videoReady && e.currentTarget.currentTime >= 1) setVideoReady(true);
          }} />
        )}

        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.35) 46%, rgba(0,0,0,0.10) 72%, transparent 100%)",
        }} />

        <div style={{ position: "absolute", left: 18, right: 18, bottom: 18, zIndex: 4, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ color: "#fff", fontWeight: 950, fontSize: 22, lineHeight: 1.1 }}>{product.name}</div>
          {product.description && (
            <div style={{ color: "rgba(255,255,255,0.80)", fontWeight: 700, fontSize: 13 }}>{product.description}</div>
          )}
          <div style={{ color: "#fff", fontWeight: 950, fontSize: 26 }}>
            {product.price_type === "variable" ? "Preço variável" : product.price != null ? moneyBR(Number(product.price)) : ""}
          </div>
          <div style={{ color: "rgba(255,255,255,0.65)", fontWeight: 800, fontSize: 12 }}>
            swipe ←/→ para trocar • swipe ↑/↓ para fechar • toque fora para fechar
          </div>
        </div>
      </div>
    </div>
  );
}
