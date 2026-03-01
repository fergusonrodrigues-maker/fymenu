"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { CategoryWithProducts, Product, Unit } from "./menuTypes";
import CategoryPillsTop from "./CategoryPillsTop";
import FeaturedCarousel from "./FeaturedCarousel";
import CategoryCarousel from "./CategoryCarousel";

type Props = {
  unit: Unit;
  categories: CategoryWithProducts[];
};

function moneyBR(v: number) {
  return `R$ ${v.toFixed(2).replace(".", ",")}`;
}

export default function MenuClient({ unit, categories }: Props) {
  const orderedCategories = useMemo(() => {
    const arr = categories ?? [];
    return [...arr].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  }, [categories]);

  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(
    orderedCategories[0]?.id ?? null
  );

  // modal board
  const [modal, setModal] = useState<null | { list: Product[]; index: number }>(null);

  useEffect(() => {
    if (!activeCategoryId && orderedCategories[0]?.id) setActiveCategoryId(orderedCategories[0].id);
  }, [activeCategoryId, orderedCategories]);

  const onSelectCategory = (categoryId: string) => {
    setActiveCategoryId(categoryId);
    // amanhã: se tiver anchors por categoria, plugamos scroll suave aqui SEM mexer nas animações
  };

  // 1ª categoria = destaque
  const featuredCategory = orderedCategories[0] ?? null;
  const otherCategories = featuredCategory ? orderedCategories.slice(1) : orderedCategories;

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "#000",
        overflowX: "hidden",
      }}
    >
      <CategoryPillsTop
  unit={unit}
  categories={orderedCategories}
  activeCategoryId={activeCategoryId}
  onSelect={onSelectCategory}
/>
      {/* ✅ reduzimos gaps aqui */}
      <div style={{ paddingBottom: 16 }}>
        {featuredCategory ? (
          <div>
            <FeaturedCarousel
              items={featuredCategory.products}
              onOpen={(_, idx) => setModal({ list: featuredCategory.products, index: idx })}
            />
          </div>
        ) : null}

        {/* ✅ SEM “pill” interna no meio do feed (era isso que criava as faixas pretas) */}
        {otherCategories.map((cat) => (
          <div key={cat.id}>
            <div
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "center",
                zIndex: 10,
                paddingTop: 0,
                paddingBottom: 0,
                margin: 0,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  background: "rgba(255,255,255,0.92)",
                  color: "#000",
                  fontWeight: 800,
                  fontSize: 15,
                  borderRadius: 999,
                  padding: "8px 20px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
                  backdropFilter: "blur(8px)",
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

      {modal ? (
        <ProductBoardModal
          list={modal.list}
          index={modal.index}
          onClose={() => setModal(null)}
          onIndexChange={(i) => setModal((m) => (m ? { ...m, index: i } : m))}
        />
      ) : null}
    </div>
  );
}

function ProductBoardModal({
  list,
  index,
  onClose,
  onIndexChange,
}: {
  list: Product[];
  index: number;
  onClose: () => void;
  onIndexChange: (nextIndex: number) => void;
}) {
  const product = list[index];
  const [videoReady, setVideoReady] = useState(false);

  // swipe (sem setas)
  const startRef = useRef<{ x: number; y: number; t: number } | null>(null);

  useEffect(() => {
    setVideoReady(false);
  }, [index]);

  if (!product) return null;

  const video = product.video_url ?? null;
  const thumb = product.thumbnail_url ?? null;

  const goPrev = () => onIndexChange(Math.max(0, index - 1));
  const goNext = () => onIndexChange(Math.min(list.length - 1, index + 1));

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    startRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const s = startRef.current;
    if (!s) return;

    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;

    const ax = Math.abs(dx);
    const ay = Math.abs(dy);

    // thresholds
    const H = 45; // lateral troca produto
    const V = 55; // vertical fecha

    // decide eixo dominante
    if (ay > ax && ay > V) {
      // swipe vertical => fechar
      onClose();
      return;
    }

    if (ax > ay && ax > H) {
      // swipe horizontal => trocar produto
      if (dx < 0) goNext();
      else goPrev();
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999,
        background: "rgba(0,0,0,0.60)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 14,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          width: "min(520px, 92vw)",
          aspectRatio: "9 / 16",
          borderRadius: 28,
          border: "1px solid rgba(255,255,255,0.10)",
          overflow: "hidden",
          position: "relative",
          background: "#000",
          boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
          touchAction: "pan-y pan-x",
        }}
      >
        {/* contador */}
        <div
          style={{
            position: "absolute",
            top: 14,
            left: 18,
            zIndex: 5,
            fontSize: 12,
            fontWeight: 900,
            opacity: 0.8,
            color: "rgba(255,255,255,0.95)",
          }}
        >
          {index + 1} / {list.length}
        </div>

        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 5,
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.15)",
            background: "rgba(255,255,255,0.10)",
            color: "rgba(255,255,255,0.92)",
            padding: "10px 14px",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          Fechar
        </button>

        {/* Thumb: some 100% após ~1s de vídeo (sem “mescla”) */}
        {thumb ? (
          <img
            src={thumb}
            alt={product.name}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: video && videoReady ? 0 : 1,
              visibility: video && videoReady ? "hidden" : "visible",
              transition: "opacity 220ms ease",
            }}
          />
        ) : null}

        {video ? (
          <video
            src={video}
            autoPlay
            muted
            playsInline
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              if (!videoReady && v.currentTime >= 1) setVideoReady(true);
            }}
          />
        ) : null}

        {/* overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.35) 46%, rgba(0,0,0,0.10) 72%, rgba(0,0,0,0.00) 100%)",
          }}
        />

        {/* texto */}
        <div
          style={{
            position: "absolute",
            left: 18,
            right: 18,
            bottom: 18,
            zIndex: 4,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ color: "#fff", fontWeight: 950, fontSize: 22, lineHeight: 1.1 }}>
            {product.name}
          </div>

          {product.description ? (
            <div style={{ color: "rgba(255,255,255,0.80)", fontWeight: 700, fontSize: 13 }}>
              {product.description}
            </div>
          ) : null}

          <div style={{ color: "#fff", fontWeight: 950, fontSize: 26 }}>
           {product.price_type === "variable"
  ? "Preço variável"
  : product.price != null
    ? moneyBR(Number(product.price))
    : ""}
          </div>
          {/* hint de gestos */}
          <div style={{ color: "rgba(255,255,255,0.65)", fontWeight: 800, fontSize: 12 }}>
            swipe ←/→ para trocar • swipe ↑/↓ para fechar • toque fora para fechar
          </div>
        </div>
      </div>
    </div>
  );
}