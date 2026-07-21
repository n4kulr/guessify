import { useEffect, useRef, useState } from "react";
import PlayerAvatar from "./PlayerAvatar.jsx";

export default function PlayerRail({ players = [], winnerId, pulseId }) {
  const prevScores = useRef({});
  const [flashes, setFlashes] = useState({}); // id -> { pts, key }

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

  if (!players.length) {
    return <p className="mp-empty">waiting for players to scan in…</p>;
  }

  return (
    <div className="mp-rail">
      {players.map((p) => {
        const flash = flashes[p.id];
        return (
          <div
            key={p.id}
            className={`mp-player ${!p.connected ? "offline" : ""} ${
              winnerId === p.id ? "winner" : ""
            } ${pulseId === p.id ? "pulse" : ""} ${flash ? "mp-player--gain" : ""}`}
          >
            <PlayerAvatar
              avatar={p.avatar || { peep: 1, color: p.color }}
              size={44}
            />
            <span className="mp-player-name">
              {p.name}
              {p.isHost ? " · dj" : ""}
            </span>
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
