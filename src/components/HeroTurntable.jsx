import { useEffect, useRef, useState } from "react";
import ScrubbableVinyl from "./ScrubbableVinyl.jsx";
import DragMeNudge from "./DragMeNudge.jsx";
import { playNeedleDrop } from "../vinylScratch.js";

// Demo round covers (Apple Music), minus Infrunami.
const HERO_COVERS = [
  // Marvin's Room — Drake
  "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/d2/53/62/d2536245-b94c-b3fd-7168-9512f655f6d4/00602527899091.rgb.jpg/300x300bb.jpg",
  // It's Nice To Have A Friend — Taylor Swift
  "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/49/3d/ab/493dab54-f920-9043-6181-80993b8116c9/19UMGIM53909.rgb.jpg/300x300bb.jpg",
  // House of Balloons — The Weeknd
  "https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/31/18/fa/3118fab0-90ea-2ae5-cf6c-bc64054ab9e3/21UMGIM21449.rgb.jpg/300x300bb.jpg",
  // Thinkin Bout You — Frank Ocean
  "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/04/f8/63/04f863fc-2852-604f-c910-a97ac069506b/12UMGIM40339.rgb.jpg/300x300bb.jpg",
  // Lovers Rock — TV Girl
  "https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/3d/09/0c/3d090c87-f02b-3c3c-cedf-603cc900082f/888174780955_cover.jpg/300x300bb.jpg",
];

const COVER_CYCLE_MS = 5000;

function prefersReducedMotion() {
  return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
}

/** Landing hero platter — tonearm drops once on first view or interaction. */
export default function HeroTurntable() {
  const rootRef = useRef(null);
  const hasDropped = useRef(false);
  const ioRef = useRef(null);
  const [armOn, setArmOn] = useState(false);
  const [coverIdx, setCoverIdx] = useState(0);

  function dropNeedle() {
    if (hasDropped.current) return;
    hasDropped.current = true;
    setArmOn(true);
    ioRef.current?.disconnect();
    if (!prefersReducedMotion()) {
      try {
        playNeedleDrop();
      } catch {
        /* autoplay / audio policy */
      }
    }
  }

  useEffect(() => {
    const el = rootRef.current;
    if (!el || hasDropped.current) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting && e.intersectionRatio > 0.35)) {
          dropNeedle();
        }
      },
      { threshold: [0.35, 0.5] }
    );
    ioRef.current = io;

    // Let the raised arm paint, then observe so in-view loads still show the drop.
    let timer = 0;
    const raf = requestAnimationFrame(() => {
      timer = window.setTimeout(() => {
        if (!hasDropped.current) io.observe(el);
      }, 160);
    });

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      io.disconnect();
      ioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setCoverIdx((i) => (i + 1) % HERO_COVERS.length);
    }, COVER_CYCLE_MS);
    return () => clearInterval(id);
  }, []);

  const cover = HERO_COVERS[coverIdx];

  return (
    <div
      className="hero-turntable"
      ref={rootRef}
      onPointerDownCapture={dropNeedle}
    >
      <ScrubbableVinyl spin="fast" title="drag to scrub">
        <div className="vinyl-label">
          <img
            key={cover}
            className="vinyl-label-art"
            src={cover}
            alt=""
            decoding="async"
            draggable={false}
          />
        </div>
      </ScrubbableVinyl>
      <div
        className={`tonearm${armOn ? " tonearm--on" : ""}`}
        aria-hidden="true"
      />
      <DragMeNudge />
    </div>
  );
}
