import { useEffect, useMemo, useRef, useState } from "react";

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
    const play = () => {
      clearTimeout(outTimer.current);
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
