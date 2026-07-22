import { useEffect, useId, useRef } from "react";

export default function HowToPlay({ open, onOpen, onClose }) {
  const titleId = useId();
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div className="fab-item">
      <button
        type="button"
        className={`help-fab ${open ? "is-open" : ""}`}
        aria-label={open ? "Close how Guessify works" : "How Guessify works"}
        aria-expanded={open}
        aria-controls="help-panel"
        onClick={() => (open ? onClose() : onOpen())}
      >
        {open ? "×" : "?"}
      </button>

      {open && (
        <div
          className="help-backdrop"
          onClick={onClose}
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
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="help-body">
          <h3 className="help-section-title">why</h3>
          <p>
            I made Guessify because I used to play this with my friends on the
            way to tuition — we’d race to guess the radio song the fastest, and
            our moms would keep score since they were driving.
          </p>

          <h3 className="help-section-title">instructions</h3>
          <p>
            Log in with <b>Spotify Premium</b> to host. Guests only need the
            party code — no Spotify required.
          </p>

          <h3>host / DJ</h3>
          <p>
            Pick a playlist and host a game. Audio plays only on the DJ device.
            Crank the speakers so the room can hear it.
          </p>

          <h3>guests</h3>
          <p>
            Friends join with the party code. Their phones stay silent; they
            listen to whatever’s coming out of the DJ’s speakers and race to
            type guesses.
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
