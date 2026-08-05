import { useEffect, useId } from "react";

/**
 * Spotlight privacy policy — plain-language disclosure of how Guessify
 * handles data (no DB, optional Spotify, local scores, ephemeral rooms).
 */
export default function PrivacyDialog({ onClose }) {
  const titleId = useId();

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="spotlight-scrim"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className="spotlight-card privacy-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button
          type="button"
          className="login-modal-close"
          aria-label="Close"
          onClick={onClose}
        >
          ×
        </button>

        <div className="spotlight-head">
          <h2 id={titleId} className="spotlight-title">
            privacy
          </h2>
          <p className="spotlight-hint">how guessify handles your data</p>
        </div>

        <div className="privacy-body">
          <section>
            <h3>who</h3>
            <p>
              Guessify is a personal project by{" "}
              <a
                href="https://devpage-one.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
              >
                nakul
              </a>
              . Questions or concerns? Use the feedback pencil (bottom right)
              or reach out via that site.
            </p>
          </section>

          <section>
            <h3>spotify (optional)</h3>
            <p>
              Logging in with Spotify is optional. When you do, Guessify keeps
              an encrypted http-only session cookie so it can load your
              playlists, Liked Songs, and cover art. We don’t stream Spotify
              audio and we don’t ask for streaming scopes — previews come from
              iTunes / Deezer instead.
            </p>
          </section>

          <section>
            <h3>on your device</h3>
            <p>
              Theme, volume, nickname/avatar, personal bests, and “seen howto”
              flags stay in your browser (localStorage / similar). Clearing
              site data clears them.
            </p>
          </section>

          <section>
            <h3>multiplayer rooms</h3>
            <p>
              Party rooms keep your nickname and avatar in live room state on a
              Cloudflare Worker while the room is active. That’s ephemeral game
              state — not a long-term Guessify user database.
            </p>
          </section>

          <section>
            <h3>services that make the game work</h3>
            <p>
              Depending on what you play, Guessify may talk to Last.fm
              (charts), iTunes / Deezer (preview URLs), Spotify (library if
              you’re logged in), and Discord (only if you send feedback —
              including any screenshot you attach).
            </p>
          </section>

          <section>
            <h3>no guessify account database</h3>
            <p>
              There isn’t a Guessify server database of your listening history
              or scores. Scores and wrap stats live on your device unless you
              choose to share them yourself.
            </p>
          </section>

          <p className="privacy-updated">last updated · august 2026</p>
        </div>

        <div className="spotlight-actions">
          <button type="button" className="btn btn-big btn-play" onClick={onClose}>
            got it
          </button>
        </div>
      </div>
    </div>
  );
}
