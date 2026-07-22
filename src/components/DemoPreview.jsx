import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import CassetteShell from "./CassetteShell.jsx";
import { resolvePreview } from "../itunes.js";

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

export default function DemoPreview() {
  const [roundIdx, setRoundIdx] = useState(0);
  const [step, setStep] = useState(0); // 0..guesses.length (== solved)
  const [done, setDone] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [muted, setMuted] = useState(true);
  // While dragging: pixel translateX (0 = fully open). null = use CSS open/peek classes.
  const [dragX, setDragX] = useState(null);
  const panelRef = useRef(null);
  const audioRef = useRef(null);
  const mutedRef = useRef(true);
  mutedRef.current = muted;
  const drag = useRef({
    active: false,
    pointerId: null,
    startClientX: 0,
    originX: 0,
    closedX: 0,
    currentX: 0,
    moved: false,
    lastClientX: 0,
    lastT: 0,
    velocity: 0,
  });

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

  // Play the revealed/current demo track via iTunes preview (starts muted for autoplay).
  useEffect(() => {
    let cancelled = false;
    const audio = audioRef.current || new Audio();
    audioRef.current = audio;
    audio.loop = true;
    audio.preload = "auto";

    (async () => {
      const url = await resolvePreview({
        id: `demo-${answer.title}`,
        name: answer.title,
        artists: [answer.artist],
      });
      if (cancelled || !url) return;
      if (audio.dataset.previewUrl !== url) {
        audio.dataset.previewUrl = url;
        audio.src = url;
      }
      audio.muted = mutedRef.current;
      try {
        await audio.play();
      } catch {
        /* muted autoplay usually works; ignore blocks */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [roundIdx, answer.title, answer.artist]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  useEffect(() => {
    return () => {
      const a = audioRef.current;
      if (!a) return;
      a.pause();
      a.removeAttribute("src");
      delete a.dataset.previewUrl;
      audioRef.current = null;
    };
  }, []);

  const unlocked = STEPS[Math.min(step, STEPS.length - 1)];
  const label = `${answer.title} — ${answer.artist}`;

  function isMobileDemo() {
    return window.matchMedia("(max-width: 820px)").matches;
  }

  function measureClosedX() {
    const w = panelRef.current?.offsetWidth || 340;
    return Math.max(0, w - 48);
  }

  function openDemo() {
    setDragX(null);
    setExpanded(true);
  }

  function closeDemo() {
    setDragX(null);
    setExpanded(false);
  }

  function onPointerDown(e) {
    if (!isMobileDemo()) return;
    if (e.target.closest?.(".cassette-tooth")) return;
    // Only primary button / touch
    if (e.pointerType === "mouse" && e.button !== 0) return;

    const closedX = measureClosedX();
    const originX = expanded ? 0 : closedX;
    drag.current = {
      active: true,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      originX,
      closedX,
      currentX: originX,
      moved: false,
      lastClientX: e.clientX,
      lastT: performance.now(),
      velocity: 0,
    };
    setDragX(originX);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  function onPointerMove(e) {
    if (!drag.current.active || e.pointerId !== drag.current.pointerId) return;
    const dx = e.clientX - drag.current.startClientX;
    if (Math.abs(dx) > 8) drag.current.moved = true;

    const now = performance.now();
    const dt = Math.max(1, now - drag.current.lastT);
    const vx = ((e.clientX - drag.current.lastClientX) / dt) * 1000;
    drag.current.velocity = vx;
    drag.current.lastClientX = e.clientX;
    drag.current.lastT = now;

    const next = Math.max(0, Math.min(drag.current.closedX, drag.current.originX + dx));
    drag.current.currentX = next;
    setDragX(next);
  }

  function finishDrag(e) {
    if (!drag.current.active) return;
    if (e && drag.current.pointerId != null && e.pointerId !== drag.current.pointerId) return;
    drag.current.active = false;

    const { closedX, currentX, moved, velocity } = drag.current;

    // Tap (no meaningful drag): toggle open/closed
    if (!moved) {
      setDragX(null);
      setExpanded((v) => !v);
      return;
    }

    // Flick or position snap
    const openEnough = currentX < closedX * 0.55;
    const flickedOpen = velocity < -520;
    const flickedClosed = velocity > 520;
    const shouldOpen = flickedClosed ? false : flickedOpen ? true : openEnough;

    setDragX(null);
    setExpanded(shouldOpen);
  }

  function onPointerUp(e) {
    finishDrag(e);
  }

  function onPointerCancel(e) {
    finishDrag(e);
  }

  // 0 = closed peek, 1 = fully open (for backdrop fade while dragging)
  const progress =
    dragX == null
      ? expanded
        ? 1
        : 0
      : drag.current.closedX <= 0
        ? 0
        : 1 - dragX / drag.current.closedX;

  const dragging = dragX != null;
  const showBackdrop = progress > 0.02;

  const panelStyle = dragging
    ? {
        transform: `translateX(${dragX}px)`,
        transition: "none",
        filter: `saturate(${0.85 + 0.15 * progress}) brightness(${0.92 + 0.08 * progress})`,
      }
    : undefined;

  return (
    <>
      {showBackdrop &&
        createPortal(
          <button
            type="button"
            className="demo-backdrop"
            aria-label="Close live demo"
            onClick={closeDemo}
            style={{ opacity: 0.42 * progress }}
          />,
          document.body
        )}
      <div
        ref={panelRef}
        className={`demo${expanded ? " demo--expanded" : " demo--peek"}${
          dragging ? " demo--dragging" : ""
        }`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        style={panelStyle}
        role="presentation"
      >
        <button
          type="button"
          className="demo-peek-tab"
          tabIndex={expanded ? -1 : 0}
          aria-hidden={expanded ? true : undefined}
          aria-label="Pull open live demo"
          onKeyDown={(e) => {
            if (e.key !== "Enter" && e.key !== " ") return;
            e.preventDefault();
            if (!isMobileDemo()) return;
            if (expanded) closeDemo();
            else openDemo();
          }}
        >
          <span className="demo-peek-tab-fold" aria-hidden="true" />
          <span className="demo-peek-tab-label">pull me</span>
        </button>
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
            <CassetteShell
              done={done}
              spinning
              cover={answer.cover}
              label={label}
              interactiveTeeth
              muteControl={{
                muted,
                onToggle: () => {
                  setMuted((m) => {
                    const next = !m;
                    const a = audioRef.current;
                    if (a) {
                      a.muted = next;
                      if (!next) a.play().catch(() => {});
                    }
                    return next;
                  });
                },
              }}
            />
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
