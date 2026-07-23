import { useEffect, useLayoutEffect, useRef, useState } from "react";

const TONES = [
  "clear", "white", "black", "grey", "smoke", "amber", "slate", "frost",
  "blue", "purple", "yellowed",
];
const FONTS = ["", "hand", "serif", "mono", "thin", "condensed"];
const HISTORIES = [
  ["new"],
  ["used"],
  ["faded"],
  ["used", "cracked"],
  ["faded", "cracked"],
  ["used", "sticker"],
  ["new"],
  ["used"],
  ["faded"],
  ["cracked"],
];
const WIDTHS = [0.88, 0.94, 1, 1.06, 1.12];
const TILTS = [-0.4, 0, 0, 0.3, 0.5];
const DEPTHS = [0, 0, 1, -1, 0];
const STICKERS = [
  null,
  { kind: "round", text: "★", cls: "star", x: "18%", y: "14%", rot: 8 },
  { kind: "price", text: "$4.99", x: "14%", y: "70%", rot: 6 },
  { kind: "square", text: "MIX", x: "18%", y: "16%", rot: -4 },
  { kind: "lib", text: "LIVE", x: "12%", y: "78%", rot: 2 },
  { kind: "round", text: "♥", cls: "heart", x: "28%", y: "20%", rot: -10 },
  { kind: "square", text: "NEW", x: "20%", y: "10%", rot: 3 },
  { kind: "square", text: "2008", x: "10%", y: "58%", rot: -11, peel: true },
  null,
];
const BURNED = ["July 2008", "Summer 2009", "Mar 2011", "Aug 2005", "Winter 2010"];
const RUNTIME = ["1:58:42", "2:04:11", "1:45:02", "2:11:00", "1:28:15"];
const TRACK_N = [28, 32, 34, 36, 40];

function spineMeta(i) {
  return {
    tone: TONES[i % TONES.length],
    font: FONTS[i % FONTS.length],
    history: HISTORIES[i % HISTORIES.length],
    wScale: WIDTHS[i % WIDTHS.length],
    tilt: TILTS[i % TILTS.length],
    depth: DEPTHS[i % DEPTHS.length],
    sticker: STICKERS[i % STICKERS.length],
    burned: BURNED[i % BURNED.length],
    tracks: TRACK_N[i % TRACK_N.length],
    runtime: RUNTIME[i % RUNTIME.length],
  };
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

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("click", onClickCapture, true);
    surface.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("click", onClickCapture, true);
      surface.removeEventListener("wheel", onWheel);
    };
  }, [scrollRef, surfaceRef]);
}

