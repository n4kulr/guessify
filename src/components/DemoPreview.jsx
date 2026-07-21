import { useEffect, useState } from "react";

// Self-playing fake rounds so people see the vibe before logging in.
const ROUNDS = [
  {
    guesses: [
      { text: "taylor swift?", correct: false },
      { text: "drake?", correct: false },
      { text: "⏭ skipped", correct: false },
      { text: "infrunami", correct: true },
    ],
    answer: {
      title: "Infrunami",
      artist: "Steve Lacy",
      cover:
        "https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/c3/dc/b8/c3dcb8d3-c42e-b4e5-5c0f-96fd6f29bfea/859740499380_cover.jpg/300x300bb.jpg",
    },
  },
  {
    guesses: [
      { text: "young thug?", correct: false },
      { text: "playboi carti?", correct: false },
      { text: "the weeknd?", correct: false },
      { text: "marvin's room", correct: true },
    ],
    answer: {
      title: "Marvin's Room",
      artist: "Drake",
      cover:
        "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/d2/53/62/d2536245-b94c-b3fd-7168-9512f655f6d4/00602527899091.rgb.jpg/300x300bb.jpg",
    },
  },
  {
    guesses: [
      { text: "billie eilish?", correct: false },
      { text: "olivia rodrigo?", correct: false },
      { text: "⏭ skipped", correct: false },
      { text: "anti-hero", correct: true },
    ],
    answer: {
      title: "Anti-Hero",
      artist: "Taylor Swift",
      cover:
        "https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/3d/01/f2/3d01f2e5-5a08-835f-3d30-d031720b2b80/22UM1IM07364.rgb.jpg/300x300bb.jpg",
    },
  },
  {
    guesses: [
      { text: "post malone?", correct: false },
      { text: "ed sheeran?", correct: false },
      { text: "⏭ skipped", correct: false },
      { text: "blinding lights", correct: true },
    ],
    answer: {
      title: "Blinding Lights",
      artist: "The Weeknd",
      cover:
        "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/a6/6e/bf/a66ebf79-5008-8948-b352-a790fc87446b/19UM1IM04638.rgb.jpg/300x300bb.jpg",
    },
  },
  {
    guesses: [
      { text: "ariana grande?", correct: false },
      { text: "doja cat?", correct: false },
      { text: "⏭ skipped", correct: false },
      { text: "levitating", correct: true },
    ],
    answer: {
      title: "Levitating",
      artist: "Dua Lipa",
      cover:
        "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/6c/11/d6/6c11d681-aa3a-d59e-4c2e-f77e181026ab/190295092665.jpg/300x300bb.jpg",
    },
  },
  {
    guesses: [
      { text: "the weeknd?", correct: false },
      { text: "justin bieber?", correct: false },
      { text: "⏭ skipped", correct: false },
      { text: "as it was", correct: true },
    ],
    answer: {
      title: "As It Was",
      artist: "Harry Styles",
      cover:
        "https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/2a/19/fb/2a19fb85-2f70-9e44-f2a9-82abe679b88e/886449990061.jpg/300x300bb.jpg",
    },
  },
];

const STEPS = [1, 2, 4, 7, 11, 16];

export default function DemoPreview() {
  const [roundIdx, setRoundIdx] = useState(0);
  const [step, setStep] = useState(0); // 0..guesses.length (== solved)
  const [done, setDone] = useState(false);
  const [pressed, setPressed] = useState(null);

  const round = ROUNDS[roundIdx];
  const script = round.guesses;
  const answer = round.answer;

  useEffect(() => {
    let t;
    if (done) {
      t = setTimeout(() => {
        setRoundIdx((i) => (i + 1) % ROUNDS.length);
        setStep(0);
        setDone(false);
      }, 3400);
    } else if (step < script.length) {
      t = setTimeout(() => {
        const next = step + 1;
        if (next >= script.length) setDone(true);
        setStep(next);
      }, 1400);
    }
    return () => clearTimeout(t);
  }, [step, done, script.length]);

  const unlocked = STEPS[Math.min(step, STEPS.length - 1)];
  const label = `${answer.title} — ${answer.artist}`;

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
              <div
                className={`demo-cassette-label ${
                  done ? "demo-cassette-label--solved" : ""
                }`}
              >
                {done ? (
                  <>
                    <img
                      className="demo-cover"
                      src={answer.cover}
                      alt=""
                      width={36}
                      height={36}
                      decoding="async"
                    />
                    <div className="demo-marquee">
                      <span className="demo-marquee-track">
                        <span>{label}</span>
                        <span aria-hidden="true">{label}</span>
                      </span>
                    </div>
                  </>
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
            <div className="demo-win-row">
              <img
                className="demo-win-cover"
                src={answer.cover}
                alt=""
                width={48}
                height={48}
                decoding="async"
              />
              <div className="demo-win-meta">
                <span className="demo-win-title">{answer.title}</span>
                <span className="demo-win-artist">{answer.artist}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="demo-rows" key={roundIdx}>
            {script.map((g, i) => (
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
