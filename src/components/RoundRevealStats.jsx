import { useState } from "react";
import { formatSolveClock } from "../gameStats.js";

const MISS_LINES = ["aw man :(", "better luck next time :("];

export default function RoundRevealStats({ youWon = false, wallMs = null }) {
  const [ms] = useState(wallMs);
  const [missLine] = useState(
    () => MISS_LINES[Math.floor(Math.random() * MISS_LINES.length)]
  );

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
