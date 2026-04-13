"use client";

import { useEffect, useRef } from "react";

export default function MouseGlow() {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = glowRef.current;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      el.style.left = e.clientX + "px";
      el.style.top = e.clientY + "px";
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  return (
    <div
      ref={glowRef}
      style={{
        position: "fixed",
        width: 400,
        height: 400,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(0,255,174,0.04) 0%, transparent 70%)",
        pointerEvents: "none",
        left: "-200px",
        top: "-200px",
        transform: "translate(-50%, -50%)",
        transition: "left 0.3s ease, top 0.3s ease",
        zIndex: 1,
      }}
    />
  );
}
