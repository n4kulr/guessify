import { useEffect, useState } from "react";
import { usePartyRoom } from "./usePartyRoom.js";
import PlayerRail from "./PlayerRail.jsx";
import { STEPS, TOTAL } from "./constants.js";
import ScrubbableVinyl from "../components/ScrubbableVinyl.jsx";

export default function GuestApp({ code }) {
  const upper = code.toUpperCase();
  const { state, playerId, status, error, setError, send } = usePartyRoom(upper);
  const [name, setName] = useState("");
  const [titleGuess, setTitleGuess] = useState("");
  const [artistGuess, setArtistGuess] = useState("");
  const [rejoinTried, setRejoinTried] = useState(false);

  const joined = !!playerId;

  useEffect(() => {
    if (status !== "connected" || rejoinTried || joined) return;
    setRejoinTried(true);
    try {
      const saved = sessionStorage.getItem(`guessify-mp-${upper}`);
      if (saved) send({ type: "rejoin", playerId: saved });
    } catch {
      /* ignore */
    }
  }, [status, rejoinTried, joined, upper]); // eslint-disable-line react-hooks/exhaustive-deps

  function join() {
    setError(null);
    send({ type: "join", name });
  }

  function submitGuess() {
    const title = titleGuess.trim();
    const artist = artistGuess.trim();
    if (!title && !artist) return;
    send({ type: "guess", title, artist });
    setTitleGuess("");
    setArtistGuess("");
  }

  function skip() {
    send({ type: "skip" });
    setTitleGuess("");
    setArtistGuess("");
  }

  if (status === "error") {
    return (
      <div className="mp-guest panel">
        <h2 className="title">couldn't join</h2>
        <p className="subtitle">{error || "Room unavailable."}</p>
        <a className="btn btn-big" href="/">
          go home
        </a>
      </div>
    );
  }

  if (!joined) {
    return (
      <div className="mp-guest panel">
        <div className="sticker">room {upper}</div>
        <h2 className="title">pick a name</h2>
        <p className="subtitle">No Spotify needed — just race the other phones.</p>
        <input
          className="guess-input"
          placeholder="nickname…"
          value={name}
          maxLength={16}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && name.trim() && join()}
        />
        {error && <div className="error-banner">{error}</div>}
        <button
          className="btn btn-big btn-play"
          style={{ marginTop: 14 }}
          disabled={!name.trim() || status !== "connected"}
          onClick={join}
        >
          <span className="btn-disc" aria-hidden="true" />
          {status === "connecting" ? "connecting…" : "join party"}
        </button>
      </div>
    );
  }

  if (!state) return <div className="loader">loading…</div>;

  if (state.phase === "lobby") {
    return (
      <div className="mp-guest">
        <h2 className="section-title">you're in</h2>
        <p className="section-sub">Waiting for {state.hostName} to drop the needle…</p>
        <PlayerRail players={state.players} />
      </div>
    );
  }

  if (state.phase === "over") {
    const ranked = [...state.players].sort((a, b) => b.score - a.score || b.wins - a.wins);
    const me = ranked.find((p) => p.id === playerId);
    return (
      <div className="mp-guest mp-over">
        <h2 className="title">That's a wrap!</h2>
        <p className="subtitle">
          You finished with <strong>{me?.score ?? 0}</strong> pts
          {me?.wins ? ` · ${me.wins} wins` : ""}.
        </p>
        <PlayerRail players={ranked} winnerId={ranked[0]?.id} />
      </div>
    );
  }

  const revealed = state.phase === "reveal";
  const unlocked = state.unlocked;
  const track = state.track;
  const myGuesses = state.guesses.filter((g) => g.playerId === playerId);
  const spinning = state.playing && state.phase === "play";

  return (
    <div className="game mp-guest-game">
      <div className="now-playing">
        <span className="np-playlist">{state.playlistName}</span>
        <span className="np-round">
          record {state.roundIdx + 1} / {state.roundCount}
        </span>
      </div>

      <PlayerRail
        players={state.players}
        winnerId={state.winnerId}
        pulseId={state.guesses[state.guesses.length - 1]?.playerId}
      />

      <div className="turntable turntable--game">
        <ScrubbableVinyl
          className={revealed ? "vinyl--revealed" : ""}
          spin={spinning ? "fast" : false}
          title="drag to scrub"
        >
          {revealed && track?.cover ? (
            <img src={track.cover} alt="" className="vinyl-cover" draggable={false} />
          ) : (
            <div className="vinyl-label vinyl-label--mystery">
              {state.outcome === "lose" ? "✗" : "?"}
            </div>
          )}
        </ScrubbableVinyl>
        <div className={`tonearm ${spinning ? "tonearm--on" : ""}`} />
      </div>

      {state.outcome === "win" && revealed && (
        <div className="inline-badge inline-badge--win">
          {state.winnerId === playerId
            ? "YOU NAILED IT"
            : `${state.players.find((p) => p.id === state.winnerId)?.name || "someone"} NAILED IT`}
        </div>
      )}
      {state.outcome === "lose" && revealed && (
        <div className="inline-badge inline-badge--lose">MISSED</div>
      )}

      <div className="progress">
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${((revealed ? TOTAL : unlocked) / TOTAL) * 100}%` }}
          />
          {STEPS.map((s) => (
            <span key={s} className="progress-tick" style={{ left: `${(s / TOTAL) * 100}%` }} />
          ))}
        </div>
        <div className="progress-labels">
          <span>0:00</span>
          <span>{revealed ? "revealed" : `${unlocked}s unlocked`}</span>
        </div>
      </div>

      <div className="guess-rows">
        {Array.from({ length: 6 }).map((_, i) => {
          const g = myGuesses[i];
          let cls = "guess-row";
          if (g?.win) cls += " correct";
          else if (g) cls += " wrong";
          if (!revealed && i === myGuesses.length) cls += " active";
          return (
            <div key={i} className={cls}>
              {g ? (
                g.skip ? (
                  <span className="gr-skip">⏭ skipped</span>
                ) : (
                  <>
                    <span className={`gr-field ${g.titleOk ? "ok" : "no"}`}>{g.title || "—"}</span>
                    <span className="gr-sep">by</span>
                    <span className={`gr-field ${g.artistOk ? "ok" : "no"}`}>{g.artist || "—"}</span>
                  </>
                )
              ) : !revealed && i === myGuesses.length ? (
                "◉ your guess…"
              ) : (
                ""
              )}
            </div>
          );
        })}
      </div>

      {state.phase === "play" && (
        <div className="guess-input-wrap">
          <div className="guess-fields">
            <input
              className="guess-input"
              placeholder="song title…"
              value={titleGuess}
              onChange={(e) => setTitleGuess(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitGuess()}
            />
            <input
              className="guess-input"
              placeholder="artist…"
              value={artistGuess}
              onChange={(e) => setArtistGuess(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitGuess()}
            />
          </div>
          <div className="guess-actions">
            <button className="btn btn-skip" onClick={skip}>
              <span className="btn-label">skip</span>
              <span className="btn-hint">+audio</span>
            </button>
            <button
              className="btn btn-guess"
              onClick={submitGuess}
              disabled={!titleGuess.trim() && !artistGuess.trim()}
            >
              <span className="btn-label">guess</span>
              <span className="btn-hint">↵ enter</span>
            </button>
          </div>
        </div>
      )}

      {revealed && track && (
        <div className="inline-reveal">
          <div className="reveal">
            <div className="reveal-art">
              {track.cover && <img src={track.cover} alt="" className="reveal-cover" />}
            </div>
            <div className="reveal-text">
              <span className="reveal-title">{track.name}</span>
              <span className="reveal-artist">{(track.artists || []).join(", ")}</span>
              {state.winnerId === playerId && (
                <span className="reveal-points">+{state.earnedPts} pts</span>
              )}
            </div>
          </div>
          <p className="fineprint">waiting for host to continue…</p>
        </div>
      )}
    </div>
  );
}
