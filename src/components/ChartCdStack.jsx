import { useLayoutEffect, useRef, useState } from "react";
import { useDragScroll } from "../useDragScroll.js";
import { spineMeta } from "../cdSpineMeta.js";

/** Vertical CD stack — horizontal disc edges piled up; insert opens to the right. */
export default function ChartCdStack({
  layers,
  loadingId,
  stackBusy,
  onAdd,
  onRemove,
  onPlay,
}) {
  const busy = stackBusy || loadingId !== null;
  const [picked, setPicked] = useState(null);
  const scrollRef = useRef(null);
  const trayRef = useRef(null);
  const rowRef = useRef(null);
  const [query, setQuery] = useState("");
  useDragScroll(scrollRef, { axis: "y" });

  const pickedLayer = picked
    ? layers.find((l) => l.id === picked) || null
    : null;
  const pickedIndex = pickedLayer
    ? layers.findIndex((l) => l.id === pickedLayer.id)
    : -1;
  const pickedMeta = pickedIndex >= 0 ? spineMeta(pickedIndex) : null;
  const panelOpen = Boolean(pickedLayer && pickedMeta);

  useLayoutEffect(() => {
    const tray = trayRef.current;
    const row = rowRef.current;
    if (!tray || !row) return;
    function syncSize() {
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
  }, [panelOpen, layers.length]);

  function selectLayer(id) {
    if (busy) return;
    setPicked((cur) => (cur === id ? null : id));
  }

  async function submitAdd(e) {
    e.preventDefault();
    const clean = query.trim();
    if (!clean || busy) return;
    const ok = await onAdd?.(clean);
    if (ok) setQuery("");
  }

  const panelClass = ["cd-panel", panelOpen ? "is-open" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="cd-stack-block">
      <h3 className="picker-section-title">or stack a mix</h3>
      <p className="section-sub chart-search-sub">
        (add artists &amp; eras — they pile up)
      </p>

      <form className="chart-search cd-stack-add" onSubmit={submitAdd}>
        <div className="join-code-row">
          <div className="chart-search-field">
            <label className="chart-search-label">
              <input
                className="guess-input join-code-input chart-search-input"
                placeholder="steve lacy, drake, 2002 malayalam…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={busy}
                autoCorrect="off"
                spellCheck={false}
                aria-label="Add artist or era to the stack"
              />
            </label>
          </div>
          <button
            type="submit"
            className="btn btn-ghost"
            disabled={busy || !query.trim()}
          >
            {stackBusy ? "…" : "add"}
          </button>
        </div>
      </form>

      <div
        ref={rowRef}
        className={`cd-stack-row${panelOpen ? " is-picking" : ""}${layers.length ? " has-discs" : ""}`}
      >
        <figure
          className="cd-stack-tray"
          ref={trayRef}
          aria-label="Temporary mix as a stacked CD spindle"
        >
          <div className="cd-stack-tray-inner">
            {layers.length === 0 ? (
              <p className="cd-stack-empty">add something — discs stack here</p>
            ) : (
              <ul className="cd-stack-discs" ref={scrollRef}>
                {layers.map((layer, i) => {
                  const meta = spineMeta(i);
                  const selected = picked === layer.id;
                  const histCls = meta.history.map((h) => `cd-spine--${h}`).join(" ");
                  const fontCls = meta.font ? `cd-spine--font-${meta.font}` : "";

                  return (
                    <li
                      key={layer.id}
                      className={`cd-stack-disc-slot${selected ? " is-out" : ""}`}
                      style={{ "--stack-i": i }}
                    >
                      <button
                        type="button"
                        className={`cd-stack-disc cd-spine cd-spine--${meta.tone} ${histCls} ${fontCls}${selected ? " is-selected" : ""}`.trim()}
                        style={{
                          "--w-scale": meta.wScale,
                          "--tilt": `${meta.tilt * 0.4}deg`,
                          "--depth": `${meta.depth}px`,
                        }}
                        onClick={() => selectLayer(layer.id)}
                        disabled={busy}
                        aria-label={layer.label}
                        title={layer.label}
                      >
                        <span className="cd-stack-disc-title">{layer.label}</span>
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
            )}
          </div>
          <figcaption className="cd-tray-caption">cd stack</figcaption>
          {layers.length > 1 ? (
            <p className="cd-tray-hint">scroll for more</p>
          ) : null}
        </figure>

        <aside className={panelClass} aria-hidden={!panelOpen} aria-live="polite">
          {pickedLayer && pickedMeta ? (
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
                  {pickedLayer.label}
                </h2>
                <p className="cd-insert-meta">
                  <span>{pickedLayer.kind === "artist" ? "artist" : "era / tag"}</span>
                  {pickedLayer.fuzzy ? (
                    <>
                      <span aria-hidden="true"> · </span>
                      <span>closest match</span>
                    </>
                  ) : null}
                </p>
              </div>
              <div className="cd-insert-body">
                <p className="cd-insert-notes">
                  Layer {pickedIndex + 1} of {layers.length} in your stack.
                </p>
              </div>
              <div className="cd-insert-actions">
                <button
                  type="button"
                  className="cd-insert-back"
                  onClick={() => onRemove?.(pickedLayer.id)}
                  disabled={busy}
                >
                  Peel Off
                </button>
                <button
                  type="button"
                  className="cd-insert-play"
                  onClick={() => setPicked(null)}
                  disabled={busy}
                >
                  Keep
                </button>
              </div>
            </div>
          ) : null}
        </aside>
      </div>

      {layers.length > 0 ? (
        <div className="cd-stack-play-row">
          <button
            type="button"
            className="btn btn-play cd-stack-play"
            disabled={busy || layers.length < 1}
            onClick={() => onPlay?.()}
          >
            {loadingId === "stack:mix" ? "…" : `play ${layers.length}-disc mix`}
          </button>
        </div>
      ) : null}
    </div>
  );
}
