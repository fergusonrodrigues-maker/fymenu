"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import type { Category, Product, ProductVariation, Unit } from "@/app/delivery/[slug]/menuTypes";

interface Props {
  unit: Unit;
  categories: Category[];
  products: Product[];
  variations: Record<string, ProductVariation[]>;
}

function fmt(price: number) {
  return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function isUnitOpen(unit: Unit): { isOpen: boolean; label: string } {
  const fs = (unit as any).force_status;
  if (fs === "open") return { isOpen: true, label: "Aberto agora" };
  if (fs === "closed") return { isOpen: false, label: "Fechado" };

  const hours: any[] = (unit as any).business_hours ?? [];
  if (!hours.length) return { isOpen: true, label: "" };

  const now = new Date();
  const dayNames = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
  const today = dayNames[now.getDay()];
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const todayHours = hours.find((h) => h.day === today);

  if (!todayHours?.enabled) return { isOpen: false, label: "Fechado hoje" };

  const { open: openTime, close: closeTime } = todayHours;
  const crossesMidnight = closeTime <= openTime;

  if (crossesMidnight) {
    if (currentTime >= openTime || currentTime < closeTime)
      return { isOpen: true, label: `Aberto até ${closeTime}` };
  } else {
    if (currentTime >= openTime && currentTime < closeTime)
      return { isOpen: true, label: `Aberto até ${closeTime}` };
  }

  if (currentTime < openTime) return { isOpen: false, label: `Abre às ${openTime}` };
  return { isOpen: false, label: "Fechado" };
}

export default function MesaMenuClient({ unit, categories, products, variations }: Props) {
  const [activeCategoryId, setActiveCategoryId] = useState(categories[0]?.id ?? "");
  const pillsRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const [pillsSticky, setPillsSticky] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isScrollingProgrammatic = useRef(false);

  const { isOpen, label: hoursLabel } = isUnitOpen(unit);

  // Sticky pills detection
  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => setPillsSticky(!entry.isIntersecting),
      { threshold: 0 }
    );
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, []);

  // Active category on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (isScrollingProgrammatic.current) return;
      for (let i = categories.length - 1; i >= 0; i--) {
        const el = sectionRefs.current[categories[i].id];
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 120) {
            setActiveCategoryId(categories[i].id);
            return;
          }
        }
      }
      if (categories[0]) setActiveCategoryId(categories[0].id);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [categories]);

  const scrollToCategory = useCallback((catId: string) => {
    setActiveCategoryId(catId);
    const el = sectionRefs.current[catId];
    if (!el) return;
    isScrollingProgrammatic.current = true;
    const top = el.getBoundingClientRect().top + window.scrollY - 100;
    window.scrollTo({ top, behavior: "smooth" });
    setTimeout(() => { isScrollingProgrammatic.current = false; }, 800);

    // Keep pill visible
    const pill = pillsRef.current?.querySelector(`[data-cat="${catId}"]`) as HTMLElement | null;
    pill?.scrollIntoView({ inline: "center", block: "nearest" });
  }, []);

  const productsByCategory = categories.reduce<Record<string, Product[]>>((acc, cat) => {
    acc[cat.id] = products.filter((p) => p.category_id === cat.id);
    return acc;
  }, {});

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <header style={{
        background: "#fff",
        borderBottom: "1px solid #e5e7eb",
        padding: "16px 16px 12px",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            {unit.logo_url ? (
              <img
                src={unit.logo_url}
                alt={unit.name}
                style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", flexShrink: 0 }}
              />
            ) : (
              <div style={{
                width: 44, height: 44, borderRadius: 10, background: "#f3f4f6",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20, flexShrink: 0,
              }}>🍽️</div>
            )}
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#111827", lineHeight: 1.2 }}>{unit.name}</div>
              {hoursLabel && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                  <span style={{
                    width: 7, height: 7, borderRadius: "50%",
                    background: isOpen ? "#16a34a" : "#dc2626",
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 12, color: isOpen ? "#16a34a" : "#dc2626", fontWeight: 500 }}>
                    {hoursLabel}
                  </span>
                </div>
              )}
            </div>
            <div style={{ marginLeft: "auto" }}>
              <span style={{
                background: "#f0fdf4", color: "#16a34a",
                border: "1px solid #bbf7d0",
                borderRadius: 20, padding: "4px 10px",
                fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
              }}>
                Cardápio do Salão
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Sentinel for pill stickiness ─────────────────────────── */}
      <div ref={sentinelRef} style={{ height: 1 }} />

      {/* ── Category pills ───────────────────────────────────────── */}
      {categories.length > 1 && (
        <div style={{
          position: "sticky",
          top: pillsSticky ? 73 : 0,
          zIndex: 30,
          background: "#fff",
          borderBottom: "1px solid #e5e7eb",
        }}>
          <div
            ref={pillsRef}
            style={{
              display: "flex",
              overflowX: "auto",
              gap: 6,
              padding: "10px 16px",
              maxWidth: 680,
              margin: "0 auto",
              scrollbarWidth: "none",
            }}
          >
            {categories.map((cat) => (
              <button
                key={cat.id}
                data-cat={cat.id}
                onClick={() => scrollToCategory(cat.id)}
                style={{
                  flexShrink: 0,
                  padding: "6px 14px",
                  borderRadius: 20,
                  border: "1.5px solid",
                  borderColor: activeCategoryId === cat.id ? "#16a34a" : "#e5e7eb",
                  background: activeCategoryId === cat.id ? "#f0fdf4" : "#fff",
                  color: activeCategoryId === cat.id ? "#16a34a" : "#6b7280",
                  fontSize: 13,
                  fontWeight: activeCategoryId === cat.id ? 700 : 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s",
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Menu content ─────────────────────────────────────────── */}
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "12px 0 80px" }}>
        {categories.map((cat) => {
          const catProducts = productsByCategory[cat.id] ?? [];
          if (!catProducts.length) return null;
          return (
            <section
              key={cat.id}
              ref={(el) => { sectionRefs.current[cat.id] = el; }}
            >
              <h2 style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#6b7280",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                padding: "18px 16px 8px",
                margin: 0,
              }}>
                {cat.name}
              </h2>

              {catProducts.map((product) => {
                const vars = variations[product.id] ?? [];
                return (
                  <div
                    key={product.id}
                    style={{
                      display: "flex",
                      gap: 12,
                      padding: "12px 16px",
                      borderBottom: "1px solid #f3f4f6",
                      background: "#fff",
                      marginBottom: 1,
                    }}
                  >
                    {/* Text side */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, color: "#111827", lineHeight: 1.3 }}>
                        {product.name}
                      </div>
                      {product.description && (
                        <div style={{
                          fontSize: 13, color: "#6b7280", marginTop: 4, lineHeight: 1.5,
                          display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}>
                          {product.description}
                        </div>
                      )}

                      {/* Price / variations */}
                      <div style={{ marginTop: 8 }}>
                        {vars.length > 0 ? (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {vars.map((v) => (
                              <span
                                key={v.id}
                                style={{
                                  fontSize: 12,
                                  background: "#f9fafb",
                                  border: "1px solid #e5e7eb",
                                  borderRadius: 6,
                                  padding: "3px 8px",
                                  color: "#374151",
                                  fontWeight: 500,
                                }}
                              >
                                {v.name} · {fmt(v.price)}
                              </span>
                            ))}
                          </div>
                        ) : product.base_price != null ? (
                          <span style={{ fontWeight: 700, fontSize: 15, color: "#16a34a" }}>
                            {fmt(product.base_price)}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Image side */}
                    {product.thumbnail_url && (
                      <img
                        src={product.thumbnail_url}
                        alt={product.name}
                        loading="lazy"
                        style={{
                          width: 80, height: 80,
                          borderRadius: 10,
                          objectFit: "cover",
                          flexShrink: 0,
                          alignSelf: "flex-start",
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </section>
          );
        })}
      </main>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "#fff",
        borderTop: "1px solid #e5e7eb",
        padding: "14px 16px",
        textAlign: "center",
        zIndex: 50,
      }}>
        <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
          Para fazer seu pedido, <strong style={{ color: "#374151" }}>chame um garçom</strong>
        </p>
      </footer>
    </div>
  );
}
