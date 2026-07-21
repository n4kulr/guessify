import PlayerAvatar from "./PlayerAvatar.jsx";

/** Round guesses as sticky right-side popups (cleared when the room resets guesses). */
export default function GuessPopups({ guesses = [], myId }) {
  if (!guesses.length) {
    return (
      <aside className="mp-guess-popups" aria-live="polite">
        <div className="mp-guess-popup mp-guess-popup--empty">waiting for guesses…</div>
      </aside>
    );
  }

  return (
    <aside className="mp-guess-popups" aria-live="polite">
      {guesses.map((g, i) => (
        <div
          key={`${g.playerId}-${i}-${g.title || "skip"}-${g.artist || ""}`}
          className={`mp-guess-popup ${g.win ? "win" : g.skip ? "skip" : "miss"}`}
          style={{ "--guess-accent": g.color || g.avatar?.color || "#888" }}
        >
          <div className="mp-guess-popup-who">
            <PlayerAvatar
              avatar={g.avatar || { peep: 1, color: g.color }}
              size={24}
            />
            <span>{g.playerId === myId ? "you" : g.name}</span>
          </div>
          {g.skip ? (
            <div className="mp-guess-popup-body">⏭ skipped</div>
          ) : (
            <div className="mp-guess-popup-body">
              <span className={g.titleOk ? "ok" : "no"}>{g.title || "—"}</span>
              <span className="by">by</span>
              <span className={g.artistOk ? "ok" : "no"}>{g.artist || "—"}</span>
            </div>
          )}
        </div>
      ))}
    </aside>
  );
}
