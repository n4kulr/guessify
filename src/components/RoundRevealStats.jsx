import { useState } from "react";
import { formatSolveClock, formatSolveSec } from "../gameStats.js";

/** Kept for callers that pass no detail — plain, but never just "you lost". */
const MISS_LINES = ["aw man :(", "better luck next time :("];

/**
 * @param {object} p
 * @param {boolean} [p.youWon]
 * @param {number|null} [p.wallMs]
 * @param {number|null} [p.pts]        points banked this round (solo)
 * @param {number} [p.streak]          wins in a row including this one
 * @param {number} [p.multiplier]      streak multiplier applied to pts
 * @param {boolean} [p.artistClaimed]  artist bonus was taken this round
 * @param {number} [p.almostPts]       consolation paid for a near miss
 */
export default function RoundRevealStats({
  youWon = false,
  wallMs = null,
  pts = null,
  streak = 0,
  multiplier = 1,
  artistClaimed = false,
  almostPts = 0,
}) {
  const [ms] = useState(wallMs);
  const [missLine] = useState(
    () => MISS_LINES[Math.floor(Math.random() * MISS_LINES.length)]
  );

  // Only the solo board passes points; multiplayer keeps the bare clock.
  const showPts = pts != null;
  const consolation = (artistClaimed ? 1 : 0) + (almostPts > 0 ? 1 : 0);

  return (
    <div
      className={`reveal-clock${youWon ? " reveal-clock--win" : " reveal-clock--lose"}`}
      role="status"
    >
      {youWon ? (
        <>
          <span className="reveal-clock-time">{formatSolveClock(ms)}</span>
          {showPts && (
            <span className="reveal-clock-pts">
              +{pts}
              {multiplier > 1 && (
                <span className="reveal-clock-streak">
                  {" "}
                  {streak} in a row ×{multiplier}
                </span>
              )}
            </span>
          )}
        </>
      ) : (
        <>
          <span className="reveal-clock-miss">{missLine}</span>
          {showPts &&
            (consolation > 0 ? (
              <span className="reveal-clock-pts reveal-clock-pts--part">
                still +{pts}
                <span className="reveal-clock-streak">
                  {" "}
                  {artistClaimed ? "artist" : "so close"}
                </span>
              </span>
            ) : (
              ms != null && (
                <span className="reveal-clock-streak">
                  you held out {formatSolveSec(ms)}
                </span>
              )
            ))}
        </>
      )}
    </div>
  );
}
