import { useState } from "react";
import { formatSolveClock } from "../gameStats.js";

/** Kept for callers that pass no detail — plain, but never just "you lost". */
const MISS_LINES = ["aw man :(", "better luck next time :("];
const CLOSE_LINES = ["almost had it!", "so close.."];

/**
 * A win shows the solve clock and nothing else — the title and artist sit
 * right below it, and that's the whole reveal.
 *
 * @param {object} p
 * @param {boolean} [p.youWon]
 * @param {number|null} [p.wallMs]
 * @param {number} [p.almostPts]       consolation paid for a near miss
 */
export default function RoundRevealStats({
  youWon = false,
  wallMs = null,
  almostPts = 0,
}) {
  const [ms] = useState(wallMs);
  const [missLine] = useState(() => {
    const lines = almostPts > 0 ? CLOSE_LINES : MISS_LINES;
    return lines[Math.floor(Math.random() * lines.length)];
  });

  return (
    <div
      className={`reveal-clock${youWon ? " reveal-clock--win" : " reveal-clock--lose"}`}
      role="status"
    >
      {youWon ? (
        <span className="reveal-clock-time">{formatSolveClock(ms)}</span>
      ) : (
        <span className="reveal-clock-miss">{missLine}</span>
      )}
    </div>
  );
}
