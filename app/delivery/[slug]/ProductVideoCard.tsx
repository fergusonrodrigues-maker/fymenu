"use client";

import { useRef, useEffect } from "react";
import { Product } from "./menuTypes";

interface ProductVideoCardProps {
  product: Product;
}

export default function ProductVideoCard({ product }: ProductVideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoRef.current?.play().catch(() => {});
        } else {
          videoRef.current?.pause();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(videoRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={videoRef}
      src={product.video_url!}
      muted
      loop
      playsInline
      preload="metadata"
      poster={product.thumbnail_url || undefined}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
      }}
    />
  );
}
