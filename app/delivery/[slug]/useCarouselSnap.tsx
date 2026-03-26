"use client";

import * as React from "react";

type Options = {
  /** índice inicial para centralizar (padrão 0) */
  initialIndex?: number;
  /** ms para considerar que o scroll “parou” */
  settleMs?: number;
  /** liga overlay debug se quiser depois (?debug=1) */
  debug?: boolean;
};

export function useCarouselSnap(opts: Options = {}) {
  const { initialIndex = 0, settleMs = 90 } = opts;

  const scrollerRef = React.useRef<HTMLDivElement | null>(null);

  // refs para não re-render durante scroll
  const isPointerDownRef = React.useRef(false);
  const intentRef = React.useRef<"none" | "h" | "v">("none");
  const startRef = React.useRef<{ x: number; y: number } | null>(null);

  const settleTimer = React.useRef<number | null>(null);

  const [activeIndex, setActiveIndex] = React.useState<number>(initialIndex);

  const clearSettle = () => {
    if (settleTimer.current) {
      window.clearTimeout(settleTimer.current);
      settleTimer.current = null;
    }
  };

  const getItems = React.useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return [];
    return Array.from(scroller.querySelectorAll<HTMLElement>("[data-carousel-item]"));
  }, []);

  const centerToIndex = React.useCallback(
    (idx: number, behavior: ScrollBehavior) => {
      const scroller = scrollerRef.current;
      if (!scroller) return;

      const items = getItems();
      const el = items[idx];
      if (!el) return;

      const scRect = scroller.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();

      const scCenter = scRect.left + scRect.width / 2;
      const elCenter = elRect.left + elRect.width / 2;

      const delta = elCenter - scCenter;
      const target = scroller.scrollLeft + delta;

      scroller.scrollTo({ left: target, behavior });
    },
    [getItems]
  );

  const findNearestIndex = React.useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return 0;

    const items = getItems();
    if (!items.length) return 0;

    const scRect = scroller.getBoundingClientRect();
    const scCenter = scRect.left + scRect.width / 2;

    let best = 0;
    let bestDist = Infinity;

    for (let i = 0; i < items.length; i++) {
      const r = items[i].getBoundingClientRect();
      const c = r.left + r.width / 2;
      const d = Math.abs(c - scCenter);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }

    return best;
  }, [getItems]);

  const settle = React.useCallback(() => {
    // só realinha quando o usuário solta / termina
    const idx = findNearestIndex();
    setActiveIndex(idx);
    // realinha rápido, mas SEM “brigar”
    centerToIndex(idx, "smooth");
  }, [centerToIndex, findNearestIndex]);

  const scheduleSettle = React.useCallback(() => {
    clearSettle();
    settleTimer.current = window.setTimeout(() => {
      // se o gesto foi vertical, não força snap
      if (intentRef.current === "v") return;
      settle();
    }, settleMs);
  }, [settle, settleMs]);

  // ✅ inicial: centraliza hero ao abrir (instantâneo)
  React.useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    // iOS smooth native (sem TS error)
    (scroller.style as any).webkitOverflowScrolling = "touch";

    // centraliza sem animação no primeiro frame
    requestAnimationFrame(() => {
      centerToIndex(initialIndex, "auto");
      setActiveIndex(initialIndex);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // listeners leves: SEM preventDefault (para não travar vertical no iOS)
  const onPointerDown = React.useCallback((e: React.PointerEvent) => {
    isPointerDownRef.current = true;
    intentRef.current = "none";
    startRef.current = { x: e.clientX, y: e.clientY };
    clearSettle();
  }, []);

  const onPointerMove = React.useCallback((e: React.PointerEvent) => {
    if (!isPointerDownRef.current) return;
    const s = startRef.current;
    if (!s) return;

    const dx = Math.abs(e.clientX - s.x);
    const dy = Math.abs(e.clientY - s.y);

    // trava intenção só 1 vez
    if (intentRef.current === "none") {
      intentRef.current = dx > dy ? "h" : "v";
    }
  }, []);

  const onPointerUp = React.useCallback(() => {
    isPointerDownRef.current = false;
    scheduleSettle();
  }, [scheduleSettle]);

  const onScroll = React.useCallback(() => {
    // não faz setState aqui (proibido), só agenda settle
    scheduleSettle();
  }, [scheduleSettle]);

  return {
    scrollerRef,
    activeIndex,
    centerToIndex,
    bind: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      onScroll,
    } as const,
  };
}