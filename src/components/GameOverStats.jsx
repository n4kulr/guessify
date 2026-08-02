import { formatSolveSec, solveCompareSeries } from "../gameStats.js";

/** Compact SVG line chart — no chart lib. */
function SolveCompareChart({ series = [], myId = null }) {
  if (!series.length) return null;

  const pad = { t: 16, r: 12, b: 28, l: 36 };
  const W = 320;
  const H = 160;
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;

  const allPts = series.flatMap((s) => s.points);
  const rounds = [...new Set(allPts.map((p) => p.round))].sort((a, b) => a - b);
  const maxRound = Math.max(...rounds, 1);
  const maxMs = Math.max(...allPts.map((p) => p.wallMs), 1);

  const xFor = (round) =>
    pad.l + (maxRound <= 1 ? innerW / 2 : ((round - 1) / (maxRound - 1)) * innerW);
  const yFor = (ms) => pad.t + innerH - (ms / maxMs) * innerH;

  const yTicks = [0, 0.5, 1].map((t) => ({
    y: pad.t + innerH * (1 - t),
    label: formatSolveSec(maxMs * t),
  }));

  return (
    <div className="gos-chart-wrap">
      <svg
        className="gos-chart"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Solve times by round for each player"
      >
        {yTicks.map((t) => (
          <g key={t.y}>
            <line
              className="gos-chart-grid"
              x1={pad.l}
              x2={W - pad.r}
              y1={t.y}
              y2={t.y}
            />
            <text className="gos-chart-axis" x={pad.l - 6} y={t.y + 3} textAnchor="end">
              {t.label}
            </text>
          </g>
        ))}
        {rounds.map((r) => (
          <text
            key={r}
            className="gos-chart-axis"
            x={xFor(r)}
            y={H - 8}
            textAnchor="middle"
          >
            R{r}
          </text>
        ))}
        {series.map((s) => {
          const d = s.points
            .map((p, i) => `${i === 0 ? "M" : "L"}${xFor(p.round)},${yFor(p.wallMs)}`)
            .join(" ");
          const stroke = s.color || "var(--main-color)";
          const mine = myId && s.id === myId;
          return (
            <g key={s.id}>
              <path
                d={d}
                fill="none"
                stroke={stroke}
                strokeWidth={mine ? 2.5 : 1.75}
                strokeOpacity={mine ? 1 : 0.75}
              />
              {s.points.map((p) => (
                <circle
                  key={`${s.id}-${p.round}`}
                  cx={xFor(p.round)}
                  cy={yFor(p.wallMs)}
                  r={mine ? 4 : 3}
                  fill={stroke}
                />
              ))}
            </g>
          );
        })}
      </svg>
      <ul className="gos-chart-legend">
        {series.map((s) => (
          <li key={s.id} className={myId && s.id === myId ? "is-me" : ""}>
            <span
              className="gos-chart-swatch"
              style={{ background: s.color || "var(--main-color)" }}
            />
            {s.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * End-of-game stats: grid, personal bests, replay + optional compare chart.
 * @param {boolean} hideMisses — multiplayer only: drop unsolved rounds from replay
 */
export default function GameOverStats({
  stats,
  bests = null,
  roundResults = null,
  players = null,
  myId = null,
  hideMisses = false,
}) {
  if (!stats) return null;

  const timeline = stats.timeline || [];
  const wins = stats.timelineWins || timeline.filter((r) => r.won);
  const replay = hideMisses ? wins : timeline;

  const series = solveCompareSeries(
    roundResults ||
      (hideMisses
        ? wins.map((r) => ({
            round: r.round,
            winnerId: myId || "you",
            wallMs: r.wallMs,
            winnerName: "you",
          }))
        : []),
    players || []
  );

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

      {series.length > 0 && (
        <div className="gos-block">
          <h3 className="gos-heading">
            {series.length > 1 ? "Solve times" : "Your solves"}
          </h3>
          <SolveCompareChart series={series} myId={myId} />
        </div>
      )}

      {replay.length > 0 && (
        <div className="gos-block">
          <h3 className="gos-heading">Replay</h3>
          <ul className="gos-timeline">
            {replay.map((row) => (
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
      )}
    </div>
  );
}
