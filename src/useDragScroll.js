import { useEffect } from "react";

/**
 * Click-drag + two-finger horizontal trackpad scroll for overflow-x shelves.
 * Vertical trackpad gestures are left alone so the page scrolls (mobile-like).
 */
export function useDragScroll(scrollRef, surfaceRef) {
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const surface = surfaceRef?.current || el;
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
    function onWheel(e) {
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;

      // Horizontal only. Remapping deltaY made vertical two-finger scroll
      // drag the shelf and felt laggy (esp. when the handler also ran twice).
      let dx = e.deltaX;
      if (e.shiftKey && Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
        dx = e.deltaY; // mouse wheel → horizontal
      }
      if (dx === 0) return;
      if (!e.shiftKey && Math.abs(e.deltaY) > Math.abs(dx)) return;

      if (e.deltaMode === 1) dx *= 16;
      else if (e.deltaMode === 2) dx *= el.clientWidth;

      const next = Math.max(0, Math.min(max, el.scrollLeft + dx));
      if (next === el.scrollLeft) return;
      e.preventDefault();
      el.scrollLeft = next;
    }

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("click", onClickCapture, true);
    el.addEventListener("dragstart", onDragStart);
    // One listener only — surface+el both capturing doubled every delta.
    surface.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("click", onClickCapture, true);
      el.removeEventListener("dragstart", onDragStart);
      surface.removeEventListener("wheel", onWheel, { capture: true });
    };
  }, [scrollRef, surfaceRef]);
}
