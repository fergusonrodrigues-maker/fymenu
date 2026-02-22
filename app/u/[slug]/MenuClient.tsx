// FILE: /app/u/[slug]/MenuClient.tsx
// ACTION: REPLACE ENTIRE FILE
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Unit = {
  id: string;
  name: string;
  address: string;
  instagram: string;
  slug: string;

  whatsapp: string;
  logo_url: string;
};

type Category = {
  id: string;
  name: string;
  type: string;
};

type Variation = {
  id: string;
  product_id: string;
  name: string;
  price: number;
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

  // ✅ Sprint 2 payload
  variations?: Variation[];
};

function moneyBR(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function minVariationPrice(p: Product): number | null {
  const vars = p.variations ?? [];
  const prices = vars
    .map((v) => Number(v.price))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (!prices.length) return null;
  return Math.min(...prices);
}

type ModalState =
  | {
      list: Product[];
      index: number;
    }
  | null;

type FooterLink = {
  key: "instagram" | "maps" | "whatsapp";
  label: string;
  href: string;
  icon: string;
};

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

// aceitas:
// - "62999999999"
// - "+55 62 99999-9999"
// - "55 62 99999-9999"
function normalizeWhatsappToWaMe(phone: string) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return "";
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}`;
}

function buildFooterLinks(unit: Unit): FooterLink[] {
  const links: FooterLink[] = [];

  const ig = normalizeInstagram(unit.instagram);
  const maps = mapsFromAddress(unit.address);
  const wa = normalizeWhatsappToWaMe(unit.whatsapp);

  if (ig) links.push({ key: "instagram", label: "Instagram", href: ig, icon: "📷" });
  if (maps) links.push({ key: "maps", label: "Maps", href: maps, icon: "📍" });
  if (wa) links.push({ key: "whatsapp", label: "WhatsApp", href: wa, icon: "💬" });

  return links;
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
  // Agrupa produtos por categoria (id -> Product[])
  const grouped = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const c of categories) map.set(c.id, []);
    for (const p of products) {
      if (!map.has(p.category_id)) map.set(p.category_id, []);
      map.get(p.category_id)!.push(p);
    }
    return map;
  }, [categories, products]);

  // ✅ Regra MVP: no público, categoria vazia NÃO aparece
  const visibleCategories = useMemo(() => {
    const has = new Set<string>();
    for (const p of products) has.add(p.category_id);
    return categories.filter((c) => has.has(c.id));
  }, [categories, products]);

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const chipBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const [activeCatId, setActiveCatId] = useState<string>(visibleCategories[0]?.id ?? "");
  const [modal, setModal] = useState<ModalState>(null);

  // ✅ Se as categorias mudarem, garante active válido
  useEffect(() => {
    if (!visibleCategories.length) return;
    if (!activeCatId || !visibleCategories.some((c) => c.id === activeCatId)) {
      setActiveCatId(visibleCategories[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleCategories]);

  // trava scroll do body quando modal estiver aberto
  useEffect(() => {
    if (!modal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [modal]);

  // Observa qual seção (categoria) está em vigência no scroll vertical
  useEffect(() => {
    const ids = visibleCategories.map((c) => c.id);
    const els = ids
      .map((id) => sectionRefs.current[id])
      .filter(Boolean) as HTMLDivElement[];

    if (!els.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        const best = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0))[0];

        if (best?.target) {
          const foundId = ids.find((id) => sectionRefs.current[id] === best.target);
          if (foundId) setActiveCatId(foundId);
        }
      },
      {
        root: null,
        threshold: [0.2, 0.35, 0.5, 0.65],
        rootMargin: "-140px 0px -55% 0px",
      }
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [visibleCategories]);

  // centraliza o botão da categoria ativa nos chips
  useEffect(() => {
    const btn = chipBtnRefs.current[activeCatId];
    if (!btn) return;
    btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeCatId]);

  function scrollToCategory(id: string) {
    const el = sectionRefs.current[id];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // bucket de links (só renderiza os válidos)
  const footerLinks = useMemo(() => buildFooterLinks(unit), [unit]);

  const bg = "#0b0b0b";
  const glass = "rgba(255,255,255,0.06)";
  const border = "rgba(255,255,255,0.12)";
  const text = "#fff";

  // ✅ Se não tem nada publicado (nenhum produto)
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
        paddingBottom: footerLinks.length ? 120 : 70,
      }}
    >
      {/* ===== HEADER FIXO ===== */}
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
        {/* topo */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "44px 1fr 44px",
            alignItems: "center",
          }}
        >
          {/* Logo (se existir) senão fallback U */}
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              background: glass,
              border: `1px solid ${border}`,
              overflow: "hidden",
              display: "grid",
              placeItems: "center",
              fontWeight: 900,
            }}
          >
            {unit.logo_url ? (
              <img
                src={unit.logo_url}
                alt={unit.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              "U"
            )}
          </div>

          <div style={{ textAlign: "center", lineHeight: 1.05 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>Cardápio</div>
            <div style={{ opacity: 0.65, fontSize: 12 }}>Unidade</div>
          </div>

          <div />
        </div>

        {/* chips */}
        <div
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
                onClick={() => scrollToCategory(c.id)}
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
                }}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== CONTEÚDO ===== */}
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
                onOpen={(p, index) => {
                  setModal({ list: items, index });
                }}
              />
            </div>
          );
        })}
      </div>

      {/* ===== FOOTER FLUTUANTE ===== */}
      {footerLinks.length > 0 && (
        <footer
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 18,
            zIndex: 60,
            display: "flex",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <FooterBucket links={footerLinks} />
        </footer>
      )}

      {/* ===== MODAL ===== */}
      {modal && (
        <ProductModal
          list={modal.list}
          index={modal.index}
          onChangeIndex={(idx) => setModal({ list: modal.list, index: idx })}
          onClose={() => setModal(null)}
        />
      )}
    </main>
  );
}

function FooterBucket({ links }: { links: FooterLink[] }) {
  return (
    <div
      style={{
        pointerEvents: "auto",
        display: "flex",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        backdropFilter: "blur(14px)",
      }}
    >
      {links.map((l) => (
        <FooterBtn key={l.key} label={l.label} href={l.href} icon={l.icon} />
      ))}
    </div>
  );
}

function FooterBtn({ label, href, icon }: { label: string; href: string; icon: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      style={{
        textDecoration: "none",
        color: "#fff",
        display: "grid",
        placeItems: "center",
        width: 48,
        height: 48,
        borderRadius: 16,
        background: "rgba(0,0,0,0.20)",
        border: "1px solid rgba(255,255,255,0.10)",
      }}
      aria-label={label}
      title={label}
    >
      <span style={{ fontSize: 18 }}>{icon}</span>
    </a>
  );
}

function HorizontalProducts({
  items,
  variant,
  onOpen,
}: {
  items: Product[];
  variant: "active" | "inactive";
  onOpen: (p: Product, index: number) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const cards = () => Array.from(el.querySelectorAll<HTMLElement>("[data-card='1']"));

    const update = () => {
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

        c.style.transform = `scale(${scale})`;
        c.style.opacity = String(alpha);
      }
    };

    requestAnimationFrame(() => {
      const first = cards()[0];
      if (first)
        el.scrollLeft = Math.max(0, first.offsetLeft - el.clientWidth / 2 + first.clientWidth / 2);
      update();
    });

    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [variant]);

  const W = variant === "active" ? 250 : 180;

  return (
    <div
      ref={scrollerRef}
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: variant === "active" ? 14 : 10,
        overflowX: "auto",
        paddingTop: 14,
        paddingBottom: 12,
        WebkitOverflowScrolling: "touch",
        scrollSnapType: "x mandatory",
        paddingLeft: variant === "active" ? 26 : 18,
        paddingRight: variant === "active" ? 26 : 18,
      }}
    >
      {items.map((p, idx) => {
        const min = p.price_type === "variable" ? minVariationPrice(p) : null;

        const priceLabel =
          p.price_type === "fixed"
            ? moneyBR(p.base_price)
            : min !== null
              ? `A partir de ${moneyBR(min)}`
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

// ---- Modal ----
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

  const vars = product.variations ?? [];
  const hasVars = product.price_type === "variable" && vars.length > 0;
  const min = product.price_type === "variable" ? minVariationPrice(product) : null;

  const priceLabel =
    product.price_type === "fixed"
      ? moneyBR(product.base_price)
      : min !== null
        ? `A partir de ${moneyBR(min)}`
        : "Preço variável";

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
            }}
          >
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

            {/* ✅ PREÇO */}
            <div style={{ marginTop: 10, fontSize: 20, fontWeight: 950 }}>{priceLabel}</div>

            {/* ✅ LISTA DE VARIAÇÕES */}
            {hasVars && (
              <div
                style={{
                  marginTop: 10,
                  display: "grid",
                  gap: 6,
                  textAlign: "left",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 14,
                  padding: "10px 12px",
                }}
              >
                {vars.map((v) => (
                  <div
                    key={v.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      fontSize: 14,
                      fontWeight: 800,
                    }}
                  >
                    <span style={{ opacity: 0.95 }}>{v.name}</span>
                    <span style={{ opacity: 0.95 }}>{moneyBR(Number(v.price ?? 0))}</span>
                  </div>
                ))}
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