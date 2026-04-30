"use client";

// Alarm sound helpers for the waiter portal. Combines:
//   1. /sounds/bell.mp3 — louder, more attention-grabbing on real devices.
//   2. Web Audio API synth chime — fallback when the mp3 is missing or
//      fails to play (autoplay policies, asset 404, etc.).
//
// Because mobile browsers block audio playback until the page receives a
// user gesture, callers should invoke `wakeAlertSound()` once on the first
// click so the audio element is "primed" and later plays don't get blocked.

let ctxRef: AudioContext | null = null;
let bellRef: HTMLAudioElement | null = null;
let bellWoken = false;

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

function getBell(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!bellRef) {
    try {
      bellRef = new Audio("/sounds/bell.mp3");
      bellRef.volume = 0.7;
      bellRef.preload = "auto";
    } catch {
      bellRef = null;
    }
  }
  return bellRef;
}

/**
 * Prime the bell audio so that subsequent .play() calls don't get blocked
 * by mobile autoplay policies. Safe to call multiple times — only the
 * first invocation actually does anything.
 */
export function wakeAlertSound() {
  if (bellWoken) return;
  bellWoken = true;
  const bell = getBell();
  if (!bell) return;
  bell
    .play()
    .then(() => {
      bell.pause();
      bell.currentTime = 0;
    })
    .catch(() => { /* user-gesture not yet granted; will retry on next call */
      bellWoken = false;
    });
}

function playSynthChime() {
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
}

/**
 * Two-tone chime — soft attack, quick decay. ~400ms total. Safe to call
 * frequently; failures (suspended context, user-gesture policies) are
 * swallowed so the caller isn't responsible for try/catch.
 */
export function playAlertSound() {
  const bell = getBell();
  let bellPlayed = false;
  if (bell) {
    try {
      bell.currentTime = 0;
      const p = bell.play();
      if (p && typeof p.then === "function") {
        bellPlayed = true;
        p.catch(() => { playSynthChime(); });
      } else {
        bellPlayed = true;
      }
    } catch { /* fall through to synth */ }
  }
  if (!bellPlayed) playSynthChime();

  // Also vibrate on supporting mobile devices.
  try {
    if (typeof navigator !== "undefined" && (navigator as any).vibrate) {
      (navigator as any).vibrate([200, 100, 200]);
    }
  } catch { /* */ }
}
