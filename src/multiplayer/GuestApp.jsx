import { useEffect, useState } from "react";
import { usePartyRoom } from "./usePartyRoom.js";
import PlayerRail from "./PlayerRail.jsx";
import ProfileEditor from "./ProfileEditor.jsx";
import GuessPopups from "./GuessPopups.jsx";
import { STEPS, TOTAL, randomAvatar } from "./constants.js";
import ScrubbableVinyl from "../components/ScrubbableVinyl.jsx";

export default function GuestApp({ code }) {
  const upper = code.toUpperCase();
  const { state, playerId, status, error, setError, send } = usePartyRoom(upper);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(() => randomAvatar());
  const [titleGuess, setTitleGuess] = useState("");
  const [artistGuess, setArtistGuess] = useState("");
  const [rejoinTried, setRejoinTried] = useState(false);

  const joined = !!playerId;
  const me = state?.players?.find((p) => p.id === playerId);

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

  // After join/rejoin, mirror server profile into local editor.
  useEffect(() => {
    if (!me) return;
    setName(me.name || "");
    if (me.avatar) setAvatar(me.avatar);
  }, [me?.id, me?.name, me?.avatar?.peep, me?.avatar?.color]);

  // Shared artist lock — fill for everyone once claimed.
  useEffect(() => {
    if (state?.revealedArtist) setArtistGuess(state.revealedArtist);
  }, [state?.revealedArtist]);

  // Clear artist field when a new round starts.
  useEffect(() => {
    if (!state?.revealedArtist) setArtistGuess("");
  }, [state?.roundIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  function join() {
    setError(null);
    send({ type: "join", name, avatar });
  }

  function updateProfile({ name: n, avatar: a }) {
    setName(n);
    setAvatar(a);
    if (joined) send({ type: "profile", name: n, avatar: a });
  }

  function submitGuess() {
    const title = titleGuess.trim();
    const artist = artistGuess.trim();
    if (!title && !artist) return;
    send({ type: "guess", title, artist });
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
        <h2 className="title">join the party</h2>
        <p className="subtitle">
          Pick a look, then jump in — even mid-game. No Spotify needed.
        </p>
        <div className="mp-lobby-edit">
          <p className="profile-label">your look</p>
          <ProfileEditor name={name} avatar={avatar} onChange={updateProfile} />
        </div>
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
        <p className="section-sub">
          Waiting for {state.hostName} to start — tweak your look anytime.
        </p>
        <div className="mp-lobby-side">
          <div className="mp-lobby-edit">
            <p className="profile-label">your look</p>
            <ProfileEditor name={name} avatar={avatar} onChange={updateProfile} />
          </div>
          <h3 className="mp-side-title">players</h3>
          <PlayerRail players={state.players} />
          {error && <div className="error-banner">{error}</div>}
        </div>
      </div>
    );
  }

  if (state.phase === "over") {
    const ranked = [...state.players].sort((a, b) => b.score - a.score);
    const mine = ranked.find((p) => p.id === playerId);
    return (
      <div className="mp-guest mp-over">
        <h2 className="title">That's a wrap!</h2>
        <p className="subtitle">
          You finished with <strong>{mine?.score ?? 0}</strong> pts.
        </p>
        <PlayerRail players={ranked} winnerId={ranked[0]?.id} />
      </div>
    );
  }

  const revealed = state.phase === "reveal";
  const unlocked = state.unlocked;
  const track = state.track;
  const spinning = state.playing && state.phase === "play";

  return (
    <div className="game mp-guest-game mp-board">
      <div className="mp-board-main">
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

        <div className="turntable turntable--game turntable--md">
          <div className="platter" aria-hidden="true" />
          <ScrubbableVinyl
            className={`vinyl--md ${revealed ? "vinyl--revealed" : ""}`}
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
                disabled={!!state.revealedArtist}
                onChange={(e) => setArtistGuess(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitGuess()}
              />
            </div>
            <div className="guess-actions guess-actions--guess-only">
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

      <GuessPopups guesses={state.guesses} myId={playerId} />
    </div>
  );
}
