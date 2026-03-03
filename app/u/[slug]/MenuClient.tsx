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

  // Vigente: qual seção está em destaque visual (scale + pill fade)
  // Inicia null — o observer define ao scroll
  const [vigenteId, setVigenteId] = useState<string | null>(null);

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

  // Observer para efeito vigente: só a seção colada no topo (abaixo do PillTop) cresce
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const id = (visible[0].target as HTMLElement).dataset.categoryId;
          if (id) setVigenteId(id);
        }
      },
      { rootMargin: "-10% 0px -85% 0px", threshold: 0 }
    );
    sectionRefs.current.slice(1).forEach((el) => { if (el) observer.observe(el); });
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

      <div style={{ paddingTop: 52, paddingBottom: 120 }}>

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

        {otherCategories.map((cat, i) => {
          const isVigente = cat.id === vigenteId;
          return (
            <div
              key={cat.id}
              ref={(el) => { sectionRefs.current[i + 1] = el; }}
              data-category-id={cat.id}
              style={{
                position: "relative",
                width: "100%",
                marginTop: i === 0 ? 12 : 32,
                opacity: isVigente ? 1 : 0.72,
                transition: "opacity 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)",
              }}
            >
              {/* top: 10 compensa o crescimento scale(1.13) do card hero que expande para cima */}
              {/* Quando vigente: sobe e some. Quando não: aparece centralizado na borda */}
              <div style={{
                position: "absolute",
                top: 10,
                left: "50%",
                transform: isVigente ? "translate(-50%, -100%)" : "translate(-50%, -50%)",
                opacity: isVigente ? 0 : 1,
                pointerEvents: isVigente ? "none" : "auto",
                zIndex: 20,
                transition: "transform 0.4s ease-out, opacity 0.3s ease-out",
              }}>
                <span
                  ref={(el) => { pillSpanRefs.current[i] = el; }}
                  style={{
                    display: "inline-block",
                    background: "rgba(0,0,0,0.65)",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: 14,
                    borderRadius: 999,
                    minWidth: 100,
                    padding: "8px 24px",
                    textAlign: "center",
                    whiteSpace: "nowrap",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
                    transition: "opacity 0.2s ease-out",
                  }}
                >
                  {cat.name}
                </span>
              </div>

              <CategoryCarousel
                items={cat.products}
                compact={true}
                isVigente={isVigente}
                onOpen={(_, idx) => setModal({ list: cat.products, index: idx })}
              />
            </div>
          );
        })}
      </div>

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

const modalCss = `
  @keyframes modal-in {
    from { opacity: 0; transform: scale(0.82); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes modal-out {
    from { opacity: 1; transform: scale(1); }
    to   { opacity: 0; transform: scale(0.82); }
  }
  @keyframes slide-left-in {
    from { opacity: 0; transform: scale(0.88) translateX(80px); }
    to   { opacity: 1; transform: scale(1) translateX(0); }
  }
  @keyframes slide-right-in {
    from { opacity: 0; transform: scale(0.88) translateX(-80px); }
    to   { opacity: 1; transform: scale(1) translateX(0); }
  }
`;

