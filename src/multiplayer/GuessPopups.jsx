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
        >
          <PlayerAvatar
            avatar={g.avatar || { color: g.color }}
            size={44}
            className="mp-guess-popup-avatar"
          />
          <div className="mp-guess-popup-main">
            <div className="mp-guess-popup-who">
              {g.playerId === myId ? "you" : g.name}
            </div>
            {g.skip ? (
              <div className="mp-guess-popup-body">skipped</div>
            ) : (
              <div className="mp-guess-popup-body">
                <span className={g.titleOk ? "ok" : "no"}>{g.title || "?"}</span>
                <span className="by">by</span>
                <span className={g.artistOk ? "ok" : "no"}>{g.artist || "?"}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </aside>
  );
}
