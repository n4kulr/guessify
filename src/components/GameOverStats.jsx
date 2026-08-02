import { useEffect, useState } from "react";
import { formatSolveSec, solveCompareSeries } from "../gameStats.js";

const W = 320;
const H = 168;
const PAD = { t: 16, r: 12, b: 26, l: 40 };
const DOT_R = 3;
const RING_R = 6;
const HIT_R = 16;

function pointLabel(p) {
  if (p.label) return p.label;
  if (p.title && p.artist) return `${p.title} · ${p.artist}`;
  if (p.title) return p.title;
  return p.miss ? `Round ${p.round} · miss` : `Round ${p.round}`;
}

/** Compact SVG line chart — rings on every round; hover/tap shows the song. */
function SolveCompareChart({ series = [], myId = null, showLegend = true }) {
  const [tip, setTip] = useState(null);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!series.length) return null;

  const innerW = W - PAD.l - PAD.r;
  // Equal gaps: max → mid → 0 → X
  const axisTop = PAD.t;
  const axisBottom = H - PAD.b;
  const step = (axisBottom - axisTop) / 3;
  const zeroY = axisTop + step * 2;
  const timeH = step * 2;

  const allPts = series.flatMap((s) => s.points);
  const rounds = [...new Set(allPts.map((p) => p.round))].sort((a, b) => a - b);
  const maxRound = Math.max(...rounds, 1);
  const solveMs = allPts
    .filter((p) => !p.miss && p.wallMs != null && Number.isFinite(p.wallMs))
    .map((p) => p.wallMs);
  const maxMs = Math.max(...solveMs, 1);

  const xFor = (round) =>
    PAD.l + (maxRound <= 1 ? innerW / 2 : ((round - 1) / (maxRound - 1)) * innerW);
  const yFor = (p) => {
    if (p.miss) return axisBottom;
    return zeroY - ((p.wallMs || 0) / maxMs) * timeH;
  };

  const yTicks = [
    { y: axisTop, label: formatSolveSec(maxMs) },
    { y: axisTop + step, label: formatSolveSec(maxMs * 0.5) },
    { y: zeroY, label: formatSolveSec(0) },
    { y: axisBottom, label: "X" },
  ];

  function openTip(s, p, cx, cy) {
    setTip({
      key: `${s.id}-${p.round}`,
      cx,
      cy,
      text: pointLabel(p),
    });
  }

  return (
    <div
      className="gos-chart-wrap"
      onPointerDown={(e) => {
        if (!e.target.closest?.("[data-gos-hit]")) setTip(null);
      }}
    >
      <svg
        className={`gos-chart${drawn ? " is-drawn" : ""}`}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Solve times by round"
      >
        {yTicks.map((t) => (
          <g key={`${t.label}-${t.y}`}>
            <line
              className="gos-chart-grid"
              x1={PAD.l}
              x2={W - PAD.r}
              y1={t.y}
              y2={t.y}
            />
            <text
              className="gos-chart-axis"
              x={PAD.l - 14}
              y={t.y + 3}
              textAnchor="end"
            >
              {t.label}
            </text>
          </g>
        ))}
        {rounds.map((r) => (
          <text
            key={r}
            className="gos-chart-axis"
            x={xFor(r)}
            y={H - 6}
            textAnchor="middle"
          >
            R{r}
          </text>
        ))}
        {series.map((s) => {
          const pts = [...s.points].sort((a, b) => a.round - b.round);
          if (!pts.length) return null;
          const d = pts
            .map((p, i) => `${i === 0 ? "M" : "L"}${xFor(p.round)},${yFor(p)}`)
            .join(" ");
          const stroke = s.color || "var(--main-color)";
          const mine = myId && s.id === myId;
          return (
            <g key={s.id}>
              <path
                className={`gos-chart-line${drawn ? " is-drawn" : ""}`}
                d={d}
                fill="none"
                stroke={stroke}
                strokeWidth={mine || !myId ? 2.5 : 1.75}
                strokeOpacity={mine || !myId ? 1 : 0.7}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {pts.map((p) => {
                const cx = xFor(p.round);
                const cy = yFor(p);
                const key = `${s.id}-${p.round}`;
                return (
                  <g key={key}>
                    <circle
                      className="gos-chart-ring"
                      cx={cx}
                      cy={cy}
                      r={RING_R}
                      fill="none"
                      stroke={stroke}
                      strokeWidth={1.25}
                      strokeOpacity={mine || !myId ? 1 : 0.7}
                    />
                    <circle
                      className="gos-chart-dot"
                      cx={cx}
                      cy={cy}
                      r={DOT_R}
                      fill={stroke}
                      fillOpacity={mine || !myId ? 1 : 0.7}
                    />
                    <circle
                      data-gos-hit=""
                      className="gos-chart-hit"
                      cx={cx}
                      cy={cy}
                      r={HIT_R}
                      fill="transparent"
                      role="button"
                      tabIndex={0}
                      aria-label={pointLabel(p)}
                      onPointerEnter={(e) => {
                        if (e.pointerType === "mouse") openTip(s, p, cx, cy);
                      }}
                      onPointerLeave={(e) => {
                        if (e.pointerType === "mouse") setTip(null);
                      }}
                      onPointerUp={(e) => {
                        e.stopPropagation();
                        if (e.pointerType === "mouse") return;
                        setTip((prev) =>
                          prev?.key === key
                            ? null
                            : {
                                key,
                                cx,
                                cy,
                                text: pointLabel(p),
                              }
                        );
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openTip(s, p, cx, cy);
                        }
                      }}
                    />
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
      {tip && (
        <div
          className="gos-chart-tip"
          style={{
            left: `${(tip.cx / W) * 100}%`,
            top: `${(tip.cy / H) * 100}%`,
          }}
          role="tooltip"
        >
          {tip.text}
        </div>
      )}
      {showLegend && series.length > 1 && (
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
      )}
    </div>
  );
}

function personalSeriesFromTimeline(timeline, myId, players = null) {
  if (!timeline.length) return [];
  const me = (players || []).find((p) => p.id === myId);
  return [
    {
      id: myId || "you",
      name: "you",
      color: me?.color || me?.avatar?.color || null,
      points: timeline.map((r) => ({
        round: r.round,
        wallMs: r.won ? r.wallMs : null,
        miss: !r.won,
        title: r.title || null,
        artist: r.artist || null,
        label: r.label || null,
      })),
    },
  ];
}

/**
 * One chart: your line (wins + misses) plus other players' wins when racing.
 */
function chartSeries({ timeline, roundResults, players, myId, hideMisses }) {
  const personal = personalSeriesFromTimeline(timeline, myId, players);
  if (!personal.length) return [];
  if (!hideMisses) return personal;

  const others = solveCompareSeries(
    roundResults ||
      (timeline || [])
        .filter((r) => r.won)
        .map((r) => ({
          round: r.round,
          winnerId: myId || "you",
          wallMs: r.wallMs,
          winnerName: "you",
          title: r.title,
          artist: r.artist,
          label: r.label,
        })),
    players || []
  ).filter((s) => s.id !== (myId || "you"));

  return [...personal, ...others];
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

  const series = chartSeries({
    timeline,
    roundResults,
    players,
    myId,
    hideMisses,
  });
  const multi = series.length > 1;

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
            {multi ? "Solve times" : "Your solves"}
          </h3>
          <SolveCompareChart
            series={series}
            myId={myId}
            showLegend={multi}
          />
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
