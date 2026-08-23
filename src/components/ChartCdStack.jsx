import { useLayoutEffect, useRef } from "react";
import { useDragScroll } from "../useDragScroll.js";
import { spineMeta } from "../cdSpineMeta.js";

/** Vertical CD stack — same case as genre spindle; insert shows full shuffled mix. */
export default function ChartCdStack({
  layers,
  mix,
  insertOpen,
  stackBusy,
  onAdd,
  onPutBack,
  onPutInPlayer,
}) {
  const busy = stackBusy;
  const scrollRef = useRef(null);
  const trayRef = useRef(null);
  const rowRef = useRef(null);
  const queryRef = useRef(null);
  useDragScroll(scrollRef, { axis: "y" });

  const panelOpen = Boolean(insertOpen && layers.length > 0);
  const panelMeta = layers.length > 0 ? spineMeta(layers.length - 1) : null;
  const tracks = Array.isArray(mix?.tracks) ? mix.tracks : [];
  const canPlay = !busy && mix && mix.playableCount >= 2;

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

  async function submitAdd(e) {
    e.preventDefault();
    const input = queryRef.current;
    const clean = input?.value.trim() || "";
    if (!clean || busy) return;
    const ok = await onAdd?.(clean);
    if (ok && input) input.value = "";
  }

  const panelClass = ["cd-panel", panelOpen ? "is-open" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="cd-stack-block">
      <h3 className="picker-section-title">make your own playlist!</h3>
      <p className="section-sub chart-search-sub">(add artists/albums/eras)</p>

      <form className="chart-search cd-stack-add" onSubmit={submitAdd}>
        <div className="join-code-row">
          <div className="chart-search-field">
            <label className="chart-search-label">
              <input
                ref={queryRef}
                className="guess-input join-code-input chart-search-input"
                placeholder="steve lacy, drake, 2002 malayalam…"
                defaultValue=""
                disabled={busy}
                autoCorrect="off"
                spellCheck={false}
                aria-label="Add artist or era to the stack"
              />
            </label>
          </div>
          <button type="submit" className="btn btn-ghost" disabled={busy}>
            {stackBusy ? "…" : "add"}
          </button>
        </div>
      </form>

      <div
        ref={rowRef}
        className={`cd-row cd-stack-row${panelOpen ? " is-picking" : ""}${layers.length ? " has-discs" : ""}`}
      >
        <figure
          className="cd-tray cd-stack-tray"
          ref={trayRef}
          aria-label="Temporary mix as a stacked CD spindle"
        >
          <div className="cd-tray-inner cd-stack-tray-inner">
            {layers.length === 0 ? (
              <p className="cd-stack-empty">add something — discs stack here</p>
            ) : (
              <ul className="cd-stack-discs" ref={scrollRef}>
                {layers.map((layer, i) => {
                  const meta = spineMeta(i);
                  const histCls = meta.history.map((h) => `cd-spine--${h}`).join(" ");
                  const fontCls = meta.font ? `cd-spine--font-${meta.font}` : "";

                  return (
                    <li
                      key={layer.id}
                      className="cd-stack-disc-slot"
                      style={{ "--stack-i": i }}
                    >
                      <div
                        className={`cd-stack-disc cd-spine--${meta.tone} ${histCls} ${fontCls}`.trim()}
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
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <figcaption className="cd-tray-caption">cd case</figcaption>
          {layers.length > 1 ? (
            <p className="cd-tray-hint">scroll for more</p>
          ) : null}
        </figure>

        <aside className={panelClass} aria-hidden={!panelOpen} aria-live="polite">
          {panelOpen && panelMeta ? (
            <div
              className={[
                "cd-insert",
                `cd-spine--${panelMeta.tone}`,
                panelMeta.history.includes("faded") ? "is-faded" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="cd-insert-head">
                <h2
                  className={`cd-insert-title${
                    panelMeta.font === "hand"
                      ? " hand"
                      : panelMeta.font === "serif"
                        ? " serif"
                        : ""
                  }`}
                >
                  {mix?.name || "Your mix"}
                </h2>
                <p className="cd-insert-meta">
                  <span>{layers.length} disc{layers.length === 1 ? "" : "s"}</span>
                  <span aria-hidden="true"> · </span>
                  <span>{busy ? "…" : `${tracks.length} tracks`}</span>
                  <span aria-hidden="true"> · </span>
                  <span>shuffled</span>
                </p>
              </div>
              <div className="cd-insert-body">
                {busy ? (
                  <p className="cd-insert-notes">building your mix…</p>
                ) : tracks.length < 2 ? (
                  <p className="cd-insert-notes">
                    Add another disc — need at least 2 tracks to play.
                  </p>
                ) : (
                  <ol className="cd-insert-tracks">
                    {tracks.map((t, i) => (
                      <li key={t.id || `${t.name}-${i}`}>
                        <span className="n">{String(i + 1).padStart(2, "0")}</span>
                        <span>{t.name}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
              <div className="cd-insert-actions">
                <button
                  type="button"
                  className="cd-insert-back"
                  onClick={onPutBack}
                  disabled={busy}
                >
                  Put Back
                </button>
                <button
                  type="button"
                  className="cd-insert-play"
                  onClick={() => canPlay && onPutInPlayer?.(mix)}
                  disabled={!canPlay}
                >
                  ► Put in Player
                </button>
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
