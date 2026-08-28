import { useRef } from "react";
import { PlayIcon, PauseIcon } from "./icons.jsx";

function PlayGlyph() {
  return <PlayIcon className="guess-transport-glyph" width="14" height="14" />;
}

function PauseGlyph() {
  return <PauseIcon className="guess-transport-glyph" width="14" height="14" />;
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
  nudge = false,
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

  let switchClass = "guess-transport-switch";
  if (playing) switchClass += " is-playing";
  else switchClass += " is-paused";
  if (nudge) switchClass += " is-nudging";

  let label = playLabel;
  if (playing) label = "Pause";

  return (
    <button
      type="button"
      className={switchClass}
      disabled={disabled}
      aria-label={label}
      title={label}
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
