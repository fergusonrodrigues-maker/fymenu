"use client";

import { Product } from "./menuTypes";

interface ProductCardProps {
  product: Product;
  onOrder: (product: Product) => void;
}

export default function ProductCard({ product, onOrder }: ProductCardProps) {
  const hasMedia = product.thumbnail_url || product.video_url;
  const mediaUrl = product.thumbnail_url;
  const isVideo = !product.thumbnail_url && product.video_url;

  const displayPrice =
    product.price_type === "fixed" && product.base_price
      ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(product.base_price / 100)
      : null;

  return (
    <div className="relative flex-shrink-0 w-[160px] snap-start select-none">
      {/* 9:16 aspect ratio card */}
      <div className="relative w-full overflow-hidden rounded-2xl bg-zinc-900 shadow-lg"
        style={{ aspectRatio: "9/16" }}>

        {/* Media */}
        {hasMedia ? (
          isVideo ? (
            <video
              src={product.video_url ?? ""}
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay
              loop
              muted
              playsInline
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaUrl ?? ""}
              alt={product.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
            <span className="text-4xl opacity-20">🍽️</span>
          </div>
        )}

        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-3 flex flex-col gap-2">
          <p className="text-white font-semibold text-sm leading-tight line-clamp-2 drop-shadow">
            {product.name}
          </p>

          {displayPrice && (
            <p className="text-white/80 text-xs font-medium">{displayPrice}</p>
          )}

          <button
            onClick={() => onOrder(product)}
            className="w-full py-2 rounded-xl text-xs font-bold tracking-wide uppercase
              bg-white text-black active:scale-95 transition-transform
              hover:bg-zinc-100 shadow-md"
          >
            Pedir
          </button>
        </div>
      </div>
    </div>
  );
}
