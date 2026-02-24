"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Category, Product, Unit } from "./menuTypes";
import BottomGlassBar from "./BottomGlassBar";
import CategoryPillsTop from "./CategoryPillsTop";
import FeaturedCarousel from "./FeaturedCarousel";
import CategoryCarousel from "./CategoryCarousel";

function moneyBRL(value: number | null) {
  if (value == null || Number.isNaN(value)) return "";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type ModalState =
  | {
      list: Product[];
      index: number;
    }
  | null;

function normKey(v: string) {
  return (v ?? "").trim().toLowerCase();
}

function findFeaturedCategory(categories: Category[]): Category | null {
  if (!categories.length) return null;

  const byNameOrSlug = categories.find((c) => {
    const n = normKey(c.name);
    const s = normKey(c.slug ?? "");
    return n === "destaque" || s === "destaque";
  });

  return byNameOrSlug ?? categories[0] ?? null;
}

export default function MenuClient({
  unit,
  categories,
  products,
}: {
  unit: Unit;
  categories: Category[];
  products: Product[];
}) {
  const bg = "#0b0b0b";
  const text = "#fff";
  const bottomPad = 190;

  // só categorias que têm pelo menos 1 produto
  const visibleCategories = useMemo(() => {
    const has = new Set<string>();
    for (const p of products) has.add(p.category_id);
    return categories.filter((c) => has.has(c.id));
  }, [categories, products]);

  const grouped = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const c of visibleCategories) map.set(c.id, []);
    for (const p of products) {
      if (!map.has(p.category_id)) continue;
      map.get(p.category_id)!.push(p);
    }
    return map;
  }, [visibleCategories, products]);

  const featuredCategory = useMemo(
    () => findFeaturedCategory(visibleCategories),
    [visibleCategories]
  );
  const featuredId = featuredCategory?.id ?? "";

  const featuredItems = useMemo(() => {
    if (!featuredId) return [];
    return grouped.get(featuredId) ?? [];
  }, [grouped, featuredId]);

  const otherCategories = useMemo(() => {
    if (!featuredId) return visibleCategories;
    return visibleCategories.filter((c) => c.id !== featuredId);
  }, [visibleCategories, featuredId]);

  const pillsCategories = useMemo(() => {
    const arr: Category[] = [];
    if (featuredCategory) arr.push(featuredCategory);
    for (const c of otherCategories) arr.push(c);
    return arr;
  }, [featuredCategory, otherCategories]);

  // refs por seção pra scrollTo
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [activeCategoryId, setActiveCategoryId] = useState<string>(
    featuredId || otherCategories[0]?.id || ""
  );

  useEffect(() => {
    const next = featuredId || otherCategories[0]?.id || "";
    if (next && next !== activeCategoryId) setActiveCategoryId(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featuredId, otherCategories.length]);

  const [modal, setModal] = useState<ModalState>(null);

  // trava scroll do body quando abre modal
  useEffect(() => {
    if (!modal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [modal]);

  // categoria vigente via IntersectionObserver (sem onScroll setState)
  useEffect(() => {
    const ids = [featuredId, ...otherCategories.map((c) => c.id)].filter(Boolean);
    const els = ids
      .map((id) => sectionRefs.current[id])
      .filter(Boolean) as HTMLDivElement[];

    if (!els.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        const best = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0))[0];

        if (!best?.target) return;
        const foundId = ids.find((id) => sectionRefs.current[id] === best.target);
        if (foundId) setActiveCategoryId(foundId);
      },
      {
        root: null,
        threshold: [0.25, 0.4, 0.55],
        rootMargin: "-140px 0px -55% 0px",
      }
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [featuredId, otherCategories]);

  function scrollToCategory(id: string) {
    const el = sectionRefs.current[id];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (!visibleCategories.length) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: bg,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <main
          style={{
            width: "100%",
            maxWidth: 480,
            minHeight: "100vh",
            background: bg,
            color: text,
            display: "grid",
            placeItems: "center",
            padding: 20,
            textAlign: "center",
          }}
        >
          <div style={{ maxWidth: 420 }}>
            <div style={{ fontSize: 18, fontWeight: 950 }}>Cardápio</div>
            <div style={{ marginTop: 10, opacity: 0.7 }}>
              Ainda não há itens publicados neste cardápio.
            </div>
          </div>
        </main>
      </div>
    );
  }

  // CSS local: scrollbar invisível + remove highlight + animações premium do modal
  const css = [
    ".fy-scroll-x::-webkit-scrollbar{width:0;height:0;display:none;}",
    ".fy-scroll-x{scrollbar-width:none;-ms-overflow-style:none;}",
    ".fy-no-highlight,button,a{-webkit-tap-highlight-color:transparent;}",
    ".fy-no-highlight:focus,.fy-no-highlight:focus-visible,button:focus,button:focus-visible,a:focus,a:focus-visible{outline:none;}",
    "@keyframes fyModalIn{0%{transform:scale(.92);opacity:0;}100%{transform:scale(1);opacity:1;}}",
    "@keyframes fyModalOut{0%{transform:scale(1);opacity:1;}100%{transform:scale(.92);opacity:0;}}",
    "@keyframes fyBackdropIn{0%{opacity:0;}100%{opacity:1;}}",
    "@keyframes fyBackdropOut{0%{opacity:1;}100%{opacity:0;}}",
  ].join("\n");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: bg,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <main
        style={{
          width: "100%",
          maxWidth: 480,
          minHeight: "100vh",
          background: bg,
          color: text,
          paddingBottom: bottomPad,
        }}
      >
        {/* ===== HEADER FIXO (pílulas) ===== */}
        <CategoryPillsTop
          categories={pillsCategories}
          activeCategoryId={activeCategoryId}
          onSelectCategory={(id) => {
            setActiveCategoryId(id);
            scrollToCategory(id);
          }}
        />

        {/* ===== CONTEÚDO ===== */}
        <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 22 }}>
          {/* ===== DESTAQUE ===== */}
          {featuredCategory && (
            <div
              ref={(el) => {
                sectionRefs.current[featuredCategory.id] = el;
              }}
              style={{ scrollMarginTop: 140 }}
            >
              <FeaturedCarousel
  items={featuredItems}
  onOpen={(_, idx) =>
    setModal({ list: featuredItems, index: idx })
  }
              />
            </div>
          )}

          {/* ===== OUTRAS CATEGORIAS ===== */}
          {otherCategories.map((cat) => {
            const items = grouped.get(cat.id) ?? [];
            if (!items.length) return null;

            return (
              <div
                key={cat.id}
                ref={(el) => {
                  sectionRefs.current[cat.id] = el;
                }}
                style={{
                  scrollMarginTop: 140,
                  position: "relative",
                  paddingTop: 8,
                }}
              >
                {/* badge do meio (mantém seu estilo) */}
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: -2,
                    zIndex: 10,
                    display: "flex",
                    justifyContent: "center",
                    pointerEvents: "none",
                  }}
                >
                  <div
                    style={{
                      padding: "8px 14px",
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.90)",
                      color: "#0b0b0b",
                      fontWeight: 950,
                      fontSize: 13,
                      boxShadow: "0 10px 26px rgba(0,0,0,0.35)",
                    }}
                  >
                    {cat.name}
                  </div>
                </div>

                <CategoryCarousel
  items={items}
  onOpen={(_, idx) => setModal({ list: items, index: idx })}
/>
              </div>
            );
          })}
        </div>

        {/* ===== BARRA INFERIOR ===== */}
        <BottomGlassBar unit={unit} />

        {/* ===== MODAL ===== */}
        {modal && (
          <ProductModal
            list={modal.list}
            index={modal.index}
            onChangeIndex={(idx) => setModal({ list: modal.list, index: idx })}
            onClose={() => setModal(null)}
          />
        )}

        <style>{css}</style>
      </main>
    </div>
  );
}

