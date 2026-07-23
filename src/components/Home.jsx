import { useEffect, useState } from "react";
import DemoPreview from "./DemoPreview.jsx";
import HeroTurntable from "./HeroTurntable.jsx";
import JoinCodeForm from "../multiplayer/JoinCodeForm.jsx";
import { onlineActiveCount } from "../onlineActive.js";

export default function Home({ me, onStartSolo, onStartMulti, onStartOnline }) {
  const name = me?.displayName?.split(" ")[0] || "there";
  const [active, setActive] = useState(() => onlineActiveCount());
  useEffect(() => {
    const id = setInterval(() => setActive(onlineActiveCount()), 15_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="hero">
      <div className="hero-left">
        <h1 className="hero-title">
          guess<span className="hero-title-accent">ify</span>
        </h1>
        <p className="hero-tagline">
          Hey {name} — <em>name that song!</em>
        </p>

        <div className="hero-vinyl-row">
          <HeroTurntable />
          <ol className="steps">
            <li><b>1</b> pick a playlist (or Liked Songs)</li>
            <li><b>2</b> hear a short snippet</li>
            <li><b>3</b> type the title + artist</li>
          </ol>
        </div>

        <div className="home-actions">
          <button className="btn btn-big btn-play" onClick={onStartSolo}>
            <span className="btn-play-icon" aria-hidden="true" />
            play solo
          </button>
          <button className="btn btn-big btn-multi" onClick={onStartMulti}>
            host a game
          </button>
          <button className="btn btn-big btn-online" onClick={onStartOnline}>
            <span className="btn-online-dot" aria-hidden="true" />
            play online
            <span className="btn-online-count">({active} active)</span>
          </button>
        </div>

        <JoinCodeForm />
      </div>

      <div className="hero-right">
        <DemoPreview />
      </div>
    </div>
  );
}
