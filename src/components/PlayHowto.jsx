import { useEffect, useId, useRef } from "react";
import { PauseIcon, PlayIcon } from "./icons.jsx";

function HowtoPlayCtrl() {
  return (
    <span className="howto-ctrl howto-ctrl--play" aria-hidden="true">
      <span className="guess-transport-switch is-paused">
        <span className="guess-transport-thumb" />
        <span className="guess-transport-slot guess-transport-slot--play">
          <PlayIcon className="guess-transport-glyph" width="11" height="11" />
        </span>
        <span className="guess-transport-slot guess-transport-slot--pause">
          <PauseIcon className="guess-transport-glyph" width="11" height="11" />
        </span>
      </span>
    </span>
  );
}

function HowtoSkipCtrl() {
  return (
    <span className="howto-ctrl howto-ctrl--skip" aria-hidden="true">
      <span className="btn-label">skip</span>
      <span className="btn-hint">+audio</span>
    </span>
  );
}

/** Shared how-to steps (first-run splash + ? fab). */
export function PlayHowtoSteps({ race = true }) {
  return (
    <ol className="play-howto-steps">
      <li>
        <HowtoPlayCtrl />
        Play a short snippet of a song.
      </li>
      <li>Guess the song title or the artist.</li>
      <li>
        <HowtoSkipCtrl />
        Skip if you’re stuck — unlocks more audio.
      </li>
      {race && (
        <li>
          First person to nail the <b>title</b> wins the round.
        </li>
      )}
    </ol>
  );
}

/**
 * First-run tips shown once before solo / host / online starts.
 */
export default function PlayHowto({ mode, onDone, onPrivacy }) {
  const titleId = useId();
  const okRef = useRef(null);

  useEffect(() => {
    okRef.current?.focus();
    function onKey(e) {
      if (e.key === "Escape" || e.key === "Enter") onDone?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDone]);

  let modeLine = "You’ll race others on today’s charts.";
  if (mode === "solo") {
    modeLine = "You’re playing alone on this phone.";
  } else if (mode === "multi") {
    modeLine = "You’ll pick a playlist, then friends join with a code.";
  }

  return (
    <div
      className="spotlight-scrim play-howto-scrim"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onDone?.();
      }}
    >
      <div
        className="spotlight-card play-howto"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="spotlight-head">
          <h2 id={titleId} className="spotlight-title">
            quick how to play
          </h2>
          <p className="spotlight-hint">{modeLine}</p>
        </div>

        <PlayHowtoSteps race={mode !== "solo"} />

        <div className="spotlight-actions">
          <button
            ref={okRef}
            type="button"
            className="btn btn-big btn-play"
            onClick={onDone}
          >
            <span className="btn-play-icon" aria-hidden="true" />
            got it — let’s go
          </button>
        </div>

        {onPrivacy && (
          <p className="play-howto-foot">
            <button
              type="button"
              className="footer-credit footer-privacy"
              onClick={onPrivacy}
            >
              privacy
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

export const HOWTO_KEY = "guessify-howto-seen";
export const PICKER_TOUR_KEY = "guessify-picker-tour";

export function hasSeenPlayHowto() {
  try {
    return localStorage.getItem(HOWTO_KEY) === "1";
  } catch {
    return false;
  }
}

export function markPlayHowtoSeen() {
  try {
    localStorage.setItem(HOWTO_KEY, "1");
  } catch {
    /* ignore */
  }
}

/** First-run only: set when howto finishes, before they hit the picker. */
export function markPickerTourPending() {
  try {
    if (localStorage.getItem(PICKER_TOUR_KEY) === "1") return;
    localStorage.setItem(PICKER_TOUR_KEY, "pending");
  } catch {
    /* ignore */
  }
}

export function pickerTourPending() {
  try {
    return localStorage.getItem(PICKER_TOUR_KEY) === "pending";
  } catch {
    return false;
  }
}

export function markPickerTourSeen() {
  try {
    localStorage.setItem(PICKER_TOUR_KEY, "1");
  } catch {
    /* ignore */
  }
}
