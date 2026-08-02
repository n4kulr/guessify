import { formatSolveSec } from "../gameStats.js";

/**
 * End-of-game stats: grid, personal bests, replay timeline.
 * @param {{ stats: object, bests?: { name: string, best: number, today: number } | null }} props
 */
export default function GameOverStats({ stats, bests = null }) {
  if (!stats) return null;

  return (
    <div className="gos">
      <div className="gos-grid">
        <div className="gos-cell">
          <span className="gos-label">Score</span>
          <span className="gos-value">{stats.score}</span>
        </div>
        <div className="gos-cell">
          <span className="gos-label">Accuracy</span>
          <span className="gos-value">
            {Math.round((stats.accuracy || 0) * 100)}%
          </span>
        </div>
        <div className="gos-cell">
          <span className="gos-label">Avg solve</span>
          <span className="gos-value">{formatSolveSec(stats.avgSolveMs)}</span>
        </div>
        <div className="gos-cell">
          <span className="gos-label">Artists</span>
          <span className="gos-value">
            {stats.artistsClaimed}/{stats.artistsTotal}
          </span>
        </div>
        <div className="gos-cell">
          <span className="gos-label">Fastest</span>
          <span className="gos-value">{formatSolveSec(stats.fastestMs)}</span>
        </div>
        <div className="gos-cell">
          <span className="gos-label">Best streak</span>
          <span className="gos-value">{stats.bestStreak}</span>
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

      <div className="gos-block">
        <h3 className="gos-heading">Replay</h3>
        <ul className="gos-timeline">
          {(stats.timeline || []).map((row) => (
            <li key={row.round} className="gos-tl-row">
              <span className="gos-tl-label">Round {row.round}</span>
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
    </div>
  );
}
