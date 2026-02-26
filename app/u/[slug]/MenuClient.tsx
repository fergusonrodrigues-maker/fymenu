// FILE: /app/u/[slug]/MenuClient.tsx
// ACTION: REPLACE ENTIRE FILE

"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { CategoryWithProducts, Product } from "./menuTypes";
import CategoryPillsTop from "./CategoryPillsTop";
import FeaturedCarousel from "./FeaturedCarousel";
import CategoryCarousel from "./CategoryCarousel";

type Props = {
  categories: CategoryWithProducts[];
};

function moneyBR(v: number) {
  return `R$ ${v.toFixed(2).replace(".", ",")}`;
}

export default function MenuClient({ categories }: Props) {
  const orderedCategories = useMemo(() => {
    const arr = categories ?? [];
    return [...arr].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  }, [categories]);

  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(
    orderedCategories[0]?.id ?? null
  );

  // modal board
  const [modal, setModal] = useState<null | { list: Product[]; index: number }>(null);

  // mantém activeCategoryId válido
  useEffect(() => {
    if (!activeCategoryId && orderedCategories[0]?.id) setActiveCategoryId(orderedCategories[0].id);
  }, [activeCategoryId, orderedCategories]);

  // seleção pelo topo (scroll vertical ainda é “padrão” — se você já tem anchors, plugamos depois)
  const onSelectCategory = (categoryId: string) => {
    setActiveCategoryId(categoryId);
    // Se você tiver IDs/anchors por categoria, amanhã plugamos scroll suave aqui.
  };

  // categoria 1 = destaque
  const featuredCategory = orderedCategories[0] ?? null;
  const otherCategories = featuredCategory ? orderedCategories.slice(1) : orderedCategories;

  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "#000" }}>
      {/* Topo pills */}
      <CategoryPillsTop
        categories={orderedCategories}
        activeCategoryId={activeCategoryId}
        onSelect={onSelectCategory}
      />

      <div style={{ paddingBottom: 24 }}>
        {/* Destaque (sem texto "Destaque" fixo) */}
        {featuredCategory ? (
          <div style={{ paddingTop: 8 }}>
            <FeaturedCarousel
              items={featuredCategory.products}
              onOpen={(p, idx) => setModal({ list: featuredCategory.products, index: idx })}
            />
          </div>
        ) : null}

        {/* Demais categorias */}
        {otherCategories.map((cat) => (
          <div key={cat.id} style={{ paddingTop: 10 }}>
            {/* pill por categoria dentro do feed (você pode remover depois) */}
            <div style={{ display: "flex", justifyContent: "center", padding: "6px 0 0" }}>
              <div
                style={{
                  padding: "10px 18px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.85)",
                  color: "#111",
                  fontWeight: 900,
                  fontSize: 16,
                }}
              >
                {cat.name}
              </div>
            </div>

            <CategoryCarousel
              items={cat.products}
              compact={true}
              onOpen={(p, idx) => setModal({ list: cat.products, index: idx })}
            />
          </div>
        ))}
      </div>

      {/* MODAL / BOARD */}
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

  useEffect(() => {
    setVideoReady(false);
  }, [index]);

  if (!product) return null;

  const video = product.video_url ?? null;
  const thumb = product.thumbnail_url ?? null;

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
        style={{
          width: "min(520px, 92vw)",
          aspectRatio: "9 / 16",
          borderRadius: 28,
          border: "1px solid rgba(255,255,255,0.10)",
          overflow: "hidden",
          position: "relative",
          background: "#000",
          boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
        }}
      >
        {/* contador (volta o 2/10) */}
        <div
          style={{
            position: "absolute",
            top: 14,
            left: 18,
            zIndex: 5,
            fontSize: 12,
            fontWeight: 900,
            opacity: 0.75,
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

        {/* Thumb (some 100% após 1s de vídeo) */}
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
              transition: "opacity 240ms ease",
            }}
          />
        ) : null}

        {/* vídeo */}
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
              opacity: 1,
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
        </div>

        {/* navegação (simples) */}
        <div
          style={{
            position: "absolute",
            left: 12,
            right: 12,
            bottom: 12,
            zIndex: 6,
            display: "flex",
            justifyContent: "space-between",
            pointerEvents: "none",
          }}
        >
          <button
            onClick={() => onIndexChange(Math.max(0, index - 1))}
            style={{
              pointerEvents: "auto",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(0,0,0,0.25)",
              color: "rgba(255,255,255,0.92)",
              padding: "10px 14px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            ◀
          </button>

          <button
            onClick={() => onIndexChange(Math.min(list.length - 1, index + 1))}
            style={{
              pointerEvents: "auto",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(0,0,0,0.25)",
              color: "rgba(255,255,255,0.92)",
              padding: "10px 14px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            ▶
          </button>
        </div>
      </div>
    </div>
  );
}