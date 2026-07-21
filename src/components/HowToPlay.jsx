import { useEffect, useId, useRef, useState } from "react";

export default function HowToPlay() {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="help">
      <button
        type="button"
        className={`help-fab ${open ? "is-open" : ""}`}
        aria-label={open ? "Close how Guessify works" : "How Guessify works"}
        aria-expanded={open}
        aria-controls="help-panel"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "×" : "?"}
      </button>

      {open && (
        <div
          className="help-backdrop"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        id="help-panel"
        className={`help-panel ${open ? "is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        hidden={!open}
      >
        <div className="help-panel-head">
          <h2 id={titleId} className="help-title">
            how it works
          </h2>
          <button
            ref={closeRef}
            type="button"
            className="help-close"
            aria-label="Close"
            onClick={() => setOpen(false)}
          >
            ×
          </button>
        </div>

        <div className="help-body">
          <p>
            <b>Guessify</b> is a music guessing game built on your Spotify
            playlists — short snippets, fast guesses, bragging rights.
          </p>

          <h3>host / DJ</h3>
          <p>
            Log in with <b>Spotify Premium</b>, pick a playlist, and host a game.
            Audio plays only on the DJ device. Crank the speakers so the room
            can hear it.
          </p>

          <h3>guests</h3>
          <p>
            Friends join with the party code — <b>no Spotify needed</b>. Their
            phones stay silent; they listen to whatever’s coming out of the
            DJ’s speakers and race to type guesses.
          </p>

          <h3>the round</h3>
          <ul>
            <li>A snippet unlocks more of the track over time.</li>
            <li>Guess the <b>artist</b> for a +200 bonus (once per round).</li>
            <li>
              First correct <b>title</b> wins the round — earlier guesses score
              more (1000 → 200).
            </li>
          </ul>

          <p className="help-solo">
            Playing alone? Same vibe — you are the DJ and the guesser.
          </p>
        </div>
      </div>
    </div>
  );
}
