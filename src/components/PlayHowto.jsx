import { useEffect, useId, useRef } from "react";
import { PlayIcon } from "./icons.jsx";
import { APP_VERSION } from "../versionHistory.js";

/** Shared how-to steps (first-run splash + ? fab). */
export function PlayHowtoSteps({ race = true }) {
  return (
    <ol className="play-howto-steps picker-intro-steps">
      <li>
        <span className="pi-vis pi-vis--play" aria-hidden="true">
          <span className="pi-play">
            <PlayIcon width="8" height="8" />
          </span>
          <span className="pi-eq">
            <span />
            <span />
            <span />
            <span />
          </span>
        </span>
        <span className="pi-text">
          <b>Play</b> a short snippet
        </span>
      </li>
      <li>
        <span className="pi-vis pi-vis--type" aria-hidden="true">
          <span className="pi-field">
            <span className="pi-typed">hello</span>
            <span className="pi-check">✓</span>
          </span>
        </span>
        <span className="pi-text">
          <b>Type</b> the title, typos ok
        </span>
      </li>
      <li>
        <span className="pi-vis pi-vis--skip" aria-hidden="true">
          <span className="pi-bar">
            <span />
          </span>
          <span className="pi-skip">skip</span>
        </span>
        <span className="pi-text">
          <b>Skip</b> to hear more
        </span>
      </li>
      {race && (
        <li>
          <span className="pi-vis pi-vis--race" aria-hidden="true">
            <span className="pi-lane">
              <span className="pi-runner pi-runner--win" />
            </span>
            <span className="pi-lane">
              <span className="pi-runner" />
            </span>
          </span>
          <span className="pi-text">
            First to the <b>title</b> wins
          </span>
        </li>
      )}
    </ol>
  );
}

/**
 * First-run tips shown once before solo / host / online starts.
 */
export default function PlayHowto({ mode, onDone, onPrivacy, onVersion }) {
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

        {(onPrivacy || onVersion) && (
          <p className="play-howto-foot">
            {onPrivacy && (
              <button
                type="button"
                className="footer-credit footer-privacy"
                onClick={onPrivacy}
              >
                privacy
              </button>
            )}
            {onPrivacy && onVersion && (
              <span className="help-foot-dot" aria-hidden="true"> · </span>
            )}
            {onVersion && (
              <button
                type="button"
                className="footer-credit footer-privacy footer-version"
                onClick={onVersion}
              >
                {APP_VERSION}
              </button>
            )}
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
