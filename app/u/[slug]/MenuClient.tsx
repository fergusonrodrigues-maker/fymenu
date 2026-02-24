// FILE: /app/u/[slug]/MenuClient.tsx
// ACTION: REPLACE ENTIRE FILE

"use client";

import { useMemo, useState } from "react";
import type { Category, Product, Unit } from "./menuTypes";

type Props = {
  unit: Unit;
  categories: Category[];
  products: Product[];
};

function moneyBRL(value: number | null) {
  if (value == null || Number.isNaN(value)) return null;
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function MenuClient({ unit, categories, products }: Props) {
  // “Destaque” = primeira categoria (ou a que tiver type === 'featured' se existir)
  const featuredCategoryId = useMemo(() => {
    const featured = categories.find((c) => (c.type ?? "").toLowerCase() === "featured");
    return featured?.id ?? categories[0]?.id ?? null;
  }, [categories]);

  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(
    featuredCategoryId
  );

  const productsByCategory = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of products) {
      const list = map.get(p.category_id) ?? [];
      list.push(p);
      map.set(p.category_id, list);
    }
    return map;
  }, [products]);

  const activeCategory = useMemo(
    () => categories.find((c) => c.id === activeCategoryId) ?? categories[0] ?? null,
    [categories, activeCategoryId]
  );

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur border-b border-white/10">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-lg font-semibold truncate">{unit.name}</div>
              <div className="text-xs text-white/60 truncate">
                {(unit.city || "") + (unit.neighborhood ? ` • ${unit.neighborhood}` : "")}
              </div>
            </div>
          </div>

          {/* Pills */}
          <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {categories.map((c) => {
              const isActive = c.id === activeCategory?.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveCategoryId(c.id)}
                  className={[
                    "shrink-0 px-3 py-2 rounded-full text-sm border transition",
                    isActive
                      ? "bg-white text-black border-white"
                      : "bg-white/5 text-white border-white/15 hover:bg-white/10",
                  ].join(" ")}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="px-4 pb-24">
        {/* Destaque (carrossel simples) */}
        {featuredCategoryId && (
          <section className="mt-4">
            <div className="flex items-end justify-between">
              <h2 className="text-base font-semibold">
                {categories.find((c) => c.id === featuredCategoryId)?.name ?? "Destaque"}
              </h2>
            </div>

            <div className="mt-3 flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {(productsByCategory.get(featuredCategoryId) ?? []).map((p) => (
                <article
                  key={p.id}
                  className="w-[260px] shrink-0 rounded-2xl overflow-hidden bg-white/5 border border-white/10"
                >
                  <div className="relative aspect-[4/5] bg-white/5">
                    {/* imagem/video (só preview simples) */}
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-white/40 text-sm">
                        Sem imagem
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    <div className="absolute left-3 right-3 bottom-3">
                      <div className="text-base font-semibold leading-tight line-clamp-2">
                        {p.name}
                      </div>
                      <div className="mt-1 text-sm text-white/85">
                        {moneyBRL(p.price) ?? ""}
                      </div>
                    </div>
                  </div>

                  {(p.description || p.variations.length > 0) && (
                    <div className="p-3">
                      {p.description && (
                        <p className="text-sm text-white/70 line-clamp-2">
                          {p.description}
                        </p>
                      )}

                      {p.variations.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {p.variations.map((v) => (
                            <div
                              key={v.id}
                              className="flex items-center justify-between gap-3 text-sm"
                            >
                              <div className="text-white/85">{v.name}</div>
                              <div className="text-white/70">
                                {moneyBRL(v.price)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Categoria ativa (lista) */}
        {activeCategory && (
          <section className="mt-6">
            <h2 className="text-base font-semibold">{activeCategory.name}</h2>

            <div className="mt-3 space-y-3">
              {(productsByCategory.get(activeCategory.id) ?? [])
                .filter((p) => p.is_active)
                .map((p) => (
                  <article
                    key={p.id}
                    className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden"
                  >
                    <div className="flex gap-3 p-3">
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-white/10 shrink-0">
                        {p.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-white/40">
                            Sem imagem
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-semibold leading-tight line-clamp-2">
                            {p.name}
                          </div>
                          <div className="text-sm text-white/85 whitespace-nowrap">
                            {moneyBRL(p.price) ?? ""}
                          </div>
                        </div>

                        {p.description && (
                          <p className="mt-1 text-sm text-white/65 line-clamp-2">
                            {p.description}
                          </p>
                        )}

                        {p.variations.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {p.variations.map((v) => (
                              <div
                                key={v.id}
                                className="flex items-center justify-between gap-2 text-sm text-white/70"
                              >
                                <span className="truncate">{v.name}</span>
                                <span className="whitespace-nowrap">
                                  {moneyBRL(v.price)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}