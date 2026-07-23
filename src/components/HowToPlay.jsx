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
          <p>
            <b>Guessify</b> is a music guessing game built on your Spotify
            playlists — short snippets, fast guesses.
          </p>

          <h3 className="help-section-title">why</h3>
          <p>
            I made Guessify because I used to play this with my school friends
            while our parents drove us to tuition — we’d race to guess the radio
            song the fastest, and it got very competitive.
          </p>

          <h3 className="help-section-title">instructions</h3>
          <p>
            Log in with <b>Spotify</b> (any account) to load your playlists.
            Snippets play from free iTunes / Deezer previews — no Premium needed. Guests
            only need the party code.
          </p>

          <h3>host</h3>
          <p>
            Pick a playlist and host a game. Share the QR or room code so friends
            can join.
          </p>

          <h3>guests</h3>
          <p>
            Friends join with the party code — no Spotify needed. Everyone plays
            the snippet on their own phone and races to type guesses.
          </p>

          <h3>the round</h3>
          <ul>
            <li>A snippet unlocks more of the track over time.</li>
            <li>
              Correct <b>title</b> first → <b>500</b>. Correct <b>artist</b> first
              → <b>200</b>; title after that → another <b>200</b>.
            </li>
            <li>First correct title wins the round (party).</li>
            <li>Skip unlocks more audio on your device only.</li>
            <li>Anyone can advance after a reveal.</li>
          </ul>

          <p className="help-solo">
            Playing alone? Same vibe — you play and guess on one device.
          </p>
        </div>
      </div>
    </div>
  );
}