function ProductBoardModal({
  list, index, onClose, onIndexChange,
}: {
  list: Product[]; index: number; onClose: () => void; onIndexChange: (i: number) => void;
}) {
  const [videoReady, setVideoReady] = useState(false);
  const [closing, setClosing] = useState(false);
  const [slideDir, setSlideDir] = useState<"left" | "right" | null>(null);
  const [displayIndex, setDisplayIndex] = useState(index);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => { setVideoReady(false); }, [displayIndex]);

  function goTo(next: number, dir: "left" | "right") {
    if (next < 0 || next > list.length - 1) return;
    setSlideDir(dir);
    setDisplayIndex(next);
    onIndexChange(next);
    setTimeout(() => setSlideDir(null), 380);
  }

  function handleClose() {
    setClosing(true);
    setTimeout(() => onClose(), 300);
  }

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    startRef.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const s = startRef.current; if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x, dy = t.clientY - s.y;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    if (ay > ax && ay > 55) { handleClose(); return; }
    if (ax > ay && ax > 45) {
      if (dx < 0) goTo(displayIndex + 1, "left");
      else goTo(displayIndex - 1, "right");
    }
  };

  const currentProduct = list[displayIndex];
  if (!currentProduct) return null;

  const video = currentProduct.video_url ?? null;
  const thumb = currentProduct.thumbnail_url ?? null;

  const slideAnim = slideDir === "left"
    ? "slide-left-in 360ms cubic-bezier(0.34,1.56,0.64,1) forwards"
    : slideDir === "right"
    ? "slide-right-in 360ms cubic-bezier(0.34,1.56,0.64,1) forwards"
    : undefined;

  return (
    <div
      onClick={handleClose}
      style={{
        position: "fixed", inset: 0, zIndex: 999,
        background: closing ? "rgba(0,0,0,0)" : "rgba(0,0,0,0.70)",
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 14,
        transition: "background 300ms ease",
        touchAction: "none",
      }}
    >
      <style>{modalCss}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          width: "min(460px, 82vw)",
          aspectRatio: "9/16",
          borderRadius: 28,
          overflow: "hidden",
          position: "relative",
          background: "#000",
          boxShadow: "0 30px 80px rgba(0,0,0,0.60)",
          touchAction: "pan-y pan-x",
          animation: closing
            ? "modal-out 300ms cubic-bezier(0.34,1.56,0.64,1) forwards"
            : "modal-in 340ms cubic-bezier(0.34,1.56,0.64,1) forwards",
        }}
      >
        <div style={{
          position: "absolute", top: 14, left: 18, zIndex: 5,
          fontSize: 12, fontWeight: 900, color: "rgba(255,255,255,0.80)",
        }}>
          {displayIndex + 1} / {list.length}
        </div>

        <button onClick={handleClose} style={{
          position: "absolute", top: 12, right: 12, zIndex: 5,
          borderRadius: 999, border: "1px solid rgba(255,255,255,0.15)",
          background: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.92)",
          padding: "10px 14px", fontWeight: 900, cursor: "pointer",
        }}>✕</button>

        <div key={displayIndex} style={{
          position: "absolute", inset: 0,
          animation: slideAnim,
        }}>
          {thumb && (
            <img src={thumb} alt={currentProduct.name} style={{
              position: "absolute", inset: 0,
              width: "100%", height: "100%", objectFit: "cover",
              opacity: video && videoReady ? 0 : 1,
              visibility: video && videoReady ? "hidden" : "visible",
              transition: "opacity 220ms ease",
            }} />
          )}

          {video && (
            <video src={video} autoPlay muted playsInline style={{
              position: "absolute", inset: 0,
              width: "100%", height: "100%", objectFit: "cover",
            }} onTimeUpdate={(e) => {
              if (!videoReady && e.currentTarget.currentTime >= 1) setVideoReady(true);
            }} />
          )}

          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.35) 46%, rgba(0,0,0,0.08) 72%, transparent 100%)",
          }} />

          <div style={{
            position: "absolute", left: 18, right: 18, bottom: 18,
            zIndex: 4, display: "flex", flexDirection: "column", gap: 8,
          }}>
            <div style={{ color: "#fff", fontWeight: 950, fontSize: 22, lineHeight: 1.1 }}>
              {currentProduct.name}
            </div>
            {currentProduct.description && (
              <div style={{ color: "rgba(255,255,255,0.80)", fontWeight: 700, fontSize: 13 }}>
                {currentProduct.description}
              </div>
            )}
            <div style={{ color: "#fff", fontWeight: 950, fontSize: 26 }}>
              {currentProduct.price_type === "variable"
                ? "Preço variável"
                : currentProduct.price != null
                ? moneyBR(Number(currentProduct.price))
                : ""}
            </div>
            <div style={{
              color: "rgba(255,255,255,0.40)",
              fontWeight: 700, fontSize: 10,
              textAlign: "center", letterSpacing: 0.3,
            }}>
              ←/→ trocar · ↓ fechar
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
