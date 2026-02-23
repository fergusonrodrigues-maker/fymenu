"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import BottomGlassBar from "./BottomGlassBar";

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

  // suportar futuro (sem exigir existir agora)
  city?: string;
  neighborhood?: string;
};

type Category = {
  id: string;
  name: string;
  type: string;
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

function normalizeInstagram(instagram: string) {
  const v = (instagram ?? "").trim();
  if (!v) return "";
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  const handle = v.replace("@", "").trim();
  if (!handle) return "";
  return `https://instagram.com/${handle}`;
}

function mapsFromAddress(address: string) {
  const v = (address ?? "").trim();
  if (!v) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v)}`;
}

function normalizeWhatsappToWaMe(phone: string) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return "";
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}`;
}

function getMinVariationPrice(p: Product): number | null {
  const vars = (p.variations ?? []).filter((v) => Number.isFinite(v.price));
  if (!vars.length) return null;
  let min = vars[0].price;
  for (const v of vars) if (v.price < min) min = v.price;
  return min;
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
  const grouped = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const c of categories) map.set(c.id, []);
    for (const p of products) {
      if (!map.has(p.category_id)) map.set(p.category_id, []);
      map.get(p.category_id)!.push(p);
    }
    return map;
  }, [categories, products]);

  const visibleCategories = useMemo(() => {
    const has = new Set<string>();
    for (const p of products) has.add(p.category_id);
    return categories.filter((c) => has.has(c.id));
  }, [categories, products]);

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const chipBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const chipsWrapRef = useRef<HTMLDivElement | null>(null);

  const [activeCatId, setActiveCatId] = useState<string>(visibleCategories[0]?.id ?? "");
  const [modal, setModal] = useState<ModalState>(null);

  // ===== Debug (?debug=1) =====
  const [debugOn, setDebugOn] = useState(false);
  const [debugScrollLeft, setDebugScrollLeft] = useState(0);
  const [debugSnap, setDebugSnap] = useState<"ON" | "OFF">("ON");

  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      setDebugOn(p.get("debug") === "1");
    } catch {
      setDebugOn(false);
    }
  }, []);

  useEffect(() => {
    if (!visibleCategories.length) return;
    if (!activeCatId || !visibleCategories.some((c) => c.id === activeCatId)) {
      setActiveCatId(visibleCategories[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleCategories]);

  useEffect(() => {
    if (!modal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [modal]);

  // ===== Chips: mantém o chip ativo centralizado (apenas programático) =====
  useEffect(() => {
    const btn = chipBtnRefs.current[activeCatId];
    if (!btn) return;
    btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeCatId]);

  // ===== Chips: ao parar o scroll horizontal, escolhe o chip mais central =====
  useEffect(() => {
    const wrap = chipsWrapRef.current;
    if (!wrap) return;

    let t: any = null;

    const pickCenterChip = () => {
      const rect = wrap.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;

      let bestId = "";
      let bestDist = Infinity;

      for (const c of visibleCategories) {
        const btn = chipBtnRefs.current[c.id];
        if (!btn) continue;
        const r = btn.getBoundingClientRect();
        const mid = r.left + r.width / 2;
        const dist = Math.abs(centerX - mid);
        if (dist < bestDist) {
          bestDist = dist;
          bestId = c.id;
        }
      }

      if (bestId) {
        setActiveCatId(bestId);
        const el = sectionRefs.current[bestId];
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };

    const onScroll = () => {
      if (t) clearTimeout(t);
      t = setTimeout(pickCenterChip, 140);

      if (debugOn) {
        setDebugScrollLeft(wrap.scrollLeft);
      }
    };

    wrap.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (t) clearTimeout(t);
      wrap.removeEventListener("scroll", onScroll);
    };
  }, [visibleCategories, debugOn]);

  const bg = "#0b0b0b";
  const glass = "rgba(255,255,255,0.06)";
  const border = "rgba(255,255,255,0.12)";
  const text = "#fff";

  // ⚠️ padding bottom maior pra não cobrir conteúdo com a nova barra (2 camadas)
  const bottomPad = 190;

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

  return (
    <main
      style={{
        minHeight: "100vh",
        background: bg,
        color: text,
        paddingBottom: bottomPad,
      }}
    >
      {/* HEADER */}
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
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "44px 1fr 44px",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              background: glass,
              border: `1px solid ${border}`,
              display: "grid",
              placeItems: "center",
              fontWeight: 900,
              overflow: "hidden",
            }}
          >
            {unit.logo_url ? (
              <img
                src={unit.logo_url}
                alt="Logo"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              "U"
            )}
          </div>

          <div style={{ textAlign: "center", lineHeight: 1.05 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>{unit.name || "Cardápio"}</div>
            <div style={{ opacity: 0.65, fontSize: 12 }}>{unit.slug || "Unidade"}</div>
          </div>

          <div />
        </div>

        {/* Chips (categorias) */}
        <div
          ref={chipsWrapRef}
          className="fy-scroll-x"
          style={{
            marginTop: 10,
            display: "flex",
            gap: 10,
            overflowX: "auto",
            paddingBottom: 8,
            paddingTop: 2,
            WebkitOverflowScrolling: "touch",
            paddingLeft: 18,
            paddingRight: 18,
            scrollPaddingLeft: 60,
            scrollPaddingRight: 60,
            overscrollBehaviorX: "contain",
            touchAction: "pan-x",
          }}
        >
          {visibleCategories.map((c) => {
            const active = c.id === activeCatId;
            return (
              <button
                key={c.id}
                ref={(el) => {
                  chipBtnRefs.current[c.id] = el;
                }}
                onClick={() => {
                  setActiveCatId(c.id);
                  const el = sectionRefs.current[c.id];
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                style={{
                  border: `1px solid ${
                    active ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.10)"
                  }`,
                  background: active ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.03)",
                  color: "#fff",
                  padding: active ? "10px 16px" : "9px 14px",
                  borderRadius: 999,
                  fontWeight: 800,
                  fontSize: 13,
                  whiteSpace: "nowrap",
                  opacity: active ? 1 : 0.72,
                  transform: active ? "scale(1.04)" : "scale(0.98)",
                  transition: "transform 160ms ease, opacity 160ms ease, background 160ms ease",
                  outline: "none",
                }}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTEÚDO */}
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 26 }}>
        {visibleCategories.map((cat) => {
          const items = grouped.get(cat.id) ?? [];
          const isActive = cat.id === activeCatId;

          if (!items.length) return null;

          return (
            <div
              key={cat.id}
              ref={(el) => {
                sectionRefs.current[cat.id] = el;
              }}
              style={{ scrollMarginTop: 140 }}
            >
              <div
                style={{
                  textAlign: "center",
                  fontWeight: 900,
                  fontSize: 28,
                  marginTop: 2,
                  marginBottom: 12,
                  opacity: isActive ? 0 : 0.55,
                  transform: isActive ? "translateY(-6px)" : "translateY(0px)",
                  transition: "opacity 240ms ease, transform 240ms ease",
                  pointerEvents: "none",
                }}
              >
                {cat.name}
              </div>

              <HorizontalProducts
                items={items}
                variant={isActive ? "active" : "inactive"}
                debugOn={debugOn}
                onDebugSnap={(v) => setDebugSnap(v)}
                onOpen={(p, index) => {
                  setModal({ list: items, index });
                }}
              />
            </div>
          );
        })}
      </div>

      {/* ✅ NOVA BARRA INFERIOR (Liquid Glass Dark) */}
      <BottomGlassBar unit={unit} />

      {/* MODAL */}
      {modal && (
        <ProductModal
          list={modal.list}
          index={modal.index}
          onChangeIndex={(idx) => setModal({ list: modal.list, index: idx })}
          onClose={() => setModal(null)}
        />
      )}

      {/* DEBUG overlay */}
      {debugOn && (
        <div
          style={{
            position: "fixed",
            top: 10,
            right: 10,
            zIndex: 200,
            padding: "8px 10px",
            borderRadius: 12,
            background: "rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,255,255,0.10)",
            backdropFilter: "blur(10px)",
            color: "rgba(255,255,255,0.92)",
            fontSize: 12,
            fontWeight: 800,
            pointerEvents: "none",
          }}
        >
          <div>debug=1</div>
          <div>chips scrollLeft: {Math.round(debugScrollLeft)}</div>
          <div>snapX: {debugSnap}</div>
        </div>
      )}

      {/* ✅ CSS: esconder scrollbars/indicadores e remover highlight */}
      <style>{`
        /* esconder scrollbar (webKit) */
        .fy-scroll-x::-webkit-scrollbar {
          width: 0px;
          height: 0px;
          display: none;
        }

        /* firefox / edge */
        .fy-scroll-x {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        /* tirar "tap highlight" e foco feio */
        button, a {
          -webkit-tap-highlight-color: transparent;
        }
        button:focus, button:focus-visible, a:focus, a:focus-visible {
          outline: none;
        }
      `}</style>
    </main>
  );
}

function HorizontalProducts({
  items,
  variant,
  onOpen,
  debugOn,
  onDebugSnap,
}: {
  items: Product[];
  variant: "active" | "inactive";
  onOpen: (p: Product, index: number) => void;
  debugOn: boolean;
  onDebugSnap: (v: "ON" | "OFF") => void;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  // ✅ Fix travadinha:
  // - Snap "proximity" (não mandatory)
  // - Desliga snap durante drag (pointer/touch), reativa ao soltar
  const [snapEnabled, setSnapEnabled] = useState(true);
  const draggingRef = useRef(false);

  useEffect(() => {
    onDebugSnap(snapEnabled ? "ON" : "OFF");
  }, [snapEnabled, onDebugSnap]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const cards = () => Array.from(el.querySelectorAll<HTMLElement>("[data-card='1']"));

    let raf = 0;

    const update = () => {
      raf = 0;

      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;

      for (const c of cards()) {
        const r = c.getBoundingClientRect();
        const cardCenter = r.left + r.width / 2;
        const dist = Math.abs(centerX - cardCenter);
        const max = rect.width * 0.55;
        const t = Math.max(0, 1 - dist / max);

        const base = variant === "active" ? 0.93 : 0.82;
        const grow = variant === "active" ? 0.12 : 0.06;

        const scale = base + t * grow;
        const alpha =
          (variant === "active" ? 0.72 : 0.48) + t * (variant === "active" ? 0.28 : 0.24);

        c.style.transform = `translateZ(0) scale(${scale})`;
        c.style.opacity = String(alpha);
      }
    };

    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };

    requestAnimationFrame(() => {
      const first = cards()[0];
      if (first) {
        el.scrollLeft = Math.max(
          0,
          first.offsetLeft - el.clientWidth / 2 + first.clientWidth / 2
        );
      }
      update();
    });

    const onScroll = () => {
      schedule();
      if (debugOn) {
        // logs leves
        // eslint-disable-next-line no-console
        console.log("[scrollX]", { scrollLeft: Math.round(el.scrollLeft), snapEnabled });
      }
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", schedule);
    };
  }, [variant, debugOn, snapEnabled]);

  function dragStart() {
    draggingRef.current = true;
    setSnapEnabled(false);
    if (debugOn) console.log("[drag start]");
  }

  function dragEnd() {
    draggingRef.current = false;
    // reativa snap no próximo tick (deixa o gesto terminar)
    setTimeout(() => setSnapEnabled(true), 0);
    if (debugOn) console.log("[drag end]");
  }

  const W = variant === "active" ? 250 : 180;

  return (
    <div
      ref={scrollerRef}
      className="fy-scroll-x"
      onPointerDownCapture={dragStart}
      onPointerUpCapture={dragEnd}
      onPointerCancel={dragEnd}
      onTouchStartCapture={dragStart}
      onTouchEndCapture={dragEnd}
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: variant === "active" ? 14 : 10,
        overflowX: "auto",
        paddingTop: 14,
        paddingBottom: 12,
        WebkitOverflowScrolling: "touch",
        paddingLeft: variant === "active" ? 26 : 18,
        paddingRight: variant === "active" ? 26 : 18,
        overscrollBehaviorX: "contain",
        touchAction: "pan-x",

        // ✅ snap controlado (resolve engasgo)
        scrollSnapType: snapEnabled ? "x proximity" : "none",
      }}
    >
      {items.map((p, idx) => {
        const minVar = p.price_type === "variable" ? getMinVariationPrice(p) : null;
        const priceLabel =
          p.price_type === "fixed"
            ? moneyBR(p.base_price)
            : minVar !== null
              ? `A partir de ${moneyBR(minVar)}`
              : "Preço variável";

        return (
          <button
            key={p.id}
            data-card="1"
            onClick={() => onOpen(p, idx)}
            style={{
              minWidth: W,
              maxWidth: W,
              borderRadius: 22,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              overflow: "hidden",
              padding: 0,
              textAlign: "center",
              color: "#fff",
              cursor: "pointer",
              transition: "transform 140ms ease, opacity 140ms ease",
              scrollSnapAlign: "center",
              willChange: "transform, opacity",
              transform: "translateZ(0)",
              outline: "none",
            }}
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "9 / 16",
                background: "rgba(255,255,255,0.06)",
              }}
            >
              {p.thumbnail_url ? (
                <img
                  src={p.thumbnail_url}
                  alt={p.name}
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
                    opacity: 0.55,
                    fontSize: 12,
                  }}
                >
                  sem foto
                </div>
              )}

              {/* ✅ degradê (não mexer) */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(rgba(0,0,0,0.00) 35%, rgba(0,0,0,0.70) 78%, rgba(0,0,0,0.88) 100%)",
                }}
              />

              <div style={{ position: "absolute", left: 14, right: 14, bottom: 14 }}>
                <div
                  style={{
                    fontWeight: 950,
                    fontSize: 16,
                    lineHeight: 1.05,
                    textShadow: "0 1px 8px rgba(0,0,0,0.6)",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {p.name}
                </div>

                {!!p.description && (
                  <div
                    style={{
                      marginTop: 6,
                      opacity: 0.85,
                      fontSize: 12,
                      lineHeight: 1.2,
                      textShadow: "0 1px 8px rgba(0,0,0,0.6)",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {p.description}
                  </div>
                )}

                <div style={{ marginTop: 8, fontWeight: 950, fontSize: 16 }}>{priceLabel}</div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ---- Modal (mantido igual ao seu; só colei o que você já tinha) ----

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
          ? `A partir de ${moneyBR(getMinVariationPrice(product) ?? 0)}`
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
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            padding: "6px 10px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.10)",
            border: "1px solid rgba(255,255,255,0.14)",
            backdropFilter: "blur(10px)",
            fontSize: 12,
            fontWeight: 900,
            zIndex: 5,
          }}
        >
          {index + 1}/{list.length}
        </div>

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
            <div
              style={{
                fontWeight: 950,
                fontSize: 20,
                lineHeight: 1.05,
                textShadow: "0 1px 10px rgba(0,0,0,0.65)",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {product.name}
            </div>

            {!!product.description && (
              <div
                style={{
                  marginTop: 8,
                  opacity: 0.9,
                  fontSize: 13,
                  lineHeight: 1.25,
                  textShadow: "0 1px 10px rgba(0,0,0,0.65)",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {product.description}
              </div>
            )}

            <div style={{ marginTop: 10, fontSize: 20, fontWeight: 950 }}>{displayPrice}</div>

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

            <div style={{ marginTop: 10, opacity: 0.6, fontSize: 12 }}>
              Dica: swipe ← → para trocar • swipe ↑↓ ou toque fora para fechar
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fymenuFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes fymenuPop { from { transform: scale(.94); opacity: 0.6 } to { transform: scale(1); opacity: 1 } }
      `}</style>
    </div>
  );
}