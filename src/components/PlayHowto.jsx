import { useEffect, useId, useRef } from "react";

/** Shared how-to steps (first-run splash + ? fab). */
export function PlayHowtoSteps({ race = true }) {
  return (
    <ol className="play-howto-steps">
      <li>
        <b>Play</b> a short snippet of a song.
      </li>
      <li>
        Type the <b>song title</b> for most points. Artist is a small bonus.
      </li>
      <li>
        <b>Skip</b> when you’re stuck — unlocks more of the track for you.
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
export default function PlayHowto({ mode, onDone }) {
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

  const modeLine =
    mode === "solo"
      ? "You’re playing alone on this phone."
      : mode === "multi"
        ? "You’ll pick a playlist, then friends join with a code."
        : "You’ll race others on today’s charts.";

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
      </div>
    </div>
  );
}

export const HOWTO_KEY = "guessify-howto-seen";

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
