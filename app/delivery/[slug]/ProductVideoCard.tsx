"use client";

import { useRef, useEffect, useState } from "react";
import { Product } from "./menuTypes";

interface ProductVideoCardProps {
  product: Product;
}

export default function ProductVideoCard({ product }: ProductVideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Lazy-load the src: true once the card is within ~2 screens of the viewport
  const [shouldLoad, setShouldLoad] = useState(false);
  // Play/pause: only when the card is actually on screen
  const [isVisible, setIsVisible] = useState(false);

  // Observer 1 — pre-load when within 200vh
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          obs.disconnect(); // only need to fire once
        }
      },
      { rootMargin: "200% 0px", threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Observer 2 — play/pause when actually visible
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.intersectionRatio >= 0.3),
      { threshold: [0, 0.3, 1] }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Play/pause based on visibility
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (isVisible) {
      vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  }, [isVisible]);

  // Pause when product modal opens, resume when it closes
  useEffect(() => {
    function handler(e: Event) {
      const open = (e as CustomEvent<{ open: boolean }>).detail.open;
      const vid = videoRef.current;
      if (!vid) return;
      if (open) {
        vid.pause();
      } else if (isVisible) {
        vid.play().catch(() => {});
      }
    }
    window.addEventListener("menu-modal", handler);
    return () => window.removeEventListener("menu-modal", handler);
  }, [isVisible]);

  return (
    <div ref={wrapperRef} style={{ position: "absolute", inset: 0 }}>
      <video
        ref={videoRef}
        src={shouldLoad ? product.video_url! : undefined}
        muted
        loop
        playsInline
        preload="none"
        poster={product.thumbnail_url || undefined}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
    </div>
  );
}
