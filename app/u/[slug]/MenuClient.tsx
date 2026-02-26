// FILE: /app/u/[slug]/MenuClient.tsx
// ACTION: REPLACE ENTIRE FILE

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

  const [modal, setModal] = useState<null | { list: Product[]; index: number; categoryName?: string }>(
    null
  );

  useEffect(() => {
    if (!activeCategoryId && orderedCategories[0]?.id) setActiveCategoryId(orderedCategories[0].id);
  }, [activeCategoryId, orderedCategories]);

  const onSelectCategory = (categoryId: string) => {
    setActiveCategoryId(categoryId);
    // amanhã: plugar scroll suave/anchor por categoria
  };

  // categoria 1 = destaque (mantém como estava)
  const featuredCategory = orderedCategories[0] ?? null;
  const otherCategories = featuredCategory ? orderedCategories.slice(1) : orderedCategories;

  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "#000" }}>
      {/* Topo (título + pills) */}
      <div style={{ paddingTop: 10 }}>
        <div style={{ padding: "10px 16px 0" }}>
          <div style={{ color: "#fff", fontWeight: 950, fontSize: 22, lineHeight: 1.1 }}>
            {unit?.name ?? ""}
          </div>
          <div style={{ color: "rgba(255,255,255,0.70)", fontWeight: 750, fontSize: 13, marginTop: 4 }}>
            {(unit?.city ?? "")}
            {unit?.neighborhood ? ` • ${unit.neighborhood}` : ""}
          </div>
        </div>

        <CategoryPillsTop
  unit={unit}
  categories={orderedCategories}
  activeCategoryId={activeCategoryId}
  onSelect={onSelectCategory}
/>
      </div>

      <div style={{ paddingBottom: 90 }}>
        {/* Destaque */}
        {featuredCategory ? (
          <div style={{ paddingTop: 8 }}>
            <FeaturedCarousel
              items={featuredCategory.products}
              onOpen={(_p, idx) =>
                setModal({ list: featuredCategory.products, index: idx, categoryName: featuredCategory.name })
              }
            />
          </div>
        ) : null}

        {/* Demais categorias */}
        {otherCategories.map((cat) => (
          <div key={cat.id} style={{ paddingTop: 10 }}>
            {/* ✅ REMOVIDO o “header/pill” que criava a faixa preta */}
            {/* Agora o label vira OVERLAY dentro do container do carrossel */}
            <div style={{ position: "relative" }}>
              <div
                style={{
                  position: "absolute",
                  top: 10,
                  left: 0,
                  right: 0,
                  display: "flex",
                  justifyContent: "center",
                  zIndex: 3,
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    padding: "10px 18px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.85)",
                    color: "#111",
                    fontWeight: 900,
                    fontSize: 16,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
                  }}
                >
                  {cat.name}
                </div>
              </div>

              <CategoryCarousel
                items={cat.products}
                compact={true}
                onOpen={(_p, idx) => setModal({ list: cat.products, index: idx, categoryName: cat.name })}
              />
            </div>
          </div>
        ))}
      </div>

      {/* ✅ GLASS BAR (voltou) */}
      <GlassBar unit={unit} />

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

function GlassBar({ unit }: { unit: Unit }) {
  const cityLine =
    (unit?.city ?? "") + (unit?.neighborhood ? ` • ${unit.neighborhood}` : "");

  const links = [
    unit?.instagram ? { label: "Instagram", href: unit.instagram } : null,
    unit?.maps_url ? { label: "Maps", href: unit.maps_url } : null,
    unit?.whatsapp ? { label: "WhatsApp", href: unit.whatsapp } : null,
  ].filter(Boolean) as { label: string; href: string }[];

  return (
    <div
      style={{
        position: "fixed",
        left: 12,
        right: 12,
        bottom: 12,
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        pointerEvents: "none",
      }}
    >
      {/* barra pequena */}
      <div
        style={{
          pointerEvents: "auto",
          height: 34,
          borderRadius: 999,
          background: "rgba(0,0,0,0.35)",
          border: "1px solid rgba(255,255,255,0.12)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 14px",
          color: "rgba(255,255,255,0.82)",
          fontWeight: 800,
          fontSize: 12,
        }}
      >
        {cityLine}
      </div>

      {/* barra maior */}
      <div
        style={{
          pointerEvents: "auto",
          height: 54,
          borderRadius: 18,
          background: "rgba(0,0,0,0.42)",
          border: "1px solid rgba(255,255,255,0.12)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 14px",
          gap: 10,
        }}
      >
        <div style={{ color: "rgba(255,255,255,0.90)", fontWeight: 950, fontSize: 12 }}>
          {unit?.name ?? ""}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noreferrer"
              style={{
                color: "rgba(255,255,255,0.92)",
                textDecoration: "none",
                fontWeight: 900,
                fontSize: 12,
                padding: "10px 12px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.08)",
              }}
            >
              {l.label}
            </a>
          ))}
        </div>
      </div>
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

  // ✅ swipe handlers
  const startRef = useRef<{ x: number; y: number; t: number } | null>(null);

  useEffect(() => {
    setVideoReady(false);
  }, [index]);

  if (!product) return null;

  const video = product.video_url ?? null;
  const thumb = product.thumbnail_url ?? null;

  const onPointerDown = (e: React.PointerEvent) => {
    startRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const s = startRef.current;
    startRef.current = null;
    if (!s) return;

    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;

    const adx = Math.abs(dx);
    const ady = Math.abs(dy);

    // thresholds
    const SWIPE_X = 40;
    const SWIPE_Y = 60;

    // vertical swipe => fechar
    if (ady > adx && ady >= SWIPE_Y) {
      onClose();
      return;
    }

    // horizontal swipe => trocar
    if (adx > ady && adx >= SWIPE_X) {
      if (dx < 0) onIndexChange(Math.min(list.length - 1, index + 1));
      else onIndexChange(Math.max(0, index - 1));
      return;
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
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
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

          {/* dica de navegação (sem setas) */}
          <div style={{ color: "rgba(255,255,255,0.65)", fontWeight: 800, fontSize: 12 }}>
            swipe ←/→ para trocar • swipe ↑/↓ para fechar • toque fora para fechar
          </div>
        </div>
      </div>
    </div>
  );
}