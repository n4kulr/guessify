import { useEffect, useState } from "react";

// A self-playing fake game loop so people see the vibe before logging in.
const SCRIPT = [
  { text: "taylor swift?", correct: false },
  { text: "drake?", correct: false },
  { text: "⏭ skipped", correct: false },
  { text: "infrunami", correct: true },
];
const ANSWER = { title: "Infrunami", artist: "Steve Lacy" };
const STEPS = [1, 2, 4, 7, 11, 16];

export default function DemoPreview() {
  const [step, setStep] = useState(0); // 0..SCRIPT.length  (== solved)
  const [done, setDone] = useState(false);
  const [pressed, setPressed] = useState(null);

  useEffect(() => {
    let t;
    if (done) {
      t = setTimeout(() => {
        setStep(0);
        setDone(false);
      }, 3200);
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

  function tapTooth(i) {
    setPressed(i);
    window.setTimeout(() => setPressed(null), 160);
  }

  return (
    <div className="demo">
      <div className="demo-tag">
        <span className="rec-dot" /> LIVE DEMO
      </div>

      <div className="demo-screen">
        <div className="demo-head">
          <span className="demo-playlist">▶ your-liked-songs</span>
          <span className="demo-score">
            SCORE <b>4200</b>
          </span>
        </div>

        <div className="demo-stage demo-stage--cassette">
          <div className={`demo-cassette ${done ? "is-done" : ""}`}>
            <div className="demo-cassette-shell">
              <div className={`demo-cassette-label ${done ? "demo-cassette-label--marquee" : ""}`}>
                {done ? (
                  <div className="demo-marquee">
                    <span className="demo-marquee-track">
                      <span>{ANSWER.title} — {ANSWER.artist}</span>
                      <span aria-hidden="true">{ANSWER.title} — {ANSWER.artist}</span>
                    </span>
                  </div>
                ) : (
                  "??? side a"
                )}
              </div>
              <div className="demo-cassette-window">
                <span className={`demo-reel ${done ? "spin-slow" : "spin-fast"}`} />
                <span className="demo-tape" />
                <span className={`demo-reel ${done ? "spin-slow" : "spin-fast"}`} />
              </div>
              <div className="demo-cassette-sprockets">
                {[0, 1, 2, 3].map((i) => (
                  <button
                    key={i}
                    type="button"
                    className={`demo-tooth ${pressed === i ? "is-pressed" : ""}`}
                    aria-label={`cassette button ${i + 1}`}
                    onClick={() => tapTooth(i)}
                  />
                ))}
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
            <span className="demo-win-title">{ANSWER.title}</span>
            <span className="demo-win-artist">{ANSWER.artist}</span>
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
