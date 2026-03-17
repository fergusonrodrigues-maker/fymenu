import { useEffect, useRef } from 'react';

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

const SWIPE_THRESHOLD = 50; // px mínimo
const SWIPE_TIMEOUT = 500;  // ms

export function useSwipeGesture(
  ref: React.RefObject<HTMLElement | null>,
  handlers: SwipeHandlers
) {
  const touch = useRef({ startX: 0, startY: 0, startTime: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      touch.current = {
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        startTime: Date.now(),
      };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const { startX, startY, startTime } = touch.current;
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const duration = Date.now() - startTime;

      if (duration > SWIPE_TIMEOUT) return;

      const deltaX = endX - startX;
      const deltaY = endY - startY;

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > SWIPE_THRESHOLD) handlers.onSwipeRight?.();
        else if (deltaX < -SWIPE_THRESHOLD) handlers.onSwipeLeft?.();
      } else {
        if (deltaY > SWIPE_THRESHOLD) handlers.onSwipeDown?.();
        else if (deltaY < -SWIPE_THRESHOLD) handlers.onSwipeUp?.();
      }
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [ref, handlers]);
}
