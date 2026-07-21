import PlayerAvatar from "./PlayerAvatar.jsx";

export default function PlayerRail({ players = [], winnerId, pulseId }) {
  if (!players.length) {
    return <p className="mp-empty">waiting for players to scan in…</p>;
  }

  return (
    <div className="mp-rail">
      {players.map((p) => (
        <div
          key={p.id}
          className={`mp-player ${!p.connected ? "offline" : ""} ${
            winnerId === p.id ? "winner" : ""
          } ${pulseId === p.id ? "pulse" : ""}`}
        >
          <PlayerAvatar
            avatar={p.avatar || { peep: 1, color: p.color }}
            size={40}
          />
          <span className="mp-player-name">
            {p.name}
            {p.isHost ? " · dj" : ""}
          </span>
          <span className="mp-player-score">{p.score ?? 0}</span>
        </div>
      ))}
    </div>
  );
}
