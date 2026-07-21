import DemoPreview from "./DemoPreview.jsx";

export default function Home({ me, onStart }) {
  const name = me?.displayName?.split(" ")[0] || "there";

  return (
    <div className="hero">
      <div className="hero-left">
        <div className="sticker">ready when you are</div>

        <h1 className="hero-title">
          guess<span className="hero-title-accent">ify</span>
        </h1>
        <p className="hero-tagline">
          Hey {name} — drop the needle on one of your playlists and see how
          fast you can <em>name that tune</em>.
        </p>

        <div className="hero-turntable">
          <div className="vinyl spin-fast">
            <div className="vinyl-label">
              <span>45</span>
              <span>RPM</span>
            </div>
          </div>
          <div className="tonearm tonearm--on" />
        </div>

        <ol className="steps">
          <li><b>1</b> pick a playlist (or Liked Songs)</li>
          <li><b>2</b> hear a short snippet</li>
          <li><b>3</b> type the title + artist</li>
        </ol>

        <button className="btn btn-big btn-play" onClick={onStart}>
          <span className="btn-disc" aria-hidden="true" />
          pick a playlist
        </button>

        <p className="fineprint">
          only your own playlists are playable · needs Premium to stream
        </p>
      </div>

      <div className="hero-right">
        <DemoPreview />
      </div>
    </div>
  );
}
