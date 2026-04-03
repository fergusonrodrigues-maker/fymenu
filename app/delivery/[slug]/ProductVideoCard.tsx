"use client";

import { useRef, useEffect } from "react";
import { Product } from "./menuTypes";

interface ProductVideoCardProps {
  product: Product;
}

export default function ProductVideoCard({ product }: ProductVideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Pause/resume based on scroll visibility
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

  // Pause when modal opens, resume when modal closes (if visible)
  useEffect(() => {
    function handler(e: Event) {
      const open = (e as CustomEvent<{ open: boolean }>).detail.open;
      if (!videoRef.current) return;
      if (open) {
        videoRef.current.pause();
      } else {
        const rect = videoRef.current.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          videoRef.current.play().catch(() => {});
        }
      }
    }
    window.addEventListener("menu-modal", handler);
    return () => window.removeEventListener("menu-modal", handler);
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
