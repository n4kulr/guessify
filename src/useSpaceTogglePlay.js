import { useEffect, useRef } from "react";

/** True on mouse/trackpad desktops — not phones or coarse touch tablets. */
export function isFinePointerPc() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

/**
 * PC-only: Space toggles play/pause. Skips when typing in a field or on
 * buttons (those already handle Space).
 */
export function useSpaceTogglePlay(togglePlay, enabled) {
  const toggleRef = useRef(togglePlay);
  toggleRef.current = togglePlay;

  useEffect(() => {
    if (!enabled || !isFinePointerPc()) return undefined;
    function onKey(e) {
      if (e.code !== "Space" || e.repeat) return;
      if (
        e.target.closest(
          "input, textarea, select, button, a, [contenteditable=true]"
        )
      ) {
        return;
      }
      e.preventDefault();
      void toggleRef.current?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}
