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
            avatar={p.avatar || { color: p.color, eyes: 0, mouth: 0 }}
            size={40}
          />
          <div className="mp-player-meta">
            <span className="mp-player-name">
              {p.name}
              {p.isHost ? " · dj" : ""}
            </span>
            <span className="mp-player-score">
              {p.wins}W · {p.score}pts
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
