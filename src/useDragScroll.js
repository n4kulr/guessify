import { useEffect } from "react";

/**
 * Mouse click-drag for overflow-x shelves.
 * Trackpad / touch scrolling stays native (compositor) so it feels like mobile —
 * do not intercept wheel; preventDefault + scrollLeft is what made it laggy.
 */
export function useDragScroll(scrollRef) {
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let dragging = false;
    let startX = 0;
    let startScroll = 0;
    let pointerId = null;
    let suppressClick = false;

    function onDown(e) {
      if (e.pointerType === "touch") return;
      if (e.button !== 0) return;
      dragging = false;
      startX = e.clientX;
      startScroll = el.scrollLeft;
      pointerId = e.pointerId;
    }
    function onMove(e) {
      if (pointerId !== e.pointerId) return;
      if (e.pointerType === "touch") return;
      const dx = e.clientX - startX;
      if (!dragging) {
        if (Math.abs(dx) < 8) return;
        dragging = true;
        suppressClick = true;
        el.setPointerCapture?.(e.pointerId);
      }
      el.scrollLeft = startScroll - dx;
    }
    function onUp(e) {
      if (pointerId != null && e.pointerId !== pointerId) return;
      pointerId = null;
      if (dragging) {
        dragging = false;
        requestAnimationFrame(() => {
          suppressClick = false;
        });
      }
    }
    function onClickCapture(e) {
      if (suppressClick) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
    function onDragStart(e) {
      e.preventDefault();
    }

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("click", onClickCapture, true);
    el.addEventListener("dragstart", onDragStart);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("click", onClickCapture, true);
      el.removeEventListener("dragstart", onDragStart);
    };
  }, [scrollRef]);
}
