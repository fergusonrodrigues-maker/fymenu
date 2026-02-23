"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

import BottomGlassBar from "./BottomGlassBar";
import CategoryPillsTop from "./CategoryPillsTop";
import FeaturedCarousel from "./FeaturedCarousel";
import CategoryCarousel from "./CategoryCarousel";

type Variation = {
  id: string;
  product_id: string;
  name: string;
  price: number;
  order_index?: number;
};

type Unit = {
  id: string;
  name: string;
  address: string;
  instagram: string;
  slug: string;
  whatsapp: string;
  logo_url: string;
  city?: string;
  neighborhood?: string;
};

type Category = {
  id: string;
  name: string;
  type: string;
  slug?: string;
};

type Product = {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price_type: "fixed" | "variable";
  base_price: number;
  thumbnail_url: string;
  video_url: string;
  variations?: Variation[];
};

function moneyBR(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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

  const bySlugOrName = categories.find((c) => {
    const n = normKey(c.name);
    const s = normKey((c as any).slug ?? "");
    return n === "destaque" || s === "destaque";
  });

  return bySlugOrName ?? categories[0] ?? null;
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

  useEffect(() => {
    if (!modal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [modal]);

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

  const bottomPad = 190;
  const bg = "#0b0b0b";
  const text = "#fff";

  if (!visibleCategories.length) {
    return (
      <main
        style={{
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
    );
  }

  const pillsCategories = useMemo(() => {
    const arr: Category[] = [];
    if (featuredCategory) arr.push(featuredCategory);
    for (const c of otherCategories) arr.push(c);
    return arr;
  }, [featuredCategory, otherCategories]);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: bg,
        color: text,
        paddingBottom: bottomPad,
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          padding: "14px 14px 10px",
          backdropFilter: "blur(14px)",
          background:
            "linear-gradient(rgba(11,11,11,0.96) 0%, rgba(11,11,11,0.80) 55%, rgba(11,11,11,0.00) 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <CategoryPillsTop
          categories={pillsCategories}
          activeCategoryId={activeCategoryId}
          onSelectCategory={(id) => {
            setActiveCategoryId(id);
            scrollToCategory(id);
          }}
        />
      </div>

      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 22 }}>
        {featuredCategory && (
          <div
            ref={(el) => {
              sectionRefs.current[featuredCategory.id] = el;
            }}
            style={{ scrollMarginTop: 140 }}
          >
            <FeaturedCarousel
              items={featuredItems}
              onOpen={(p, originalIndex) =>
                setModal({ list: featuredItems, index: originalIndex })
              }
            />
          </div>
        )}

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
                compact={true}
                onOpen={(p, idx) => setModal({ list: items, index: idx })}
              />
            </div>
          );
        })}
      </div>

      <BottomGlassBar unit={unit} />

      {modal && (
        <ProductModal
          list={modal.list}
          index={modal.index}
          onChangeIndex={(idx) => setModal({ list: modal.list, index: idx })}
          onClose={() => setModal(null)}
        />
      )}

      <style>{`
        .fy-scroll-x::-webkit-scrollbar { width: 0px; height: 0px; display: none; }
        .fy-scroll-x { scrollbar-width: none; -ms-overflow-style: none; }
        .fy-no-highlight, button, a { -webkit-tap-highlight-color: transparent; }
        .fy-no-highlight:focus, .fy-no-highlight:focus-visible,
        button:focus, button:focus-visible, a:focus, a:focus-visible { outline: none; }
      `}</style>
    </main>
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

  const vars = useMemo(() => {
    const arr = (product.variations ?? []).slice();
    arr.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    return arr;
  }, [product.id, product.variations]);

  const [selectedVarId, setSelectedVarId] = useState<string>("");

  useEffect(() => {
    if (product.price_type !== "variable") {
      setSelectedVarId("");
      return;
    }
    const first = vars[0]?.id ?? "";
    setSelectedVarId(first);
  }, [product.id, product.price_type, vars]);

  const selectedVar = useMemo(() => {
    if (product.price_type !== "variable") return null;
    return vars.find((v) => v.id === selectedVarId) ?? null;
  }, [product.price_type, vars, selectedVarId]);

  const displayPrice =
    product.price_type === "fixed"
      ? moneyBR(product.base_price)
      : selectedVar
        ? moneyBR(selectedVar.price)
        : vars.length
          ? `A partir de ${moneyBR(Math.min(...vars.map((v) => v.price)))}`
          : "Preço variável";

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onChangeIndex(Math.max(0, index - 1));
      if (e.key === "ArrowRight") onChangeIndex(Math.min(list.length - 1, index + 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, list.length, onChangeIndex, onClose]);

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
      onClose();
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

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.60)",
        backdropFilter: "blur(10px)",
        zIndex: 100,
        display: "grid",
        placeItems: "center",
        padding: 16,
        animation: "fymenuFadeIn 160ms ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onPointerDownCapture={onPointerDownCapture}
        onPointerUpCapture={onPointerUpCapture}
        onTouchStartCapture={onTouchStartCapture}
        onTouchEndCapture={onTouchEndCapture}
        style={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 26,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(20,20,20,0.88)",
          overflow: "hidden",
          aspectRatio: "9 / 16",
          position: "relative",
          animation: "fymenuPop 220ms cubic-bezier(.2,.9,.2,1)",
          touchAction: "pan-y pan-x",
        }}
      >
        <button
          onClick={onClose}
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
            outline: "none",
          }}
        >
          Fechar
        </button>

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
              poster={product.thumbnail_url || undefined}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : product.thumbnail_url ? (
            <img
              src={product.thumbnail_url}
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

          <div style={{ position: "absolute", left: 18, right: 18, bottom: 18, textAlign: "center" }}>
            <div style={{ fontWeight: 950, fontSize: 20 }}>{product.name}</div>
            {!!product.description && (
              <div style={{ marginTop: 8, opacity: 0.9, fontSize: 13 }}>{product.description}</div>
            )}
            <div style={{ marginTop: 10, fontSize: 20, fontWeight: 950 }}>{displayPrice}</div>

            {product.price_type === "variable" && vars.length > 0 && (
              <div style={{ marginTop: 10, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                {vars.map((v) => {
                  const active = v.id === selectedVarId;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVarId(v.id)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 999,
                        border: `1px solid ${active ? "rgba(255,255,255,0.26)" : "rgba(255,255,255,0.12)"}`,
                        background: active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
                        color: "#fff",
                        cursor: "pointer",
                        fontWeight: 900,
                        fontSize: 12,
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        opacity: active ? 1 : 0.86,
                        outline: "none",
                      }}
                    >
                      <span>{v.name}</span>
                      <span style={{ opacity: 0.85 }}>{moneyBR(v.price)}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}