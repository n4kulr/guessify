import DemoPreview from "./DemoPreview.jsx";
import HeroTurntable from "./HeroTurntable.jsx";
import JoinCodeForm from "../multiplayer/JoinCodeForm.jsx";

export default function Home({ me, onStartSolo, onStartMulti }) {
  const name = me?.displayName?.split(" ")[0] || "there";

  return (
    <div className="hero">
      <div className="hero-left">
        <h1 className="hero-title">
          guess<span className="hero-title-accent">ify</span>
        </h1>
        <p className="hero-tagline">
          Hey {name} — drop the needle on one of your playlists and see how
          fast you can <em>name that song</em>.
        </p>

        <HeroTurntable />

        <ol className="steps">
          <li><b>1</b> pick a playlist (or Liked Songs)</li>
          <li><b>2</b> hear a short snippet</li>
          <li><b>3</b> type the title + artist</li>
        </ol>

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
          host: DJ + race on this device · friends join with the code
        </p>
      </div>

      <div className="hero-right">
        <DemoPreview />
      </div>
    </div>
  );
}
