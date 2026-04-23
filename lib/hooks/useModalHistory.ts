import { useEffect, useRef } from 'react';

/**
 * Syncs a modal's open state with the browser history stack.
 * Opening the modal pushes a history entry; pressing browser back closes
 * the modal instead of navigating away. Closing via UI cleans up the entry.
 */
export function useModalHistory(
  isOpen: boolean,
  onClose: () => void,
  modalKey: string
) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen || !modalKey) return;
    if (typeof window === 'undefined') return;

    const state = { modal: modalKey };
    window.history.pushState(state, '', window.location.href);

    const handlePopState = (e: PopStateEvent) => {
      // If the new state does NOT contain our modal key → user navigated back past it
      if (!e.state?.modal || e.state.modal !== modalKey) {
        onCloseRef.current();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      // Modal closed via UI (not via browser back): clean up the orphaned history entry.
      // Guard: only call back() if we still own the top-of-stack state, i.e. the user
      // did not already pop it themselves via the browser back button.
      if (window.history.state?.modal === modalKey) {
        window.history.back();
      }
    };
  }, [isOpen, modalKey]);
}
