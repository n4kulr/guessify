import { useEffect, useRef, useState } from "react";
import { usePartyRoom } from "./usePartyRoom.js";
import { usePreviewPlayer } from "../usePreviewPlayer.js";
import PlayerRail from "./PlayerRail.jsx";
import ProfileEditor from "./ProfileEditor.jsx";
import GuessPopups from "./GuessPopups.jsx";
import { STEPS, TOTAL, randomAvatar, normalizeAvatar, unlockSecondsFor } from "./constants.js";
import { fireConfetti, shakeEl } from "../fx.js";
import GuessMedia from "../components/GuessMedia.jsx";

export default function GuestApp({ code }) {
  const upper = code.toUpperCase();
  const { state, playerId, status, error, setError, send } = usePartyRoom(upper);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(() => randomAvatar());
  const [titleGuess, setTitleGuess] = useState("");
  const [artistGuess, setArtistGuess] = useState("");
  const { errorMsg, play, pause } = usePreviewPlayer();
  const [playBusy, setPlayBusy] = useState(false);
  const [localPlaying, setLocalPlaying] = useState(false);
  const lastTrackRef = useRef(null);
  const lastRevealPlayRef = useRef(null);
  const rootRef = useRef(null);
  const lastFxGuess = useRef(-1);

  const joined = !!playerId;
  const me = state?.players?.find((p) => p.id === playerId);
  const playTrack = state?.track
    ? {
        id: state.trackId || state.track.id,
        name: state.track.name || undefined,
        artists: state.track.artists || undefined,
        previewUrl: state.track.previewUrl || undefined,
      }
    : null;
  // Guests rely on the room's previewUrl (host publishes if the worker lookup fails).
  const canPlay = !!playTrack?.previewUrl;

  useEffect(() => {
    if (status !== "connected") return;
    try {
      const saved =
        playerId || sessionStorage.getItem(`guessify-mp-${upper}`);
      if (saved) send({ type: "rejoin", playerId: saved });
    } catch {
      /* ignore */
    }
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!me) return;
    setName(me.name || "");
    if (me.avatar) setAvatar(normalizeAvatar(me.avatar));
  }, [me?.id, me?.name, me?.avatar?.peep, me?.avatar?.color]);

  useEffect(() => {
    if (!state?.revealedArtist) setArtistGuess("");
  }, [state?.roundIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      pause();
    };
  }, [pause]);

  useEffect(() => {
    if (!state?.trackId) return;
    if (lastTrackRef.current !== state.trackId) {
      pause();
      setLocalPlaying(false);
      lastTrackRef.current = state.trackId;
      lastFxGuess.current = -1;
    }
  }, [state?.trackId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const guesses = state?.guesses;
    if (!guesses?.length || !playerId) return;
    const i = guesses.length - 1;
    if (i === lastFxGuess.current) return;
    const g = guesses[i];
    if (!g || g.playerId !== playerId || g.skip) return;
    lastFxGuess.current = i;
    if (g.win) fireConfetti("title");
    else if (!g.artistOk) shakeEl(rootRef.current);
  }, [state?.guesses, playerId]);

  useEffect(() => {
    if (state?.phase === "over") fireConfetti("victory");
  }, [state?.phase]);

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

  function skipGuess() {
    send({ type: "skip" });
    setTitleGuess("");
    setArtistGuess("");
    stopAudio();
  }

  async function playSnippet(seconds) {
    if (!canPlay) return;
    pause();
    setLocalPlaying(false);
    setPlayBusy(true);
    try {
      await play(playTrack, seconds, {
        onStop: () => setLocalPlaying(false),
      });
      setLocalPlaying(true);
    } catch {
      setLocalPlaying(false);
    } finally {
      setPlayBusy(false);
    }
  }

  function stopAudio() {
    pause();
    setLocalPlaying(false);
    setPlayBusy(false);
  }

  function togglePlay() {
    if (!canPlay || playBusy) return;
    if (localPlaying) {
      stopAudio();
      return;
    }
    const unlocked = unlockSecondsFor(state?.unlockByPlayer, playerId, state);
    playSnippet(state?.phase === "reveal" ? null : unlocked);
  }

  const phase = state?.phase;
  const revealPlayKey = `${state?.roundIdx ?? ""}-${phase}`;
  useEffect(() => {
    if (phase !== "reveal" || !canPlay) return;
    if (lastRevealPlayRef.current === revealPlayKey) return;
    lastRevealPlayRef.current = revealPlayKey;
    playSnippet(null);
  }, [phase, revealPlayKey, canPlay]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const canJoin = !!name.trim() && status === "connected";
    return (
      <div className="mp-guest panel">
        <div className="sticker">room {upper}</div>
        <h2 className="title">join the party</h2>
        <p className="subtitle mp-join-sub">
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
          disabled={!canJoin}
          onClick={join}
        >
          <span className="btn-play-icon" aria-hidden="true" />
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
        <PlayerRail players={ranked} />
      </div>
    );
  }

  const revealed = state.phase === "reveal";
  const unlocked = unlockSecondsFor(state.unlockByPlayer, playerId, state);
  const track = state.track;
  const spinning = localPlaying && (state.phase === "play" || state.phase === "reveal");

  return (
    <div className="game mp-guest-game mp-board" ref={rootRef}>
      <div className="mp-board-main">
        <div className="now-playing">
          <span className="np-playlist">{state.playlistName}</span>
          <span className="np-round">
            record {state.roundIdx + 1} / {state.roundCount}
          </span>
        </div>

        <PlayerRail
          players={state.players}
          pulseId={state.guesses[state.guesses.length - 1]?.playerId}
        />

        <GuessMedia
          mode="vinyl"
          revealed={revealed}
          spinning={spinning}
          cover={track?.cover}
          title={track?.name}
          artist={(track?.artists || []).join(", ")}
          canControl={canPlay}
          interactive={canPlay}
          vinylTitle={canPlay ? "play / pause · drag to scrub" : undefined}
          onTogglePlay={togglePlay}
          onScrubStart={stopAudio}
        />

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
          <div className="controls">
            {errorMsg && <div className="error-banner">{errorMsg}</div>}
            <button
              className="btn btn-big btn-play"
              onClick={togglePlay}
              disabled={!canPlay || playBusy}
            >
              <span
                className={localPlaying ? "btn-pause-icon" : "btn-play-icon"}
                aria-hidden="true"
              />
              {playBusy
                ? "starting…"
                : localPlaying
                ? "pause"
                : canPlay
                ? `play ${unlocked}s`
                : "loading audio…"}
            </button>
          </div>
        )}

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
                value={state.revealedArtist || artistGuess}
                disabled={!!state.revealedArtist}
                onChange={(e) => setArtistGuess(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitGuess()}
              />
            </div>
            <div className="guess-actions">
              <button className="btn btn-skip" onClick={skipGuess}>
                <span className="btn-label">skip</span>
                <span className="btn-hint">+audio</span>
              </button>
              <button
                className="btn btn-guess"
                onClick={submitGuess}
                disabled={!titleGuess.trim() && !artistGuess.trim()}
              >
                <span className="btn-label">guess</span>
                <span className="btn-hint">enter</span>
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
            <button
              className="btn btn-big btn-play"
              onClick={() => {
                stopAudio();
                send({ type: "next" });
              }}
            >
              <span className="btn-play-icon" aria-hidden="true" />
              {state.roundIdx + 1 >= state.roundCount ? "see results →" : "next song →"}
            </button>
          </div>
        )}

        {error && <div className="error-banner">{error}</div>}
      </div>

      <GuessPopups guesses={state.guesses} myId={playerId} />
    </div>
  );
}
