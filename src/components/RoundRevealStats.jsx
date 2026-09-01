import { useState } from "react";
import { formatSolveClock, roundRevealFacts } from "../gameStats.js";
import { TimedPlacesList } from "../multiplayer/TimedHud.jsx";

const MISS_LINES = ["aw man :(", "better luck next time :("];

export default function RoundRevealStats({
  youWon = false,
  wallMs = null,
  pts = 0,
  bonus = false,
  priorLog = [],
  places = null,
}) {
  const [ms] = useState(wallMs);
  const [missLine] = useState(
    () => MISS_LINES[Math.floor(Math.random() * MISS_LINES.length)]
  );
  const facts = roundRevealFacts(priorLog, { won: youWon, wallMs: youWon ? ms : null });
  const chips = [];

  if (youWon && bonus) chips.push("artist bonus");
  if (facts.isPb) chips.push("personal best");
  if (facts.deltaMs != null && facts.deltaMs !== 0) {
    const abs = formatSolveClock(Math.abs(facts.deltaMs));
    chips.push(facts.deltaMs > 0 ? `−${abs} vs last` : `+${abs} vs last`);
  }
  if (facts.streak >= 2) chips.push(`${facts.streak} streak`);

  return (
    <div
      className={`reveal-clock${youWon ? " reveal-clock--win" : " reveal-clock--lose"}`}
      role="status"
    >
      {youWon ? (
        <div className="reveal-clock-row">
          <span className="reveal-clock-time">{formatSolveClock(ms)}</span>
          {pts > 0 && <span className="reveal-clock-pts">+{pts}</span>}
        </div>
      ) : (
        <span className="reveal-clock-miss">{missLine}</span>
      )}
      {youWon && <span className="reveal-clock-caption">you solved it</span>}
      {youWon && chips.length > 0 && (
        <div className="reveal-clock-chips">
          {chips.map((c) => (
            <span key={c}>
              <b>{c}</b>
            </span>
          ))}
        </div>
      )}
      <TimedPlacesList places={places} />
    </div>
  );
}