/** Top-down CD tray — slim jewel-case spines, scroll for more; insert opens to the right. */
export default function ChartCdSpindle({ packs, loadingId, onChoose }) {
  const busy = loadingId !== null;
  const [picked, setPicked] = useState(null); // pack tag
  const scrollRef = useRef(null);
  const trayRef = useRef(null);
  const rowRef = useRef(null);
  useDragScroll(scrollRef, trayRef);

  const pickedPack = picked
    ? packs.find((p) => p.tag === picked) || null
    : null;
  const pickedIndex = pickedPack
    ? packs.findIndex((p) => p.tag === pickedPack.tag)
    : -1;
  const pickedMeta = pickedIndex >= 0 ? spineMeta(pickedIndex) : null;
  const panelOpen = Boolean(pickedPack && pickedMeta);

  useLayoutEffect(() => {
    const tray = trayRef.current;
    const row = rowRef.current;
    if (!tray || !row) return;
    function syncSize() {
      // Match the outer cd-tray box, then inset so the insert looks like it slides out.
      const peek = 16;
      const inset = peek / 2;
      row.style.setProperty("--cd-panel-top", `${inset}px`);
      row.style.setProperty("--cd-panel-h", `${Math.max(0, tray.offsetHeight - peek)}px`);
      row.style.setProperty("--cd-panel-side", `${inset}px`);
      row.style.setProperty("--cd-panel-w", `${Math.max(0, tray.offsetWidth - peek)}px`);
    }
    syncSize();
    const ro = new ResizeObserver(syncSize);
    ro.observe(tray);
    window.addEventListener("resize", syncSize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", syncSize);
    };
  }, [panelOpen, packs.length]);

  function selectPack(tag) {
    if (busy) return;
    setPicked(tag);
  }

  function putBack() {
    setPicked(null);
  }

  function confirmPlay() {
    if (!pickedPack || busy) return;
    onChoose(pickedPack.tag);
  }

  const panelClass = ["cd-panel", panelOpen ? "is-open" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={rowRef}
      className={`cd-row${panelOpen ? " is-picking" : ""}`}
    >
      <figure
        className="cd-tray"
        ref={trayRef}
        aria-label="Chart packs as a CD storage box"
      >
        <div className="cd-tray-inner">
          <ul className="cd-spines" ref={scrollRef}>
            {packs.map((pack, i) => {
              const id = `chart:${pack.tag}`;
              const selected = picked === pack.tag || loadingId === id;
              const meta = spineMeta(i);
              const histCls = meta.history.map((h) => `cd-spine--${h}`).join(" ");
              const fontCls = meta.font ? `cd-spine--font-${meta.font}` : "";

              return (
                <li
                  key={pack.tag}
                  className={`cd-spine-slot${selected ? " is-out" : ""}`}
                >
                  <button
                    type="button"
                    className={`cd-spine cd-spine--${meta.tone} ${histCls} ${fontCls}${selected ? " is-selected" : ""}`.trim()}
                    style={{
                      "--w-scale": meta.wScale,
                      "--tilt": `${meta.tilt}deg`,
                      "--depth": `${meta.depth}px`,
                    }}
                    onClick={() => selectPack(pack.tag)}
                    disabled={busy}
                    aria-label={pack.label}
                    title={pack.label}
                  >
                    <span className="cd-spine-title">
                      {loadingId === id ? "…" : pack.label}
                    </span>
                    {meta.history.includes("cracked") ? (
                      <span className="cd-crack" aria-hidden="true" />
                    ) : null}
                    {meta.sticker ? (
                      <span
                        className={`cd-sticker cd-sticker--${meta.sticker.kind}${
                          meta.sticker.cls ? ` ${meta.sticker.cls}` : ""
                        }${meta.sticker.peel ? " cd-sticker--peel" : ""}`}
                        style={{
                          left: meta.sticker.x,
                          top: meta.sticker.y,
                          transform: `rotate(${meta.sticker.rot || 0}deg)`,
                        }}
                        aria-hidden="true"
                      >
                        {meta.sticker.text}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <figcaption className="cd-tray-caption">cd case</figcaption>
        <p className="cd-tray-hint">swipe / drag for more</p>
      </figure>

      <aside
        className={panelClass}
        aria-hidden={!panelOpen}
        aria-live="polite"
      >
        {pickedPack && pickedMeta ? (
          <div
            className={[
              "cd-insert",
              `cd-spine--${pickedMeta.tone}`,
              pickedMeta.history.includes("faded") ? "is-faded" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div className="cd-insert-head">
              <h2
                className={`cd-insert-title${
                  pickedMeta.font === "hand"
                    ? " hand"
                    : pickedMeta.font === "serif"
                      ? " serif"
                      : ""
                }`}
              >
                {pickedPack.label}
              </h2>
              <p className="cd-insert-meta">
                <span>Burned {pickedMeta.burned}</span>
                <span aria-hidden="true"> · </span>
                <span>{pickedMeta.tracks} tracks</span>
                <span aria-hidden="true"> · </span>
                <span>{pickedMeta.runtime}</span>
              </p>
            </div>
            <div className="cd-insert-body">
              {(pickedPack.about || pickedPack.blurb) && (
                <p className="cd-insert-notes">
                  {pickedPack.about || pickedPack.blurb}
                </p>
              )}
              {pickedPack.artists?.length ? (
                <div className="cd-insert-feat-block">
                  <p className="cd-insert-feat">Featuring</p>
                  <ol className="cd-insert-tracks">
                    {pickedPack.artists.slice(0, 4).map((name, i) => (
                      <li key={name}>
                        <span className="n">{String(i + 1).padStart(2, "0")}</span>
                        <span>{name}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </div>
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
                ► Put in Player
              </button>
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
