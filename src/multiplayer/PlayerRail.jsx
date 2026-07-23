import { useEffect, useMemo, useRef, useState } from "react";
import PlayerAvatar from "./PlayerAvatar.jsx";
import { STEPS, TOTAL, unlockSecondsFor } from "./constants.js";

function CrownIcon() {
  return (
    <svg viewBox="0 0 16 12" width="14" height="11" aria-hidden="true">
      <path
        fill="currentColor"
        d="M1.2 10.5h13.6L16 3.8l-3.2 2.2L8 1.2 3.2 6 0 3.8l1.2 6.7zm0 0h13.6V12H1.2v-1.5z"
      />
    </svg>
  );
}

/**
 * Ranked player chips. When `unlockByPlayer` is set, a light full-chip fill
 * (+ step ticks) shows how much of the track that player has unlocked via skip.
 */
export default function PlayerRail({
  players = [],
  winnerId,
  pulseId,
  unlockByPlayer = null,
}) {
  const prevScores = useRef({});
  const [flashes, setFlashes] = useState({}); // id -> { pts, key }
  const showUnlock = unlockByPlayer != null;

  useEffect(() => {
    const nextFlashes = {};
    for (const p of players) {
      const prev = prevScores.current[p.id];
      const score = p.score ?? 0;
      if (prev != null && score > prev) {
        nextFlashes[p.id] = { pts: score - prev, key: `${p.id}-${score}-${Date.now()}` };
      }
      prevScores.current[p.id] = score;
    }
    if (Object.keys(nextFlashes).length) {
      setFlashes((f) => ({ ...f, ...nextFlashes }));
      const timer = setTimeout(() => {
        setFlashes((f) => {
          const copy = { ...f };
          for (const id of Object.keys(nextFlashes)) delete copy[id];
          return copy;
        });
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [players]);

  const ranked = useMemo(() => {
    return [...players].sort((a, b) => {
      const ds = (b.score ?? 0) - (a.score ?? 0);
      if (ds !== 0) return ds;
      // Stable-ish tie-break: host first, then name
      if (a.isHost !== b.isHost) return a.isHost ? -1 : 1;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }, [players]);

  const placeById = useMemo(() => {
    const anyScore = ranked.some((p) => (p.score ?? 0) > 0);
    if (!anyScore) return {};
    const map = {};
    ranked.forEach((p, i) => {
      map[p.id] = i + 1;
    });
    return map;
  }, [ranked]);

  if (!players.length) {
    return <p className="mp-empty">waiting for players to scan in…</p>;
  }

  return (
    <div className="mp-rail">
      {ranked.map((p) => {
        const flash = flashes[p.id];
        const place = placeById[p.id];
        const medal = place >= 1 && place <= 3 ? place : 0;
        const secs = showUnlock
          ? unlockSecondsFor(unlockByPlayer, p.id)
          : null;
        const pct = secs != null ? (secs / TOTAL) * 100 : 0;
        const accent = p.avatar?.color || p.color || "var(--main-color)";
        return (
          <div
            key={p.id}
            className={`mp-player ${showUnlock ? "mp-player--unlock" : ""} ${
              p.left ? "left" : !p.connected ? "offline" : ""
            } ${pulseId === p.id ? "pulse" : ""} ${
              flash ? "mp-player--gain" : ""
            }`}
            style={
              showUnlock
                ? { "--mp-unlock-accent": accent }
                : undefined
            }
          >
            {showUnlock && (
              <div
                className="mp-player-unlock"
                title={`${secs}s unlocked`}
                aria-label={`${p.name}: ${secs}s unlocked`}
              >
                <div
                  className="mp-player-unlock-fill"
                  style={{ width: `${pct}%` }}
                />
                {STEPS.map((s) => (
                  <span
                    key={s}
                    className="mp-player-unlock-tick"
                    style={{ left: `${(s / TOTAL) * 100}%` }}
                  />
                ))}
              </div>
            )}
            <PlayerAvatar
              avatar={p.avatar || { color: p.color }}
              size={44}
            />
            <div className="mp-player-meta">
              <span className="mp-player-name">
                {medal > 0 && (
                  <span
                    className={`mp-place mp-place--${medal}`}
                    title={`#${medal}`}
                    aria-label={`place ${medal}`}
                  >
                    {medal}
                  </span>
                )}
                <span className="mp-player-name-text">{p.name}</span>
                {p.isHost && (
                  <span className="mp-crown" title="dj" aria-label="dj">
                    <CrownIcon />
                  </span>
                )}
              </span>
            </div>
            <span className="mp-player-score-wrap">
              {flash && (
                <span key={flash.key} className="mp-points-flash">
                  +{flash.pts}
                </span>
              )}
              <span className="mp-player-score">{p.score ?? 0}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
