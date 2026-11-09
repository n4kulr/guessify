import { useLayoutEffect, useRef, useState } from "react";
import { useDragScroll } from "../useDragScroll.js";
import { spineMeta } from "../cdSpineMeta.js";

/** Top-down CD tray — slim jewel-case spines, scroll for more; insert opens to the right. */
export default function ChartCdSpindle({ packs, loadingId, onChoose }) {
  const busy = loadingId !== null;
  const [picked, setPicked] = useState(null); // pack tag
  const scrollRef = useRef(null);
  const trayRef = useRef(null);
  const rowRef = useRef(null);
  useDragScroll(scrollRef);

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
                    {pickedPack.artists.map((name, i) => (
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
