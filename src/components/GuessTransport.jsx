import { useRef } from "react";

/**
 * Play ↔ pause swipe switch beside the artist field.
 * Always shows a track background; the thumb slides under the active icon.
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
    // Swipe toward pause (right) or play (left); small moves = click toggle.
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
        <span className="btn-play-icon" />
      </span>
      <span className="guess-transport-slot guess-transport-slot--pause" aria-hidden="true">
        <span className="btn-pause-icon" />
      </span>
    </button>
  );
}
