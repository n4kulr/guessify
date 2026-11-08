import { useEffect, useMemo, useRef, useState } from "react";
import { attachVolumeControl } from "../audioOutput.js";

const SPLASH_NAME = "lamiaiscruingok";
const CATS = ["🐈", "🐈‍⬛"];
const CAT_COUNT = 34;
const SPLASH_GIF = "/lamia/splash.gif";
/** One loop of the GIF — the splash lasts exactly this long once it's loaded. */
const SPLASH_GIF_MS = 6_670;
/** Covers a GIF that never loads. */
const SPLASH_MAX_MS = 15_000;
const SPLASH_NO_GIF_MS = 3_000;
const SPLASH_OUT_MS = 500;

/**
 * "Teach Me How to Dougie" over the splash. Resolved ahead of time so the
 * play() call can run inside the tap that picked lamia — iOS only allows
 * sound that starts in a user gesture, and an await would lose it.
 */
const DOUGIE = { title: "Teach Me How to Dougie", artist: "Cali Swag District" };
let dougieUrl = null;
let dougieAudio = null;
let dougieFade = 0;

function prefetchDougie() {
  if (dougieUrl) return Promise.resolve(dougieUrl);
  const qs = new URLSearchParams(DOUGIE);
  return fetch(`/api/preview?${qs}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => (dougieUrl = d?.previewUrl || null))
    .catch(() => null);
}

function dougieElement() {
  if (!dougieAudio) {
    dougieAudio = new Audio();
    dougieAudio.preload = "auto";
    dougieAudio.playsInline = true;
    attachVolumeControl(dougieAudio); // the speaker mute applies here too
  }
  return dougieAudio;
}

function startDougie() {
  clearInterval(dougieFade);
  const a = dougieElement();
  const go = () => {
    if (a.src !== dougieUrl) a.src = dougieUrl;
    a.currentTime = 0;
    a.play().catch(() => {});
  };
  if (dougieUrl) go();
  else prefetchDougie().then((url) => url && go());
}

function stopDougie() {
  const a = dougieAudio;
  if (!a || a.paused) return;
  // Quick fade so it doesn't cut off like a glitch. iOS ignores volume, so
  // there it just stops at the end of the fade.
  const start = a.volume;
  let step = 0;
  clearInterval(dougieFade);
  dougieFade = setInterval(() => {
    step += 1;
    a.volume = Math.max(0, start * (1 - step / 8));
    if (step >= 8) {
      clearInterval(dougieFade);
      a.pause();
      a.volume = start;
    }
  }, 50);
}
/** Survives the iOS Safari theme reload so the splash still plays after it. */
const SPLASH_PENDING_KEY = "guessify-lamia-splash";

/**
 * Lamia theme backdrop: Arctic Monkeys song titles (from Lamia's playlist) and
 * album names scrawled faintly behind the app. Always mounted; CSS shows it only on html[data-theme="lamia"],
 * so every applyTheme path (menu, accent, profile) toggles it for free.
 */
const TITLES = [
  "do i wanna know?",
  "r u mine?",
  "one for the road",
  "no. 1 party anthem",
  "fireside",
  "why'd you only call me when you're high?",
  "snap out of it",
  "knee socks",
  "i wanna be yours",
  "dance little liar",
  "pretty visitors",
  "potion approaching",
  "crying lightning",
  "dangerous animals",
  "the jeweller's hands",
  "brianstorm",
  "balaclava",
  "do me a favour",
  "505",
  "old yellow bricks",
  "fluorescent adolescent",
  "if you were there, beware",
  "teddy picker",
  "d is for dangerous",
  "tranquility base hotel & casino",
  "four out of five",
  "there'd better be a mirrorball",
  "sculptures of anything goes",
  "jet skis on the moat",
  "body paint",
  "the car",
  "big ideas",
  "hello you",
  "catapult",
  "cigarette smoker fiona",
  "suck it and see",
  "the death ramps",
  "stop the world i wanna get off with you",
];

const ALBUMS = [
  "AM",
  "humbug",
  "the car",
  "favourite worst nightmare",
  "tranquility base hotel & casino",
  "whatever people say i am, that's what i'm not",
];

const ROWS = 14;

/** Hand-drawn doodle paths, 100×100 box, stroked through the pencil filter. */
const DOODLES = [
  // star
  "M50 8 L61 38 L93 39 L67 58 L77 90 L50 71 L23 90 L33 58 L7 39 L39 38 Z",
  // !
  "M50 10 C49 30 47 48 50 66 M50 82 L51 88",
  // four-point sparkle
  "M50 6 C53 36 64 47 94 50 C64 53 53 64 50 94 C47 64 36 53 6 50 C36 47 47 36 50 6 Z",
  // squiggle
  "M6 55 C18 30 28 30 34 52 C40 74 52 74 58 50 C64 26 76 28 82 50 C86 62 92 62 96 54",
  // spiral
  "M52 50 C52 44 60 44 60 50 C60 60 46 62 42 52 C36 38 56 30 66 40 C80 54 64 74 46 72 C24 70 22 40 36 28 C52 14 80 22 86 44",
  // !!
  "M30 12 C29 30 28 46 30 62 M30 80 L31 86 M64 12 C63 30 62 46 64 62 M64 80 L65 86",
  // asterisk
  "M50 12 L51 88 M16 30 L84 70 M84 30 L17 71",
  // curly arrow
  "M8 70 C24 30 52 24 70 40 C80 50 74 64 64 60 C54 56 60 40 76 34 L92 30 M80 20 L92 30 L82 42",
  // scribbled loop
  "M20 58 C14 30 46 14 64 26 C84 40 74 72 50 76 C26 80 18 56 30 44 C42 32 70 34 74 52",
  // lightning bolt
  "M58 6 L28 54 L50 54 L38 94 L74 40 L52 40 Z",
  // music note
  "M38 74 C38 64 26 62 20 68 C14 76 24 86 34 82 C38 80 40 76 40 72 L40 18 L80 10 L80 62 C80 52 68 50 62 56 C56 64 66 74 76 70 C80 68 82 64 82 60",
  // plus
  "M50 18 C49 40 51 62 50 84 M18 52 C40 50 62 51 84 49",
  // little burst
  "M50 30 L50 8 M50 70 L50 92 M30 50 L8 50 M70 50 L92 50 M36 36 L20 20 M64 36 L80 20 M36 64 L20 80 M64 64 L80 80",
];

/** Tiny deterministic hash → 0..1, so the doodles land the same every render. */
function rand(a, b, salt = 0) {
  const x = Math.sin(a * 127.1 + b * 311.7 + salt * 74.7) * 43758.5453;
  return x - Math.floor(x);
}

/** A small pencil doodle tucked between titles, like something scribbled in a margin. */
function Doodle({ i, k, n }) {
  const shape = Math.floor(rand(i, k, n) * DOODLES.length);
  const d = DOODLES[shape];
  const size = 0.6 + rand(i, k, n + 1) * 0.7; // em
  const rot = rand(i, k, n + 2) * 70 - 35;
  const lift = rand(i, k, n + 3) * 0.9 - 0.45; // em, off the baseline
  const hot = rand(i, k, n + 4) < 0.3;
  const weight = 4 + rand(i, k, n + 5) * 3;
  return (
    <svg
      className={`lamia-doodle${hot ? " lamia-hot" : ""}`}
      viewBox="0 0 100 100"
      style={{
        width: `${size}em`,
        height: `${size}em`,
        strokeWidth: weight,
        transform: `translateY(${lift}em) rotate(${rot}deg)`,
      }}
    >
      <g filter="url(#lamia-pencil)">
        <path d={d} />
        {/* Second, offset pass — pencil lines never land twice in one place. */}
        <path d={d} className="lamia-doodle-pass" transform="translate(2.5 -2)" />
      </g>
    </svg>
  );
}

// Each row starts at a different title so the wall doesn't read as stripes.
function row(i) {
  const out = [];
  for (let k = 0; k < 9; k++) {
    const t = TITLES[(i * 5 + k * 3) % TITLES.length];
    out.push(
      <span key={k} className={k % 4 === i % 4 ? "lamia-hot" : undefined}>
        {t}
      </span>
    );
    if (k === 4) {
      out.push(
        <span key={`a${k}`} className="lamia-album">
          {ALBUMS[i % ALBUMS.length]}
        </span>
      );
    }
    // Most gaps get a doodle, some get two huddled together, a few stay empty.
    const roll = rand(i, k, 9);
    const count = roll < 0.2 ? 0 : roll < 0.75 ? 1 : 2;
    if (count) {
      out.push(
        <span key={`d${k}`} className="lamia-doodles">
          {Array.from({ length: count }, (_, n) => (
            <Doodle key={n} i={i} k={k} n={n * 10} />
          ))}
        </span>
      );
    }
  }
  return out;
}

/**
 * Splash when someone picks lamia (not on hover previews or when a saved
 * lamia loads).
 * `onLamia` fires alongside it — App uses it to replay the demo.
 */
function useLamiaSplash(onLamia) {
  /** false | "in" (showing) | "out" (sliding away) */
  const [show, setShow] = useState(false);
  const onLamiaRef = useRef(onLamia);
  onLamiaRef.current = onLamia;
  const outTimer = useRef(0);
  const close = () => {
    stopDougie();
    setShow((cur) => (cur ? "out" : cur));
    clearTimeout(outTimer.current);
    outTimer.current = setTimeout(() => setShow(false), SPLASH_OUT_MS);
    try {
      sessionStorage.removeItem(SPLASH_PENDING_KEY);
    } catch {
      /* ignore */
    }
  };
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    const root = document.documentElement;
    let prev = root.dataset.theme;
    let timer;
    // Warm the song once the page settles so a lamia pick can play it at once.
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500));
    idle(() => void prefetchDougie());
    const play = () => {
      clearTimeout(outTimer.current);
      startDougie();
      setShow("in");
      onLamiaRef.current?.();
      clearTimeout(timer);
      timer = setTimeout(() => closeRef.current(), SPLASH_MAX_MS);
    };
    try {
      if (prev === "lamia" && sessionStorage.getItem(SPLASH_PENDING_KEY)) play();
    } catch {
      /* ignore */
    }
    // Only real picks (theme menu click, accent change) dispatch this — menu
    // hover previews retint too, and must not set off the splash.
    function onPicked() {
      const next = root.dataset.theme;
      if (next === "lamia" && prev !== "lamia") {
        try {
          sessionStorage.setItem(SPLASH_PENDING_KEY, "1");
        } catch {
          /* ignore */
        }
        play();
      }
      prev = next;
    }
    window.addEventListener("guessify:theme-picked", onPicked);
    return () => {
      window.removeEventListener("guessify:theme-picked", onPicked);
      clearTimeout(timer);
      clearTimeout(outTimer.current);
      stopDougie();
    };
  }, []);
  return [show, close];
}

/** A GIF, not a video — iOS won't autoplay video here. Ends the splash after one loop. */
function SplashGif({ onDone }) {
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <img
      className="lamia-splash-gif"
      src={SPLASH_GIF}
      alt=""
      draggable={false}
      onLoad={() => {
        clearTimeout(timer.current);
        timer.current = setTimeout(onDone, SPLASH_GIF_MS);
      }}
      onError={() => {
        clearTimeout(timer.current);
        timer.current = setTimeout(onDone, SPLASH_NO_GIF_MS);
      }}
    />
  );
}

// Fresh random layout each splash so the rain never repeats.
function catRain() {
  return Array.from({ length: CAT_COUNT }, (_, i) => ({
    id: i,
    cat: CATS[i % CATS.length],
    left: Math.random() * 100,
    size: 22 + Math.random() * 30,
    delay: 0.3 + Math.random() * 2.4,
    dur: 1.4 + Math.random() * 1.2,
    spin: (Math.random() < 0.5 ? -1 : 1) * (120 + Math.random() * 360),
  }));
}

export default function LamiaBackdrop({ onLamia }) {
  const [splash, closeSplash] = useLamiaSplash(onLamia);
  const cats = useMemo(() => (splash ? catRain() : []), [splash]);
  return (
    <>
      {splash && (
        <div
          className={`lamia-splash${splash === "out" ? " is-out" : ""}`}
          onClick={closeSplash}
          role="status"
        >
          <div className="lamia-cats" aria-hidden="true">
            {cats.map((c) => (
              <span
                key={c.id}
                style={{
                  left: `${c.left}%`,
                  fontSize: `${c.size}px`,
                  animationDelay: `${c.delay}s`,
                  animationDuration: `${c.dur}s`,
                  "--spin": `${c.spin}deg`,
                }}
              >
                {c.cat}
              </span>
            ))}
          </div>
          <div className="lamia-splash-name">{SPLASH_NAME}</div>
          <SplashGif onDone={closeSplash} />
        </div>
      )}
      <div className="lamia-backdrop" aria-hidden="true">
        <svg className="lamia-pencil-defs" width="0" height="0">
          {/* Slight wobble, then punch fine grain holes so it reads as pencil on paper. */}
          <filter id="lamia-pencil" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="2" seed="3" result="warp" />
            <feDisplacementMap in="SourceGraphic" in2="warp" scale="5" result="wobble" />
            <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" seed="11" result="grain" />
            <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -3.2 2.1" result="holes" />
            <feComposite in="wobble" in2="holes" operator="in" />
          </filter>
        </svg>
        <div className="lamia-wall">
          {Array.from({ length: ROWS }, (_, i) => (
            <div key={i} className={`lamia-row${i % 2 ? " lamia-row--rev" : ""}`}>
              {row(i)}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
