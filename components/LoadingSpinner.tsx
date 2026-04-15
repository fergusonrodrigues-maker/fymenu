"use client";

import React from "react";

// ── Size config ───────────────────────────────────────────────────────────────
const CFG = {
  sm: { dim: 32, ring: "5px",  glow: "0.6rem" },
  md: { dim: 48, ring: "7px",  glow: "0.8rem" },
  lg: { dim: 64, ring: "9px",  glow: "1rem"   },
} as const;

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

// ── LoadingSpinner ────────────────────────────────────────────────────────────
// Replicates the exact landing page fy-loader animation.
// Props:
//   size     — 'sm' | 'md' | 'lg'  (32px / 48px / 64px)
//   text     — optional label below the spinner
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
  const c = CFG[size];
  // Per-size keyframe names avoid conflicts when multiple sizes render simultaneously
  const kIn  = `lsIn_${size}`;
  const kOut = `lsOut_${size}`;

  const spinner = (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 16,
    }}>
      {/* Ring container — subtle glow matches landing */}
      <div style={{
        position: "relative",
        display: "flex", alignItems: "center", justifyContent: "center",
        width: c.dim, height: c.dim,
        borderRadius: "50%",
        boxShadow: "0 0 20px rgba(0,255,174,0.15)",
      }}>
        {/* Inner ring — pulses inward (mirrors .fy-loader::before) */}
        <div style={{
          position: "absolute",
          width: "100%", height: "100%",
          borderRadius: "50%",
          filter: `drop-shadow(0 0 ${c.glow} rgba(0,255,174,0.6))`,
          animation: `${kIn} 1.8s ease-in-out infinite`,
        }} />
        {/* Outer ring — pulses outward (mirrors .fy-loader::after) */}
        <div style={{
          position: "absolute",
          width: "100%", height: "100%",
          borderRadius: "50%",
          filter: `drop-shadow(0 0 ${c.glow} rgba(0,255,174,0.6))`,
          animation: `${kOut} 1.8s ease-in-out infinite`,
        }} />
      </div>

      {text && (
        <div style={{
          fontSize: 12, letterSpacing: "0.5px",
          color: "rgba(255,255,255,0.3)",
        }}>
          {text}
        </div>
      )}

      <style>{`
        @keyframes ${kIn} {
          0%        { box-shadow: inset 0 0 0 ${c.ring} #00ffae; opacity: 1; }
          50%, 100% { box-shadow: inset 0 0 0 0        #00ffae; opacity: 0; }
        }
        @keyframes ${kOut} {
          0%, 50%   { box-shadow: 0 0 0 0        #00ffae; opacity: 0; }
          100%      { box-shadow: 0 0 0 ${c.ring} #00ffae; opacity: 1; }
        }
      `}</style>
    </div>
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
