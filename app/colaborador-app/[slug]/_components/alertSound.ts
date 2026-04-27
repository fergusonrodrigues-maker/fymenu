"use client";

// Web Audio API beep — no asset file required, no autoplay-policy issues
// once the user has interacted with the page (login click counts).
let ctxRef: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (typeof window === "undefined") return null;
    if (!ctxRef) {
      const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) return null;
      ctxRef = new Ctor();
    }
    return ctxRef;
  } catch {
    return null;
  }
}

/**
 * Two-tone chime — soft attack, quick decay. ~400ms total. Safe to call
 * frequently; failures (suspended context, user-gesture policies) are
 * swallowed so the caller isn't responsible for try/catch.
 */
export function playAlertSound() {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") void ctx.resume();
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, t0);
    osc.frequency.linearRampToValueAtTime(660, t0 + 0.18);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(0.28, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4);
    osc.start(t0);
    osc.stop(t0 + 0.45);
  } catch { /* */ }

  // Also vibrate on supporting mobile devices.
  try {
    if (typeof navigator !== "undefined" && (navigator as any).vibrate) {
      (navigator as any).vibrate([180, 80, 180]);
    }
  } catch { /* */ }
}
