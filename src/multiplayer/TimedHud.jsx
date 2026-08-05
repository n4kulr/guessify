import { useEffect, useState } from "react";
import { formatSolveSec } from "../gameStats.js";

/** Live seconds left until roundEndsAt (epoch ms). */
export function useRoundCountdown(roundEndsAt) {
  const [leftMs, setLeftMs] = useState(() =>
    roundEndsAt ? Math.max(0, roundEndsAt - Date.now()) : null
  );

  useEffect(() => {
    if (!roundEndsAt) {
      setLeftMs(null);
      return;
    }
    function tick() {
      setLeftMs(Math.max(0, roundEndsAt - Date.now()));
    }
    tick();
    const id = window.setInterval(tick, 200);
    return () => clearInterval(id);
  }, [roundEndsAt]);

  if (leftMs == null) return null;
  return Math.ceil(leftMs / 1000);
}

export function TimedCountdown({ roundEndsAt, lockedIn = false }) {
  const secs = useRoundCountdown(roundEndsAt);
  if (secs == null) return null;
  return (
    <div className="timed-hud">
      <span className="timed-hud-clock">{secs}s</span>
      {lockedIn ? (
        <span className="timed-hud-locked">locked in</span>
      ) : (
        <span className="timed-hud-hint">timed round</span>
      )}
    </div>
  );
}

export function TimedPlacesList({ places }) {
  if (!Array.isArray(places) || !places.length) return null;
  return (
    <ol className="timed-places">
      {places.map((row) => (
        <li key={row.playerId}>
          <span className="timed-places-rank">#{row.place + 1}</span>
          <span className="timed-places-name">{row.name}</span>
          <span className="timed-places-meta">
            {formatSolveSec(row.wallMs)} · +{row.titlePts}
          </span>
        </li>
      ))}
    </ol>
  );
}
