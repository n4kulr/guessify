import { useEffect, useLayoutEffect, useRef, useState } from "react";

const TONES = [
  "clear", "white", "black", "grey", "smoke", "amber", "slate", "frost",
  "blue", "purple", "yellowed",
];

function toneOf(i) {
  return TONES[i % TONES.length];
}

function useDragScroll(scrollRef, surfaceRef) {
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
      // Stop browser image-drag so mouse can scroll the shelf.
      if (e.target?.closest?.("img, button")) {
        e.preventDefault();
      }
      dragging = false;
      startX = e.clientX;
      startScroll = el.scrollLeft;
      pointerId = e.pointerId;
      surface.setPointerCapture?.(e.pointerId);
    }
    function onMove(e) {
      if (pointerId !== e.pointerId) return;
      if (e.pointerType === "touch") return;
      const dx = e.clientX - startX;
      if (!dragging) {
        if (Math.abs(dx) < 6) return;
        dragging = true;
        suppressClick = true;
      }
      e.preventDefault();
      el.scrollLeft = startScroll - dx;
    }
    function onUp(e) {
      if (pointerId != null && e.pointerId !== pointerId) return;
      pointerId = null;
      surface.releasePointerCapture?.(e.pointerId);
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
      const dx = e.deltaX !== 0 ? e.deltaX : e.deltaY;
      if (dx === 0) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      const next = Math.max(0, Math.min(max, el.scrollLeft + dx));
      if (next === el.scrollLeft) return;
      e.preventDefault();
      el.scrollLeft = next;
    }

    surface.addEventListener("pointerdown", onDown);
    surface.addEventListener("pointermove", onMove);
    surface.addEventListener("pointerup", onUp);
    surface.addEventListener("pointercancel", onUp);
    surface.addEventListener("dragstart", onDragStart);
    el.addEventListener("click", onClickCapture, true);
    surface.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      surface.removeEventListener("pointerdown", onDown);
      surface.removeEventListener("pointermove", onMove);
      surface.removeEventListener("pointerup", onUp);
      surface.removeEventListener("pointercancel", onUp);
      surface.removeEventListener("dragstart", onDragStart);
      el.removeEventListener("click", onClickCapture, true);
      surface.removeEventListener("wheel", onWheel);
    };
  }, [scrollRef, surfaceRef]);
}

/** Horizontal jewel-case shelf for Spotify playlists (covers face out). */
export default function PlaylistCdShelf({ playlists, loadingId, onChoose }) {
  const busy = loadingId !== null;
  const [picked, setPicked] = useState(null);
  const scrollRef = useRef(null);
  const trayRef = useRef(null);
  const rowRef = useRef(null);
  useDragScroll(scrollRef, trayRef);

  const pickedPlaylist = picked
    ? playlists.find((p) => p.id === picked) || null
    : null;
  const pickedIndex = pickedPlaylist
    ? playlists.findIndex((p) => p.id === pickedPlaylist.id)
    : -1;
  const panelOpen = Boolean(pickedPlaylist);

  useLayoutEffect(() => {
    const tray = trayRef.current;
    const row = rowRef.current;
    if (!tray || !row) return;
    function syncSize() {
      const peek = 16;
      const inset = peek / 2;
      row.style.setProperty("--shelf-panel-top", `${inset}px`);
      row.style.setProperty(
        "--shelf-panel-h",
        `${Math.max(0, tray.offsetHeight - peek)}px`
      );
      row.style.setProperty("--shelf-panel-side", `${inset}px`);
      row.style.setProperty(
        "--shelf-panel-w",
        `${Math.max(0, tray.offsetWidth - peek)}px`
      );
    }
    syncSize();
    const ro = new ResizeObserver(syncSize);
    ro.observe(tray);
    window.addEventListener("resize", syncSize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", syncSize);
    };
  }, [panelOpen, playlists.length]);

  function selectPack(id) {
    if (busy) return;
    setPicked((cur) => (cur === id ? null : id));
  }

  function putBack() {
    setPicked(null);
  }

  function confirmPlay() {
    if (!pickedPlaylist || busy) return;
    onChoose(pickedPlaylist);
  }

  const panelClass = ["shelf-panel", panelOpen ? "is-open" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={rowRef}
      className={`shelf-row${panelOpen ? " is-picking" : ""}`}
    >
      <figure
        className="shelf-tray"
        ref={trayRef}
        aria-label="Your playlists as CDs"
      >
        <div className="shelf-tray-inner">
          <ul className="shelf-cases" ref={scrollRef}>
            {playlists.map((p, i) => {
              const selected = picked === p.id || loadingId === p.id;
              const out = picked && picked !== p.id;
              const tone = toneOf(i);
              return (
                <li
                  key={p.id}
                  className={`shelf-slot${out ? " is-out" : ""}`}
                >
                  <button
                    type="button"
                    className={`shelf-case cd-spine--${tone}${selected ? " is-selected" : ""}`}
                    onClick={() => selectPack(p.id)}
                    disabled={busy}
                    aria-label={p.name}
                    title={p.name}
                  >
                    <span className="shelf-spine">{p.name}</span>
                    <span className="shelf-face">
                      {p.liked ? (
                        <span className="shelf-face-fallback liked">♥</span>
                      ) : p.cover ? (
                        <img src={p.cover} alt="" draggable={false} />
                      ) : (
                        <span className="shelf-face-fallback">♪</span>
                      )}
                      <span className="shelf-hinge" aria-hidden="true" />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="shelf-tray-footer">
          <figcaption className="shelf-tray-caption">your shelf</figcaption>
          <p className="shelf-tray-hint">swipe / drag for more</p>
        </div>
      </figure>

      <aside
        className={panelClass}
        aria-hidden={!panelOpen}
        aria-live="polite"
      >
        {pickedPlaylist && pickedIndex >= 0 ? (
          <div
            className={[
              "cd-insert",
              "shelf-insert",
              `cd-spine--${toneOf(pickedIndex)}`,
            ].join(" ")}
          >
            <div className="cd-insert-head">
              <h2 className="cd-insert-title hand">{pickedPlaylist.name}</h2>
              <p className="cd-insert-meta">
                {pickedPlaylist.total} tracks · burned for you
              </p>
            </div>
            <div className="cd-insert-body shelf-insert-body" />
            <div className="cd-insert-actions">
              <button
                type="button"
                className="cd-insert-back"
                onClick={putBack}
                disabled={busy}
              >
                Put Back
              </button>
              <button
                type="button"
                className="cd-insert-play"
                onClick={confirmPlay}
                disabled={busy}
              >
                {loadingId === pickedPlaylist.id ? "…" : "► Put in Player"}
              </button>
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
