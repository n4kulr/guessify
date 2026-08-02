import { useEffect, useState } from "react";
import { fireConfetti } from "../fx.js";

/**
 * Solo test: record slides out → cover flips → confetti + pts.
 * Mount / change `playKey` to replay.
 */
export default function ShopReveal({
  playKey,
  cover,
  title,
  artist,
  points = null,
}) {
  const [phase, setPhase] = useState("is-idle");
  const win = points != null && points > 0;

  useEffect(() => {
    setPhase("is-idle");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t1 = reduced ? 40 : 280;
    const t2 = reduced ? 100 : 1100;
    const t3 = reduced ? 160 : 2000;
    const a = setTimeout(() => setPhase("is-slide"), t1);
    const b = setTimeout(() => setPhase("is-flip"), t2);
    const c = setTimeout(() => {
      setPhase("is-boom");
      if (win) fireConfetti("title");
    }, t3);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
      clearTimeout(c);
    };
  }, [playKey, win]);

  return (
    <div className={`shop-reveal ${phase}`} aria-live="polite">
      {win && <div className="shop-reveal-points">+{points}</div>}

      <div className="shop-reveal-pack">
        <div className="shop-reveal-disc" aria-hidden="true">
          <div className="shop-reveal-disc-label" />
        </div>
        <div className="shop-reveal-sleeve">
          <div className="shop-reveal-face shop-reveal-front">
            <span className="shop-reveal-spine" />
          </div>
          <div className="shop-reveal-face shop-reveal-back">
            <span className="shop-reveal-spine" />
            {cover ? (
              <img src={cover} alt="" className="shop-reveal-art" />
            ) : (
              <span className="shop-reveal-art-fallback" aria-hidden="true" />
            )}
          </div>
        </div>
      </div>

      <div className="shop-reveal-meta">
        <p className="shop-reveal-title">{title}</p>
        <p className="shop-reveal-artist">{artist}</p>
      </div>

      <div className="shop-reveal-bin" aria-hidden="true" />
    </div>
  );
}
