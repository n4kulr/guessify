import DemoPreview from "./DemoPreview.jsx";

export default function Login({ error }) {
  return (
    <div className="hero">
      {/* LEFT — pitch + login */}
      <div className="hero-left">
        <div className="sticker sticker--new">▶ NOW SPINNING</div>

        <h1 className="hero-title">
          GUESS<span className="hero-title-accent">IFY</span>
        </h1>
        <p className="hero-tagline">
          Your playlists. One-second snippets. Can you <em>name that tune?</em>
        </p>

        <div className="hero-turntable">
          <div className="vinyl spin-fast">
            <div className="cd-sheen" />
            <div className="vinyl-label">
              <span>45</span>
              <span>RPM</span>
            </div>
          </div>
          <div className="tonearm tonearm--on" />
          <div className="eq" aria-hidden="true">
            {Array.from({ length: 7 }).map((_, i) => (
              <span key={i} style={{ animationDelay: `${i * 0.12}s` }} />
            ))}
          </div>
        </div>

        <ol className="steps">
          <li><b>1</b> log in with Spotify</li>
          <li><b>2</b> pick a playlist</li>
          <li><b>3</b> guess fast, score big</li>
        </ol>

        {error && (
          <div className="error-banner">
            couldn't log you in ({error}). give it another spin.
          </div>
        )}

        <a className="btn btn-big btn-spotify" href="/api/login">
          <span className="btn-disc" aria-hidden="true" />
          Log in with Spotify
        </a>

        <p className="fineprint">
          we only read your playlists to build the game · nothing is stored
        </p>
      </div>

      {/* RIGHT — live self-playing demo */}
      <div className="hero-right">
        <DemoPreview />
      </div>
    </div>
  );
}
