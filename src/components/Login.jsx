import DemoPreview from "./DemoPreview.jsx";
import ScrubbableVinyl from "./ScrubbableVinyl.jsx";
import CurvedNudge from "./CurvedNudge.jsx";
import JoinCodeForm from "../multiplayer/JoinCodeForm.jsx";

export default function Login({ error }) {
  return (
    <div className="hero">
      <div className="hero-left">
        <div className="sticker">now spinning</div>

        <h1 className="hero-title">
          guess<span className="hero-title-accent">ify</span>
        </h1>
        <p className="hero-tagline">
          Your playlists. One-second snippets. Can you <em>name that tune?</em>
        </p>

        <div className="hero-turntable">
          <ScrubbableVinyl spin="fast" title="drag to scrub">
            <div className="vinyl-label">
              <span>45</span>
              <span>RPM</span>
            </div>
          </ScrubbableVinyl>
          <div className="tonearm tonearm--on" />
          <CurvedNudge variant="drag" />
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

        <JoinCodeForm />

        <p className="fineprint">
          needs Spotify Premium to host · guests just need a party code
        </p>
      </div>

      <div className="hero-right">
        <DemoPreview />
      </div>
    </div>
  );
}