function ProductModal({
  list,
  index,
  onChangeIndex,
  onClose,
}: {
  list: Product[];
  index: number;
  onChangeIndex: (idx: number) => void;
  onClose: () => void;
}) {
  const product = list[index];
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const cardRef = useRef<HTMLDivElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const closingRef = useRef(false);

  // abrir: autoplay dentro do modal (mutado)
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    v.muted = true;
    v.playsInline = true;

    try {
      v.currentTime = 0;
    } catch {}

    const p = v.play();
    if (p && typeof (p as any).catch === "function") {
      (p as any).catch(() => {});
    }
  }, [product?.id, product?.video_url]);

  function handleClose() {
    if (closingRef.current) return;
    closingRef.current = true;

    const card = cardRef.current;
    const backdrop = backdropRef.current;

    if (card) card.style.animation = "fyModalOut 200ms ease-in forwards";
    if (backdrop) backdrop.style.animation = "fyBackdropOut 200ms ease-in forwards";

    setTimeout(() => onClose(), 180);
  }

  // swipe gestures (↑/↓ fecha, ←/→ troca)
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const TH_X = 70;
  const TH_Y = 70;

  function begin(x: number, y: number) {
    startRef.current = { x, y };
  }
  function end(x: number, y: number) {
    const s = startRef.current;
    startRef.current = null;
    if (!s) return;

    const dx = x - s.x;
    const dy = y - s.y;

    const ax = Math.abs(dx);
    const ay = Math.abs(dy);

    if (ay > TH_Y && ay > ax) {
      handleClose();
      return;
    }

    if (ax > TH_X && ax > ay) {
      if (dx < 0) onChangeIndex(Math.min(list.length - 1, index + 1));
      else onChangeIndex(Math.max(0, index - 1));
    }
  }

  function onPointerDownCapture(e: React.PointerEvent) {
    begin(e.clientX, e.clientY);
  }
  function onPointerUpCapture(e: React.PointerEvent) {
    end(e.clientX, e.clientY);
  }
  function onTouchStartCapture(e: React.TouchEvent) {
    const t = e.touches[0];
    if (!t) return;
    begin(t.clientX, t.clientY);
  }
  function onTouchEndCapture(e: React.TouchEvent) {
    const t = e.changedTouches[0];
    if (!t) return;
    end(t.clientX, t.clientY);
  }

  // ESC + setas
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
      if (e.key === "ArrowLeft") onChangeIndex(Math.max(0, index - 1));
      if (e.key === "ArrowRight") onChangeIndex(Math.min(list.length - 1, index + 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, list.length, onChangeIndex]);

  const priceText = product.price != null ? moneyBRL(product.price) : "Consultar";
  const counter = `${index + 1}/${list.length}`;

  return (
    <div
      ref={backdropRef}
      onClick={handleClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        zIndex: 100,
        display: "grid",
        placeItems: "center",
        padding: 16,
        animation: "fyBackdropIn 220ms ease-out",
      }}
    >
      <div
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
        onPointerDownCapture={onPointerDownCapture}
        onPointerUpCapture={onPointerUpCapture}
        onTouchStartCapture={onTouchStartCapture}
        onTouchEndCapture={onTouchEndCapture}
        style={{
          width: "min(90vw, 380px)", // ✅ ~10% menor + sobra overlay clicável
          aspectRatio: "9 / 16",
          borderRadius: 28,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(20,20,20,0.90)",
          overflow: "hidden",
          position: "relative",
          animation: "fyModalIn 260ms cubic-bezier(.22,.9,.3,1)",
          transformOrigin: "center center",
          touchAction: "pan-y pan-x",
        }}
      >
        <button
          onClick={handleClose}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            padding: "8px 12px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.10)",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 900,
            zIndex: 5,
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            outline: "none",
          }}
        >
          Fechar
        </button>

        <div
          style={{
            position: "absolute",
            left: 14,
            top: 14,
            zIndex: 6,
            fontSize: 12,
            fontWeight: 900,
            padding: "6px 10px",
            borderRadius: 999,
            background: "rgba(0,0,0,0.35)",
            border: "1px solid rgba(255,255,255,0.10)",
            color: "rgba(255,255,255,0.90)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
        >
          {counter}
        </div>

        <div style={{ position: "absolute", inset: 0, background: "#000" }}>
          {product.video_url ? (
            <video
              key={product.video_url}
              ref={videoRef}
              src={product.video_url}
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              controls={false}
              poster={product.image_url || undefined}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt={product.name}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
                opacity: 0.65,
              }}
            >
              Sem mídia
            </div>
          )}

          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.00) 30%, rgba(0,0,0,0.70) 70%, rgba(0,0,0,0.92) 100%)",
            }}
          />

          <div
            style={{
              position: "absolute",
              left: 18,
              right: 18,
              bottom: 18,
              textAlign: "center",
            }}
          >
            <div style={{ fontWeight: 950, fontSize: 20 }}>{product.name}</div>

            {!!product.description && (
              <div style={{ marginTop: 8, opacity: 0.9, fontSize: 13 }}>
                {product.description}
              </div>
            )}

            <div style={{ marginTop: 10, fontSize: 20, fontWeight: 950 }}>
              {priceText}
            </div>

            {product.variations?.length ? (
              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 8,
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                {product.variations.map((v) => (
                  <div
                    key={v.id}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.06)",
                      color: "#fff",
                      fontWeight: 900,
                      fontSize: 12,
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      opacity: 0.92,
                    }}
                  >
                    <span>{v.name}</span>
                    <span style={{ opacity: 0.85 }}>{moneyBRL(v.price)}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {/* ✅ dica/ajuda voltou */}
            <div style={{ marginTop: 12, fontSize: 12, opacity: 0.82 }}>
              swipe ←/→ para trocar • swipe ↑/↓ para fechar • toque fora para fechar
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}