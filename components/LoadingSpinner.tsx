"use client";

import React from "react";

// ── ContentEnter ──────────────────────────────────────────────────────────────
// Wraps content that appears after a loading state ends.
// Fades in + slides up from 8px — same as the landing page content reveal.
export function ContentEnter({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <>
      <div style={{ animation: "fyContentEnter 0.3s ease both", ...style }}>
        {children}
      </div>
      <style>{`
        @keyframes fyContentEnter {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}

// ── Size config ───────────────────────────────────────────────────────────────
// lg matches the landing's .fy-loader exactly (80px, 1rem ring).
// sm/md are proportionally scaled.
const SIZES = {
  sm: { dim: 32, ring: "0.4rem", outerSub: "0.8rem",  glow: "0.6rem" },
  md: { dim: 48, ring: "0.6rem", outerSub: "1.2rem",  glow: "0.8rem" },
  lg: { dim: 80, ring: "1rem",   outerSub: "2rem",     glow: "1rem"   },
} as const;

// Generates the exact same CSS as landing's .fy-loader, scoped to a size class.
// Uses ::before / ::after pseudo-elements with padding-bottom trick — identical
// structure to what the landing injects in its global <style> block.
function spinnerCSS(size: string, c: (typeof SIZES)[keyof typeof SIZES]) {
  return `
    .fy-sp-${size} {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: ${c.dim}px;
      height: ${c.dim}px;
    }
    .fy-sp-${size}::before, .fy-sp-${size}::after {
      content: "";
      position: absolute;
      border-radius: 50%;
      filter: drop-shadow(0 0 ${c.glow} rgba(0, 255, 174, 0.6));
    }
    .fy-sp-${size}::before {
      width: 100%;
      padding-bottom: 100%;
      box-shadow: inset 0 0 0 ${c.ring} #00ffae;
      animation: fyPulsIn_${size} 1.8s ease-in-out infinite;
    }
    .fy-sp-${size}::after {
      width: calc(100% - ${c.outerSub});
      padding-bottom: calc(100% - ${c.outerSub});
      box-shadow: 0 0 0 0 #00ffae;
      animation: fyPulsOut_${size} 1.8s ease-in-out infinite;
    }
    @keyframes fyPulsIn_${size} {
      0%        { box-shadow: inset 0 0 0 ${c.ring} #00ffae; opacity: 1; }
      50%, 100% { box-shadow: inset 0 0 0 0         #00ffae; opacity: 0; }
    }
    @keyframes fyPulsOut_${size} {
      0%, 50% { box-shadow: 0 0 0 0         #00ffae; opacity: 0; }
      100%    { box-shadow: 0 0 0 ${c.ring} #00ffae; opacity: 1; }
    }
  `;
}

// ── LoadingSpinner ────────────────────────────────────────────────────────────
// Replicates the exact landing page .fy-loader animation using the same
// pseudo-element + padding-bottom CSS structure.
// Props:
//   size      — 'sm' | 'md' | 'lg'  (32px / 48px / 80px)
//   text      — optional label below the spinner
//   fullscreen — if true, covers the viewport with a #050505 background
export default function LoadingSpinner({
  size = "md",
  text,
  fullscreen = false,
}: {
  size?: "sm" | "md" | "lg";
  text?: string;
  fullscreen?: boolean;
}) {
  const c = SIZES[size];

  const spinner = (
    <>
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 16,
      }}>
        <div className={`fy-sp-${size}`} />
        {text && (
          <div style={{
            fontSize: 12, letterSpacing: "0.5px",
            color: "rgba(255,255,255,0.3)",
          }}>
            {text}
          </div>
        )}
      </div>
      <style>{spinnerCSS(size, c)}</style>
    </>
  );

  if (fullscreen) {
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "#050505",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {spinner}
      </div>
    );
  }

  return spinner;
}
