"use client";

import { useEffect, useMemo, useRef } from "react";

type SnapOptions = {
  cardSelector?: string;
  centerOffsetPx?: number;
  settleMs?: number;
  smoothWhenSlow?: boolean;
};

type DebugState = {
  enabled: boolean;
  scrollLeft: number;
  velocity: number;
  dragging: boolean;
  snapping: "on" | "off";
  intent: "none" | "horizontal" | "vertical";
};

export function useCarouselSnap(opts?: SnapOptions) {
  const options = useMemo(
    () => ({
      cardSelector: opts?.cardSelector ?? "[data-card='1']",
      centerOffsetPx: opts?.centerOffsetPx ?? 0,
      settleMs: opts?.settleMs ?? 90,
      smoothWhenSlow: opts?.smoothWhenSlow ?? true,
    }),
    [opts?.cardSelector, opts?.centerOffsetPx, opts?.settleMs, opts?.smoothWhenSlow]
  );

  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const draggingRef = useRef(false);
  const snappingRef = useRef(true);

  const startPtRef = useRef<{ x: number; y: number } | null>(null);
  const intentRef = useRef<DebugState["intent"]>("none");

  const rafRef = useRef<number>(0);
  const lastLeftRef = useRef<number>(0);
  const lastTRef = useRef<number>(0);
  const velocityRef = useRef<number>(0);

  const settleTimerRef = useRef<any>(null);

  const debugRef = useRef<HTMLDivElement | null>(null);
  const debugEnabled = useMemo(() => {
    if (typeof window === "undefined") return false;
    const sp = new URLSearchParams(window.location.search);
    return sp.get("debug") === "1";
  }, []);

  function setDebug(partial: Partial<DebugState>) {
    if (!debugEnabled || !debugRef.current) return;
    const el = debugRef.current;

    const cur: DebugState =
      (el as any).__dbg ??
      ({
        enabled: true,
        scrollLeft: 0,
        velocity: 0,
        dragging: false,
        snapping: "on",
        intent: "none",
      } as DebugState);

    const next = { ...cur, ...partial };
    (el as any).__dbg = next;

    el.textContent =
      `scrollLeft: ${Math.round(next.scrollLeft)}\n` +
      `velocity: ${next.velocity.toFixed(3)} px/ms\n` +
      `dragging: ${next.dragging ? "yes" : "no"}\n` +
      `snapping: ${next.snapping}\n` +
      `intent: ${next.intent}`;
  }

  function getCards(scroller: HTMLDivElement) {
    return Array.from(scroller.querySelectorAll<HTMLElement>(options.cardSelector));
  }

  function clearSettleTimer() {
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    settleTimerRef.current = null;
  }

  function snapToNearest(scroller: HTMLDivElement) {
    if (!snappingRef.current) return;

    const cards = getCards(scroller);
    if (!cards.length) return;

    const rect = scroller.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2 + options.centerOffsetPx;

    let bestCard: HTMLElement | null = null;
    let bestDist = Infinity;

    for (const c of cards) {
      const r = c.getBoundingClientRect();
      const mid = r.left + r.width / 2;
      const dist = Math.abs(centerX - mid);
      if (dist < bestDist) {
        bestDist = dist;
        bestCard = c;
      }
    }

    if (!bestCard) return;

    const targetLeft =
      bestCard.offsetLeft - (scroller.clientWidth / 2 - bestCard.clientWidth / 2);

    const vel = Math.abs(velocityRef.current);
    const useSmooth = options.smoothWhenSlow && vel < 0.9;

    scroller.scrollTo({
      left: Math.max(0, targetLeft),
      behavior: useSmooth ? "smooth" : "auto",
    });

    setDebug({ snapping: "on" });
  }

  function scheduleSnap(scroller: HTMLDivElement) {
    clearSettleTimer();
    settleTimerRef.current = setTimeout(() => {
      if (!draggingRef.current) snapToNearest(scroller);
    }, options.settleMs);
  }

  function startVelocityLoop(scroller: HTMLDivElement) {
    cancelAnimationFrame(rafRef.current);

    function tick(t: number) {
      if (!lastTRef.current) lastTRef.current = t;
      const dt = t - lastTRef.current;
      const nowLeft = scroller.scrollLeft;

      if (dt > 0) {
        const dx = nowLeft - lastLeftRef.current;
        velocityRef.current = dx / dt;
      }

      lastLeftRef.current = nowLeft;
      lastTRef.current = t;

      setDebug({
        scrollLeft: nowLeft,
        velocity: velocityRef.current,
        dragging: draggingRef.current,
        snapping: snappingRef.current ? "on" : "off",
        intent: intentRef.current,
      });

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
  }

  function onDown(x: number, y: number) {
    startPtRef.current = { x, y };
    intentRef.current = "none";
    snappingRef.current = false; // não brigar enquanto arrasta
    setDebug({ snapping: "off" });
  }

  function onMove(x: number, y: number) {
    const s = startPtRef.current;
    if (!s) return;

    const dx = x - s.x;
    const dy = y - s.y;

    if (intentRef.current === "none") {
      if (Math.abs(dy) > Math.abs(dx)) intentRef.current = "vertical";
      else intentRef.current = "horizontal";
    }
  }

  function onUp() {
    startPtRef.current = null;
    snappingRef.current = true;
  }

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    // esconder scrollbar (cross browser) mantendo swipe
    scroller.style.scrollbarWidth = "none";
    (scroller.style as any).msOverflowStyle = "none";
    (scroller.style as any).webkitOverflowScrolling = "touch";

    startVelocityLoop(scroller);

    const onScroll = () => scheduleSnap(scroller);

    const onPointerDown = (e: PointerEvent) => {
      draggingRef.current = true;
      onDown(e.clientX, e.clientY);
    };
    const onPointerMove = (e: PointerEvent) => onMove(e.clientX, e.clientY);
    const onPointerUp = () => {
      draggingRef.current = false;
      onUp();
      scheduleSnap(scroller);
    };

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      draggingRef.current = true;
      onDown(t.clientX, t.clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      onMove(t.clientX, t.clientY);
    };
    const onTouchEnd = () => {
      draggingRef.current = false;
      onUp();
      scheduleSnap(scroller);
    };

    scroller.addEventListener("scroll", onScroll, { passive: true });

    scroller.addEventListener("pointerdown", onPointerDown, { passive: true });
    scroller.addEventListener("pointermove", onPointerMove, { passive: true });
    scroller.addEventListener("pointerup", onPointerUp, { passive: true });
    scroller.addEventListener("pointercancel", onPointerUp, { passive: true });

    scroller.addEventListener("touchstart", onTouchStart, { passive: true });
    scroller.addEventListener("touchmove", onTouchMove, { passive: true });
    scroller.addEventListener("touchend", onTouchEnd, { passive: true });
    scroller.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearSettleTimer();

      scroller.removeEventListener("scroll", onScroll);

      scroller.removeEventListener("pointerdown", onPointerDown);
      scroller.removeEventListener("pointermove", onPointerMove);
      scroller.removeEventListener("pointerup", onPointerUp);
      scroller.removeEventListener("pointercancel", onPointerUp);

      scroller.removeEventListener("touchstart", onTouchStart);
      scroller.removeEventListener("touchmove", onTouchMove);
      scroller.removeEventListener("touchend", onTouchEnd);
      scroller.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [options.cardSelector, options.centerOffsetPx, options.settleMs, options.smoothWhenSlow, debugEnabled]);

  const DebugOverlay = debugEnabled ? (
    // JSX aqui é ok mesmo em .ts pq isso não é TSX — então vamos retornar null e deixar simples.
    null
  ) : null;

  return { scrollerRef, DebugOverlay };
}