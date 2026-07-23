import DemoPreview from "./DemoPreview.jsx";
import HeroTurntable from "./HeroTurntable.jsx";
import JoinCodeForm from "../multiplayer/JoinCodeForm.jsx";

export default function Login({ error, onStartSolo, onStartMulti }) {
  const errorHint = {
    state_mismatch:
      "login got interrupted (cookie/host mismatch). try again from this same link.",
    token_exchange_failed:
      "Spotify didn’t hand back a token. try again in a minute.",
    access_denied: "Spotify login was cancelled.",
  }[error];

  return (
    <div className="hero">
      <div className="hero-left">
        <h1 className="hero-title">
          guess<span className="hero-title-accent">ify</span>
        </h1>
        <p className="hero-tagline">
          <span className="hero-tagline-lead">Your playlists. One-second snippets.</span>
          <em className="hero-tagline-hook">name that song!</em>
        </p>

        <HeroTurntable />

        <ol className="steps">
          <li><b>1</b> pick a playlist (or Liked Songs)</li>
          <li><b>2</b> hear a short snippet</li>
          <li><b>3</b> type the title + artist</li>
        </ol>

        {error && (
          <div className="error-banner">
            {errorHint || `couldn't log you in (${error}). give it another spin.`}
          </div>
        )}

        <div className="home-actions">
          <button className="btn btn-big btn-play" onClick={onStartSolo}>
            <span className="btn-play-icon" aria-hidden="true" />
            play solo
          </button>
          <button className="btn btn-big btn-multi" onClick={onStartMulti}>
            host a game
          </button>
        </div>

        <JoinCodeForm />

        <p className="fineprint">
          login for your playlists · guests just need a party code
        </p>
      </div>

      <div className="hero-right">
        <DemoPreview />
      </div>
    </div>
  );
}
