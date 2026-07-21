import { useEffect, useState } from "react";

// A self-playing fake game loop so people see the vibe before logging in.
const SCRIPT = [
  { text: "taylor swift?", correct: false },
  { text: "dua lipa?", correct: false },
  { text: "⏭ skipped", correct: false },
  { text: "blinding lights", correct: true },
];
const STEPS = [1, 2, 4, 7, 11, 16];

export default function DemoPreview() {
  const [step, setStep] = useState(0); // 0..SCRIPT.length  (== solved)
  const [done, setDone] = useState(false);

  useEffect(() => {
    let t;
    if (done) {
      t = setTimeout(() => {
        setStep(0);
        setDone(false);
      }, 2600);
    } else if (step < SCRIPT.length) {
      t = setTimeout(() => {
        const next = step + 1;
        if (next >= SCRIPT.length) setDone(true);
        setStep(next);
      }, 1400);
    }
    return () => clearTimeout(t);
  }, [step, done]);

  const unlocked = STEPS[Math.min(step, STEPS.length - 1)];

  return (
    <div className="demo">
      <div className="demo-tag">
        <span className="rec-dot" /> LIVE DEMO
      </div>

      <div className="demo-screen">
        <div className="demo-head">
          <span className="demo-playlist">▶ your-liked-songs</span>
          <span className="demo-score">
            SCORE <b>1400</b>
          </span>
        </div>

        <div className="demo-stage demo-stage--cassette">
          <div
            className={`demo-cassette ${done ? "demo-cassette--slow" : "demo-cassette--play"}`}
            aria-hidden="true"
          >
            <div className="demo-cassette-shell">
              <div className="demo-cassette-label">
                {done ? "♪ nailed" : "??? side a"}
              </div>
              <div className="demo-cassette-window">
                <span className={`demo-reel ${done ? "spin-slow" : "spin-fast"}`} />
                <span className="demo-tape" />
                <span className={`demo-reel ${done ? "spin-slow" : "spin-fast"}`} />
              </div>
              <div className="demo-cassette-sprockets">
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        </div>

        <div className="demo-progress">
          <div className="progress-track demo-track">
            <div
              className="progress-fill"
              style={{ width: `${(unlocked / 16) * 100}%` }}
            />
          </div>
          <span className="demo-time">0:0{unlocked} unlocked</span>
        </div>

        {done ? (
          <div className="demo-win">
            <span className="demo-win-badge">✦ NAILED IT ✦</span>
            <span className="demo-win-title">Blinding Lights</span>
            <span className="demo-win-artist">The Weeknd</span>
          </div>
        ) : (
          <div className="demo-rows">
            {SCRIPT.map((g, i) => (
              <div
                key={i}
                className={`demo-row ${
                  i < step ? (g.correct ? "hit" : "miss") : i === step ? "cursor" : ""
                }`}
              >
                {i < step ? g.text : i === step ? "◉ guessing…" : ""}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
