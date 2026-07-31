import { useRef } from "react";

function PlayGlyph() {
  return (
    <svg
      className="guess-transport-glyph"
      viewBox="0 0 12 14"
      width="12"
      height="14"
      aria-hidden="true"
      focusable="false"
    >
      <path fill="currentColor" d="M2.2 1.2v11.6L11 7 2.2 1.2z" />
    </svg>
  );
}

function PauseGlyph() {
  return (
    <svg
      className="guess-transport-glyph"
      viewBox="0 0 12 14"
      width="12"
      height="14"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="2" y="1" width="3" height="12" rx="1" fill="currentColor" />
      <rect x="7" y="1" width="3" height="12" rx="1" fill="currentColor" />
    </svg>
  );
}

/**
 * Play ↔ pause swipe switch beside the artist field.
 * SVG glyphs (not emoji) so mobile stays crisp; track always has a clear well.
 */
export default function GuessTransport({
  playing,
  busy = false,
  canPlay = true,
  playLabel = "Play",
  onPlay,
  onPause,
}) {
  const startX = useRef(null);
  const disabled = busy || (!playing && !canPlay);

  function goPlay() {
    if (busy || !canPlay || playing) return;
    onPlay?.();
  }

  function goPause() {
    if (!playing) return;
    onPause?.();
  }

  function onPointerDown(e) {
    if (disabled && !playing) return;
    startX.current = e.clientX;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function onPointerUp(e) {
    if (startX.current == null) return;
    const dx = e.clientX - startX.current;
    startX.current = null;
    if (dx > 24) goPause();
    else if (dx < -24) goPlay();
    else if (playing) goPause();
    else goPlay();
  }

  return (
    <button
      type="button"
      className={`guess-transport-switch ${playing ? "is-playing" : "is-paused"}`}
      disabled={disabled}
      aria-label={playing ? "Pause" : playLabel}
      title={playing ? "Pause" : playLabel}
      aria-pressed={playing}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        startX.current = null;
      }}
    >
      <span className="guess-transport-thumb" aria-hidden="true" />
      <span className="guess-transport-slot guess-transport-slot--play" aria-hidden="true">
        <PlayGlyph />
      </span>
      <span className="guess-transport-slot guess-transport-slot--pause" aria-hidden="true">
        <PauseGlyph />
      </span>
    </button>
  );
}
