import { formatSolveSec } from "../gameStats.js";
import ScrubbableVinyl from "./ScrubbableVinyl.jsx";

function commas(n) {
  return Number(n).toLocaleString("en-US");
}

function fastestWin(timeline) {
  const wins = (timeline || []).filter((row) => row?.won && row.wallMs > 0);
  if (!wins.length) return null;
  return wins.reduce((a, b) => (b.wallMs < a.wallMs ? b : a));
}

export function GameOverHero({ score = 0, maxScore = 0, place = 0 }) {
  let sub = "pts";
  if (maxScore) sub = `of ${commas(maxScore)} pts`;
  else if (place) sub = `pts · #${place}`;

  return (
    <div className="gameover-hero">
      <div className="turntable">
        <ScrubbableVinyl spin="slow" title="drag to scrub">
          <div className="vinyl-label" aria-hidden="true" />
        </ScrubbableVinyl>
      </div>
      <div className="gameover-hero-copy">
        <p className="gameover-kicker">That's a wrap!</p>
        <p className="gameover-eyebrow">Your score</p>
        <p className="gameover-score">{commas(score)}</p>
        <p className="gameover-score-sub">{sub}</p>
      </div>
    </div>
  );
}

/**
 * End-of-game stats: fastest song, chips, personal bests, replay.
 * @param {boolean} hideMisses — multiplayer only: drop unsolved rounds from replay
 */
export default function GameOverStats({
  stats,
  bests = null,
  hideMisses = false,
}) {
  if (!stats) return null;

  const timeline = stats.timeline || [];
  const wins = stats.timelineWins || timeline.filter((r) => r.won);
  const replay = hideMisses ? wins : timeline;
  const fastest = fastestWin(timeline);

  return (
    <div className="gos">
      {fastest && (
        <div className="gos-fast">
          {fastest.cover ? (
            <img src={fastest.cover} alt="" className="gos-fast-art" />
          ) : (
            <span className="gos-fast-art" aria-hidden="true" />
          )}
          <div className="gos-fast-copy">
            <p className="gos-fast-k">Your fastest</p>
            <p className="gos-fast-title">{fastest.title || "a song"}</p>
            {fastest.artist ? (
              <p className="gos-fast-artist">{fastest.artist}</p>
            ) : null}
          </div>
          <span className="gos-fast-time">{formatSolveSec(fastest.wallMs)}</span>
        </div>
      )}

      <div className="gos-chips">
        <div className="gos-chip">
          <p className="gos-chip-k">accuracy</p>
          <p className="gos-chip-v">{Math.round((stats.accuracy || 0) * 100)}%</p>
        </div>
        <div className="gos-chip">
          <p className="gos-chip-k">streak</p>
          <p className="gos-chip-v">{stats.bestStreak}</p>
        </div>
        <div className="gos-chip">
          <p className="gos-chip-k">artists</p>
          <p className="gos-chip-v">
            {stats.artistsClaimed}/{stats.artistsTotal}
          </p>
        </div>
        <div className="gos-chip">
          <p className="gos-chip-k">avg solve</p>
          <p className="gos-chip-v">{formatSolveSec(stats.avgSolveMs)}</p>
        </div>
      </div>

      {bests && (
        <div className="gos-bests">
          <span className="gos-bests-name">{bests.name}</span>
          <span className="gos-bests-pair">
            Best <b>{bests.best}</b>
          </span>
          <span className="gos-bests-pair">
            Today <b>{bests.today}</b>
          </span>
        </div>
      )}

      {replay.length > 0 && (
        <div className="gos-block">
          <h3 className="gos-heading">Replay</h3>
          <ul className="gos-timeline">
            {replay.map((row) => (
              <li key={row.round} className="gos-tl-row">
                <span className="gos-tl-label">R{row.round}</span>
                <span className="gos-tl-track">
                  {row.won ? (
                    <span
                      className="gos-tl-bar"
                      style={{ width: `${Math.max(8, row.barPct)}%` }}
                    />
                  ) : (
                    <span className="gos-tl-miss">—</span>
                  )}
                </span>
                <span className="gos-tl-time">
                  {row.won ? formatSolveSec(row.wallMs) : "miss"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
