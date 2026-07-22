import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { playCassetteButton } from "../cassetteSounds.js";

// Self-playing fake rounds so people see the vibe before logging in.
const ROUNDS = [
  {
    guesses: [
      { text: "taylor swift?", correct: false },
      { text: "drake?", correct: false },
      { text: "daniel caesar?", correct: false },
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
      { text: "taylor swift?", correct: false },
      { text: "it's nice to have a friend", correct: true },
    ],
    answer: {
      title: "It's Nice To Have A Friend",
      artist: "Taylor Swift",
      cover:
        "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/49/3d/ab/493dab54-f920-9043-6181-80993b8116c9/19UMGIM53909.rgb.jpg/300x300bb.jpg",
    },
  },
  {
    guesses: [
      { text: "post malone?", correct: false },
      { text: "ed sheeran?", correct: false },
      { text: "frank ocean?", correct: false },
      { text: "⏭ skipped", correct: false },
      { text: "house of balloons", correct: true },
    ],
    answer: {
      title: "House of Balloons",
      artist: "The Weeknd",
      cover:
        "https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/31/18/fa/3118fab0-90ea-2ae5-cf6c-bc64054ab9e3/21UMGIM21449.rgb.jpg/300x300bb.jpg",
    },
  },
  {
    guesses: [
      { text: "ariana grande?", correct: false },
      { text: "doja cat?", correct: false },
      { text: "lil uzi vert?", correct: false },
      { text: "⏭ skipped", correct: false },
      { text: "thinkin bout you", correct: true },
    ],
    answer: {
      title: "Thinkin Bout You",
      artist: "Frank Ocean",
      cover:
        "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/04/f8/63/04f863fc-2852-604f-c910-a97ac069506b/12UMGIM40339.rgb.jpg/300x300bb.jpg",
    },
  },
  {
    guesses: [
      { text: "the weeknd?", correct: false },
      { text: "justin bieber?", correct: false },
      { text: "beach house?", correct: false },
      { text: "⏭ skipped", correct: false },
      { text: "lovers rock", correct: true },
    ],
    answer: {
      title: "Lovers Rock",
      artist: "TV Girl",
      cover:
        "https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/3d/09/0c/3d090c87-f02b-3c3c-cedf-603cc900082f/888174780955_cover.jpg/300x300bb.jpg",
    },
  },
];

const STEPS = [1, 2, 4, 7, 11, 16];

const TEETH = [
  { id: "rew", label: "rewind", icon: "⏮" },
  { id: "play", label: "play", icon: "▶" },
  { id: "pause", label: "pause", icon: "⏸" },
  { id: "ff", label: "fast forward", icon: "⏭" },
];

export default function DemoPreview() {
  const [roundIdx, setRoundIdx] = useState(0);
  const [step, setStep] = useState(0); // 0..guesses.length (== solved)
  const [done, setDone] = useState(false);
  const [pressed, setPressed] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [dragX, setDragX] = useState(0);
  const drag = useRef({ active: false, startX: 0, dx: 0 });

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

  useEffect(() => {
    if (!expanded) return;
    function onKey(e) {
      if (e.key === "Escape") closeDemo();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  useEffect(() => {
    if (!expanded) setDragX(0);
  }, [expanded]);

  const unlocked = STEPS[Math.min(step, STEPS.length - 1)];
  const label = `${answer.title} — ${answer.artist}`;

  function isMobileDemo() {
    return window.matchMedia("(max-width: 820px)").matches;
  }

  function closeDemo() {
    setExpanded(false);
    setDragX(0);
  }

  function tapTooth(i, e) {
    e.stopPropagation();
    setPressed(i);
    playCassetteButton(i);
    window.setTimeout(() => setPressed(null), 160);
  }

  function onDemoClick() {
    if (!isMobileDemo()) return;
    if (!expanded) setExpanded(true);
  }

  function onPointerDown(e) {
    if (!expanded || !isMobileDemo()) return;
    if (e.target.closest?.(".demo-tooth")) return;
    drag.current = { active: true, startX: e.clientX, dx: 0 };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  function onPointerMove(e) {
    if (!drag.current.active) return;
    const dx = Math.max(0, e.clientX - drag.current.startX);
    drag.current.dx = dx;
    setDragX(dx);
  }

  function onPointerUp() {
    if (!drag.current.active) return;
    const dx = drag.current.dx;
    drag.current.active = false;
    if (dx > 88) closeDemo();
    else setDragX(0);
  }

  const dragStyle =
    expanded && dragX > 0
      ? {
          transform: `translateX(${dragX}px)`,
          transition: "none",
        }
      : undefined;

  return (
    <>
      {expanded &&
        createPortal(
          <button
            type="button"
            className="demo-backdrop"
            aria-label="Close live demo"
            onClick={closeDemo}
          />,
          document.body
        )}
      <div
        className={`demo${expanded ? " demo--expanded" : " demo--peek"}`}
        onClick={onDemoClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={dragStyle}
        role="presentation"
      >
        <div className="demo-peek-tab" aria-hidden="true">
          demo
        </div>
        <div className="demo-tag">
          <span className="rec-dot" /> LIVE DEMO
        </div>

        <div className="demo-screen">
          <div className="demo-grain" aria-hidden="true" />
          <div className="demo-scanlines" aria-hidden="true" />
          <div className="demo-head">
            <span className="demo-playlist">▶ liked-songs</span>
            <span className="demo-score">
              SCORE <b>4200</b>
            </span>
          </div>

          <div className="demo-stage demo-stage--cassette">
            <div className={`demo-cassette ${done ? "is-done" : ""}`}>
              <div className="demo-cassette-shell">
                <span className="demo-screw demo-screw--tl" aria-hidden="true" />
                <span className="demo-screw demo-screw--tr" aria-hidden="true" />
                <span className="demo-screw demo-screw--bl" aria-hidden="true" />
                <span className="demo-screw demo-screw--br" aria-hidden="true" />
                <span className="demo-side-mark" aria-hidden="true">
                  A
                </span>

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
                        width={18}
                        height={18}
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
                  <span
                    className={`demo-reel demo-reel--left ${done ? "spin-slow" : "spin-fast"}`}
                    aria-hidden="true"
                  />
                  <span
                    className={`demo-reel demo-reel--right ${done ? "spin-slow" : "spin-fast"}`}
                    aria-hidden="true"
                  />
                </div>
                <div className="demo-cassette-sprockets">
                  {TEETH.map((tooth, i) => (
                    <button
                      key={tooth.id}
                      type="button"
                      className={`demo-tooth ${pressed === i ? "is-pressed" : ""}`}
                      aria-label={tooth.label}
                      onClick={(e) => tapTooth(i, e)}
                    >
                      <span className="demo-tooth-icon" aria-hidden="true">
                        {tooth.icon}
                      </span>
                    </button>
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

          <div className="demo-result">
            {done ? (
              <div className="demo-win">
                <img
                  className="demo-win-cover"
                  src={answer.cover}
                  alt=""
                  decoding="async"
                />
                <div className="demo-win-meta">
                  <span className="demo-win-title">{answer.title}</span>
                  <span className="demo-win-artist">{answer.artist}</span>
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
      </div>
    </>
  );
}
