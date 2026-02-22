'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

type Unit = {
  id: string;
  name?: string | null;
  instagram_url?: string | null;
  google_maps_url?: string | null;
  whatsapp_number?: string | null; // ex: "5562999999999"
  whatsapp_message?: string | null;
};

type Category = {
  id: string;
  name: string;
  sort_order?: number | null;
};

type Product = {
  id: string;
  name: string;
  description?: string | null;
  price?: number | null;
  promo_price?: number | null;
  image_url?: string | null;
  category_id: string;
  is_available?: boolean | null;
};

type Props = {
  unit: Unit;
  categories: Category[];
  products: Product[];
};

function formatBRL(value?: number | null) {
  if (value == null || Number.isNaN(value)) return null;
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function buildWhatsAppLink(phone?: string | null, message?: string | null) {
  if (!phone) return null;
  const base = `https://wa.me/${phone.replace(/\D/g, '')}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export default function MenuMobileV1({ unit, categories, products }: Props) {
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      const ao = a.sort_order ?? 9999;
      const bo = b.sort_order ?? 9999;
      if (ao !== bo) return ao - bo;
      return a.name.localeCompare(b.name);
    });
  }, [categories]);

  const productsByCategory = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const c of sortedCategories) map.set(c.id, []);
    for (const p of products) {
      if (!p.category_id) continue;
      if (!map.has(p.category_id)) map.set(p.category_id, []);
      map.get(p.category_id)!.push(p);
    }
    for (const [k, arr] of map.entries()) {
      map.set(k, [...arr].sort((a, b) => a.name.localeCompare(b.name)));
    }
    return map;
  }, [products, sortedCategories]);

  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(
    sortedCategories[0]?.id ?? null
  );

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Scroll vertical -> troca categoria ativa
  useEffect(() => {
    if (!sortedCategories.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (a.boundingClientRect.top ?? 0) - (b.boundingClientRect.top ?? 0));

        if (visible[0]?.target?.id) {
          const id = visible[0].target.id.replace('cat-', '');
          setActiveCategoryId(id);
        }
      },
      {
        root: null,
        rootMargin: '-120px 0px -60% 0px',
        threshold: [0.05, 0.1, 0.2],
      }
    );

    for (const c of sortedCategories) {
      const el = sectionRefs.current[c.id];
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [sortedCategories]);

  function scrollToCategory(categoryId: string) {
    const el = sectionRefs.current[categoryId];
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const activeCategory = useMemo(() => {
    if (!activeCategoryId) return sortedCategories[0] ?? null;
    return sortedCategories.find((c) => c.id === activeCategoryId) ?? sortedCategories[0] ?? null;
  }, [activeCategoryId, sortedCategories]);

  const whatsappLink = useMemo(
    () =>
      buildWhatsAppLink(
        unit.whatsapp_number,
        unit.whatsapp_message ?? `Olá! Vim pelo FyMenu do ${unit.name ?? ''}`
      ),
    [unit.whatsapp_number, unit.whatsapp_message, unit.name]
  );

  return (
    <div className="min-h-dvh bg-neutral-950 text-neutral-50">
      {/* Topo fixo: categoria vigente */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-neutral-950/80 backdrop-blur-xl">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-white/60">Cardápio</p>
              <h1 className="truncate text-lg font-semibold leading-tight">
                {unit.name ?? 'FyMenu'}
              </h1>
            </div>

            {activeCategory?.name ? (
              <div className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
                {activeCategory.name}
              </div>
            ) : null}
          </div>

          {/* Chips - deixa a ativa bem clara */}
          <div className="mt-3 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {sortedCategories.map((c) => {
              const isActive = c.id === activeCategoryId;
              return (
                <button
                  key={c.id}
                  onClick={() => scrollToCategory(c.id)}
                  className={cn(
                    'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition',
                    isActive
                      ? 'bg-white text-neutral-950'
                      : 'bg-transparent text-white/80 ring-1 ring-white/25 hover:bg-white/10'
                  )}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="px-4 pb-24 pt-4">
        {sortedCategories.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
            Nenhuma categoria encontrada.
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            {sortedCategories.map((c) => {
              const list = productsByCategory.get(c.id) ?? [];
              return (
                <section
                  key={c.id}
                  id={`cat-${c.id}`}
                  ref={(el) => {
                    sectionRefs.current[c.id] = el;
                  }}
                  className="scroll-mt-28"
                >
                  <div className="mb-3 flex items-end justify-between">
                    <h2 className="text-base font-semibold">{c.name}</h2>
                    <span className="text-xs text-white/50">{list.length} itens</span>
                  </div>

                  {/* Carrossel com padding lateral pra centralizar melhor */}
                  <Carousel items={list} onSelect={(p) => setSelectedProduct(p)} />
                </section>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal do produto com blur */}
      <ProductModal
        unitName={unit.name ?? 'FyMenu'}
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onWhatsApp={() => {
          if (!whatsappLink || !selectedProduct) return;
          const msg = `Olá! Quero pedir: ${selectedProduct.name}${unit.name ? ` (${unit.name})` : ''}`;
          const link = buildWhatsAppLink(unit.whatsapp_number, msg);
          if (link) window.open(link, '_blank', 'noopener,noreferrer');
        }}
      />

      {/* Rodapé fixo */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-neutral-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center justify-around px-4 py-3">
          <FooterLink
            label="Instagram"
            href={unit.instagram_url ?? undefined}
            disabled={!unit.instagram_url}
            icon={<IconInstagram />}
          />
          <FooterLink
            label="Maps"
            href={unit.google_maps_url ?? undefined}
            disabled={!unit.google_maps_url}
            icon={<IconMaps />}
          />
          <FooterLink
            label="WhatsApp"
            href={whatsappLink ?? undefined}
            disabled={!whatsappLink}
            icon={<IconWhatsApp />}
          />
        </div>
      </footer>
    </div>
  );
}

/** Carrossel horizontal com destaque do item central */
function Carousel({ items, onSelect }: { items: Product[]; onSelect: (p: Product) => void }) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [centerIndex, setCenterIndex] = useState(0);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;

      let bestIdx = 0;
      let bestDist = Number.POSITIVE_INFINITY;

      itemRefs.current.forEach((node, idx) => {
        if (!node) return;
        const r = node.getBoundingClientRect();
        const itemCenter = r.left + r.width / 2;
        const dist = Math.abs(itemCenter - centerX);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = idx;
        }
      });

      setCenterIndex(bestIdx);
    };

    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [items.length]);

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
        Nenhum item nesta categoria.
      </div>
    );
  }

  return (
    <div
      ref={scrollerRef}
      className={cn(
        'flex gap-3 overflow-x-auto pb-2',
        // padding lateral para deixar o “center snap” bonito
        'px-4 -mx-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
      )}
      style={{ scrollSnapType: 'x mandatory' }}
    >
      {items.map((p, idx) => {
        const isCenter = idx === centerIndex;
        const price = p.promo_price ?? p.price;
        const original = p.promo_price != null ? p.price : null;

        return (
          <button
            key={p.id}
            ref={(el) => {
              itemRefs.current[idx] = el;
            }}
            onClick={() => onSelect(p)}
            className={cn(
              'relative shrink-0 overflow-hidden rounded-2xl border text-left transition',
              'border-white/10 bg-white/5 hover:bg-white/10 active:scale-[0.99]',
              isCenter ? 'w-[260px] scale-[1.04]' : 'w-[220px] scale-[0.98]'
            )}
            style={{ scrollSnapAlign: 'center' }}
          >
            <div className="flex">
              <div className="h-[108px] w-[108px] shrink-0 bg-white/10">
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-white/40">
                    sem foto
                  </div>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-1 p-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="min-w-0 truncate text-sm font-semibold">{p.name}</h3>

                  {p.is_available === false ? (
                    <span className="shrink-0 rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold text-red-200">
                      indisponível
                    </span>
                  ) : null}
                </div>

                {p.description ? (
                  <p className="line-clamp-2 text-xs text-white/60">{p.description}</p>
                ) : (
                  <p className="text-xs text-white/35">Toque para ver detalhes</p>
                )}

                <div className="mt-1 flex items-baseline gap-2">
                  {price != null ? (
                    <span className="text-sm font-semibold">{formatBRL(price)}</span>
                  ) : (
                    <span className="text-sm font-semibold text-white/60">—</span>
                  )}

                  {original != null ? (
                    <span className="text-xs text-white/45 line-through">{formatBRL(original)}</span>
                  ) : null}
                </div>
              </div>
            </div>

            {isCenter ? (
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function ProductModal({
  product,
  onClose,
  onWhatsApp,
  unitName,
}: {
  product: Product | null;
  onClose: () => void;
  onWhatsApp: () => void;
  unitName: string;
}) {
  useEffect(() => {
    if (!product) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [product, onClose]);

  if (!product) return null;

  const price = product.promo_price ?? product.price;
  const original = product.promo_price != null ? product.price : null;

  return (
    <div className="fixed inset-0 z-50">
      <button aria-label="Fechar" className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={onClose} />

      <div className="absolute bottom-0 left-0 right-0 mx-auto w-full max-w-md">
        <div className="rounded-t-3xl border border-white/10 bg-neutral-950/90 backdrop-blur-xl">
          <div className="px-4 pt-4">
            <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-white/20" />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-white/60">{unitName}</p>
                <h3 className="truncate text-lg font-semibold">{product.name}</h3>
              </div>

              <button
                onClick={onClose}
                className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80 hover:bg-white/15"
              >
                Fechar
              </button>
            </div>
          </div>

          <div className="px-4 pb-5 pt-4">
            {product.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.image_url} alt={product.name} className="h-52 w-full rounded-2xl object-cover" />
            ) : null}

            {product.description ? <p className="mt-3 text-sm text-white/75">{product.description}</p> : null}

            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-xl font-semibold">{formatBRL(price) ?? '—'}</span>
              {original != null ? <span className="text-sm text-white/45 line-through">{formatBRL(original)}</span> : null}
              {product.is_available === false ? (
                <span className="rounded-full bg-red-500/20 px-2 py-1 text-xs font-semibold text-red-200">
                  Indisponível
                </span>
              ) : null}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/85 hover:bg-white/10"
              >
                Voltar
              </button>

              <button
                onClick={onWhatsApp}
                disabled={product.is_available === false}
                className={cn(
                  'flex-1 rounded-2xl px-4 py-3 text-sm font-semibold',
                  product.is_available === false
                    ? 'cursor-not-allowed bg-white/10 text-white/40'
                    : 'bg-white text-neutral-950 hover:bg-white/90'
                )}
              >
                Pedir no WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FooterLink({
  href,
  label,
  icon,
  disabled,
}: {
  href?: string;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
}) {
  const common = 'flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium transition';

  if (!href || disabled) {
    return (
      <div className={cn(common, 'text-white/35')}>
        <div className="text-white/35">{icon}</div>
        <span>{label}</span>
      </div>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(common, 'text-white/85 hover:bg-white/10 active:scale-[0.99]')}
    >
      <div className="text-white/85">{icon}</div>
      <span>{label}</span>
    </a>
  );
}

function IconInstagram() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M7.5 3h9A4.5 4.5 0 0 1 21 7.5v9A4.5 4.5 0 0 1 16.5 21h-9A4.5 4.5 0 0 1 3 16.5v-9A4.5 4.5 0 0 1 7.5 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M12 16.2a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M17.3 6.7h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function IconMaps() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M12 22s7-5.2 7-12A7 7 0 1 0 5 10c0 6.8 7 12 7 12Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M12 13.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function IconWhatsApp() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M20 11.9a8 8 0 0 1-11.8 7L4 20l1.2-4.1A8 8 0 1 1 20 11.9Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M9.2 8.7c.2-.4.4-.5.7-.5h.5c.2 0 .5.1.6.4l.8 1.9c.1.3.1.6-.1.8l-.4.5c-.1.2-.1.4 0 .6.4.8 1.3 1.6 2.1 2 .2.1.4.1.6 0l.6-.4c.2-.2.5-.2.8-.1l2 .7c.3.1.4.4.4.6v.5c0 .3-.2.6-.5.7-.6.3-1.6.5-2.9 0-1.3-.5-3.1-1.6-4.5-3-1.4-1.4-2.5-3.3-3-4.6-.4-1.2-.3-2.2 0-2.8Z"
        fill="currentColor"
        opacity="0.85"
      />
    </svg>
  );
}