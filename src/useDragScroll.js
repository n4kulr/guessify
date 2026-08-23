import { useEffect } from "react";

/**
 * Mouse click-drag for overflow-x shelves.
 * Trackpad sideways stays native. Vertical mouse-wheel (Windows) is mapped
 * to scrollLeft — intercepting every trackpad pixel is what felt laggy.
 *
 * Pointermove is bound on window after down so Windows mouse-drag keeps
 * working when the cursor leaves a CD button / the strip.
 */
export function useDragScroll(scrollRef, { axis = "x" } = {}) {
  const vertical = axis === "y";
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let dragging = false;
    let startPos = 0;
    let startScroll = 0;
    let pointerId = null;
    let suppressClick = false;

    function onMove(e) {
      if (pointerId !== e.pointerId) return;
      if (e.pointerType === "touch") return;
      const delta = vertical ? e.clientY - startPos : e.clientX - startPos;
      if (!dragging) {
        if (Math.abs(delta) < 8) return;
        dragging = true;
        suppressClick = true;
      }
      if (vertical) el.scrollTop = startScroll - delta;
      else el.scrollLeft = startScroll - delta;
    }
    function onUp(e) {
      if (pointerId != null && e.pointerId !== pointerId) return;
      pointerId = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (dragging) {
        dragging = false;
        requestAnimationFrame(() => {
          suppressClick = false;
        });
      }
    }
    function onDown(e) {
      if (e.pointerType === "touch") return;
      if (e.button !== 0) return;
      dragging = false;
      startPos = vertical ? e.clientY : e.clientX;
      startScroll = vertical ? el.scrollTop : el.scrollLeft;
      pointerId = e.pointerId;
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    }
    function onWheel(e) {
      if (e.ctrlKey) return;
      if (vertical) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      let dx = e.deltaY;
      if (e.deltaMode === 1) dx *= 40;
      if (!dx) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 1) return;
      const next = Math.max(0, Math.min(max, el.scrollLeft + dx));
      if (next === el.scrollLeft) return;
      e.preventDefault();
      el.scrollLeft = next;
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
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("click", onClickCapture, true);
    el.addEventListener("dragstart", onDragStart);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("click", onClickCapture, true);
      el.removeEventListener("dragstart", onDragStart);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [scrollRef, vertical]);
}
