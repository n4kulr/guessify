import { useState } from "react";
import { formatSolveClock, roundRevealFacts } from "../gameStats.js";
import { TimedPlacesList } from "../multiplayer/TimedHud.jsx";

function caption({ won, youWon, winnerName, timed }) {
  if (youWon) return "you solved it";
  if (won && winnerName) return `${winnerName} solved it`;
  if (won) return "solved";
  if (timed) return "time's up";
  return "no title";
}

export default function RoundRevealStats({
  won = false,
  youWon = false,
  winnerName = null,
  timed = false,
  wallMs = null,
  pts = 0,
  bonus = false,
  unlockedSec = null,
  artistClaimed = false,
  priorLog = [],
  places = null,
}) {
  const [ms] = useState(wallMs);
  const facts = roundRevealFacts(priorLog, { won: youWon, wallMs: youWon ? ms : null });
  const clock = formatSolveClock(ms);
  const chips = [];

  if (pts > 0) chips.push(`+${pts} pts`);
  if (youWon && bonus) chips.push("artist bonus");
  if (facts.isPb) chips.push("personal best");
  if (facts.deltaMs != null && facts.deltaMs !== 0) {
    const abs = formatSolveClock(Math.abs(facts.deltaMs));
    chips.push(facts.deltaMs > 0 ? `−${abs} vs last` : `+${abs} vs last`);
  }
  if (facts.streak >= 2) chips.push(`${facts.streak} streak`);
  if (!won && unlockedSec != null) chips.push(`heard ${unlockedSec}s`);
  if (!won && artistClaimed) chips.push("artist locked");

  return (
    <div
      className={`reveal-clock${won || youWon ? " reveal-clock--win" : " reveal-clock--lose"}`}
      role="status"
    >
      <span className="reveal-clock-time">{clock}</span>
      <span className="reveal-clock-caption">
        {caption({ won, youWon, winnerName, timed })}
      </span>
      {chips.length > 0 && (
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
