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
  const bg = "#0b0b0b";
  const text = "#fff";

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

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [activeCategoryId, setActiveCategoryId] = useState<string>(
    featuredId || otherCategories[0]?.id || ""
  );

  // evita “brigar” durante scroll programático do clique
  const programmaticScrollRef = useRef(false);
  const programmaticTimerRef = useRef<any>(null);

  const [modal, setModal] = useState<ModalState>(null);

  // quando featured muda, garante activeCategoryId = featured
  useEffect(() => {
    const next = featuredId || otherCategories[0]?.id || "";
    if (!next) return;
    setActiveCategoryId(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featuredId, otherCategories.length]);

  // trava body quando modal abre
  useEffect(() => {
    if (!modal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [modal]);

  // ✅ vigência estável: usa “ponto âncora” abaixo do header (não por ratio)
  useEffect(() => {
    const ids = [featuredId, ...otherCategories.map((c) => c.id)].filter(Boolean);
    const els = ids
      .map((id) => sectionRefs.current[id])
      .filter(Boolean) as HTMLDivElement[];

    if (!els.length) return;

    const HEADER_ANCHOR_Y = 155; // ponto abaixo do topo (ajuste fino)

    const io = new IntersectionObserver(
      (entries) => {
        if (programmaticScrollRef.current) return;

        const visible = entries.filter((e) => e.isIntersecting);
        if (!visible.length) return;

        let best = visible[0];
        let bestDist = Infinity;

        for (const e of visible) {
          const rect = (e.target as HTMLElement).getBoundingClientRect();
          const dist = Math.abs(rect.top - HEADER_ANCHOR_Y);
          if (dist < bestDist) {
            bestDist = dist;
            best = e;
          }
        }

        const foundId = ids.find((id) => sectionRefs.current[id] === best.target);
        if (foundId) setActiveCategoryId(foundId);
      },
      {
        root: null,
        threshold: [0.01, 0.1, 0.2],
        rootMargin: "-140px 0px -70% 0px",
      }
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [featuredId, otherCategories]);

  function scrollToCategory(id: string) {
    const el = sectionRefs.current[id];
    if (!el) return;

    // marca como scroll programático para não “voltar pro 1”
    programmaticScrollRef.current = true;
    if (programmaticTimerRef.current) clearTimeout(programmaticTimerRef.current);

    // scroll suave só em clique
    el.scrollIntoView({ behavior: "smooth", block: "start" });

    programmaticTimerRef.current = setTimeout(() => {
      programmaticScrollRef.current = false;
    }, 520);
  }

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

  // padding bottom para a BottomGlassBar não cobrir
  const bottomPad = 190;

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
          overscrollBehaviorY: "auto",
        }}
      >
        {/* ===== HEADER FIXO (somente pílulas) ===== */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            padding: "14px 14px 10px",
            backdropFilter: "blur(16px)",
            // ✅ sem linha/corte: gradiente suave até transparente
            background:
              "linear-gradient(rgba(11,11,11,0.92) 0%, rgba(11,11,11,0.78) 55%, rgba(11,11,11,0.00) 100%)",
            borderBottom: "none",
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

        {/* ===== CONTEÚDO ===== */}
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
                onOpen={(p, idx) => setModal({ list: featuredItems, index: idx })}
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
                style={{ scrollMarginTop: 140 }}
              >
                <CategoryCarousel
                  title={cat.name}
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

        {/* helpers visuais */}
        <style>{`
          .fy-scroll-x::-webkit-scrollbar { width: 0px; height: 0px; display: none; }
          .fy-scroll-x { scrollbar-width: none; -ms-overflow-style: none; }
          .fy-no-highlight, button, a { -webkit-tap-highlight-color: transparent; }
          .fy-no-highlight:focus, .fy-no-highlight:focus-visible,
          button:focus, button:focus-visible, a:focus, a:focus-visible { outline: none; }
        `}</style>
      </main>
    </div>
  );
}

/* ===== Modal (mantido do seu padrão) ===== */

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
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 26,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(20,20,20,0.88)",
          overflow: "hidden",
          aspectRatio: "9 / 16",
          position: "relative",
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

          <div
            style={{
              position: "absolute",
              left: 18,
              right: 18,
              bottom: 18,
              textAlign: "center",
              color: "#fff",
            }}
          >
            <div style={{ fontWeight: 950, fontSize: 20 }}>{product.name}</div>

            {!!product.description && (
              <div style={{ marginTop: 8, opacity: 0.9, fontSize: 13 }}>
                {product.description}
              </div>
            )}

            <div style={{ marginTop: 10, fontSize: 20, fontWeight: 950 }}>
              {displayPrice}
            </div>

            {product.price_type === "variable" && vars.length > 0 && (
              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  gap: 8,
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                {vars.map((v) => {
                  const active = v.id === selectedVarId;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVarId(v.id)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 999,
                        border: `1px solid ${
                          active ? "rgba(255,255,255,0.26)" : "rgba(255,255,255,0.12)"
                        }`,
                        background: active
                          ? "rgba(255,255,255,0.12)"
                          : "rgba(255,255,255,0.06)",
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