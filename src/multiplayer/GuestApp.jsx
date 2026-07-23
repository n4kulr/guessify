import { useEffect, useRef, useState } from "react";
import { usePartyRoom } from "./usePartyRoom.js";
import { usePreviewPlayer } from "../usePreviewPlayer.js";
import PlayerRail from "./PlayerRail.jsx";
import ProfileEditor from "./ProfileEditor.jsx";
import GuessPopups from "./GuessPopups.jsx";
import { STEPS, TOTAL, randomAvatar } from "./constants.js";
import { loadMediaMode, saveMediaMode } from "../mediaMode.js";
import GuessMedia from "../components/GuessMedia.jsx";
import MediaModeToggle from "../components/MediaModeToggle.jsx";

export default function GuestApp({ code }) {
  const upper = code.toUpperCase();
  const { state, playerId, status, error, setError, send } = usePartyRoom(upper);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(() => randomAvatar());
  const [titleGuess, setTitleGuess] = useState("");
  const [artistGuess, setArtistGuess] = useState("");
  const [rejoinTried, setRejoinTried] = useState(false);
  const [mediaMode, setMediaMode] = useState(loadMediaMode);
  const { errorMsg, play, pause } = usePreviewPlayer();
  const [playBusy, setPlayBusy] = useState(false);
  const [localPlaying, setLocalPlaying] = useState(false);
  const lastTrackRef = useRef(null);

  function changeMediaMode(next) {
    setMediaMode(next);
    saveMediaMode(next);
  }

  const joined = !!playerId;
  const me = state?.players?.find((p) => p.id === playerId);
  const playTrack = state?.track?.previewUrl
    ? { id: state.trackId || state.track.id, previewUrl: state.track.previewUrl }
    : null;
  const canPlay = !!playTrack?.previewUrl;

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

  useEffect(() => {
    if (!me) return;
    setName(me.name || "");
    if (me.avatar) setAvatar(me.avatar);
  }, [me?.id, me?.name, me?.avatar?.peep, me?.avatar?.color]);

  useEffect(() => {
    if (state?.revealedArtist) setArtistGuess(state.revealedArtist);
  }, [state?.revealedArtist]);

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
    if (lastTrackRef.current !== state.trackId || state.phase !== "play") {
      pause();
      setLocalPlaying(false);
      lastTrackRef.current = state.trackId;
    }
  }, [state?.trackId, state?.phase]); // eslint-disable-line react-hooks/exhaustive-deps

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
  }

  async function playSnippet(seconds) {
    if (!canPlay || playBusy || localPlaying) return;
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
    const unlocked = state?.unlocked ?? STEPS[0];
    playSnippet(state?.phase === "reveal" ? Math.max(unlocked, 8) : unlocked);
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
        <PlayerRail players={ranked} winnerId={ranked[0]?.id} />
      </div>
    );
  }

  const revealed = state.phase === "reveal";
  const unlocked = state.unlocked;
  const track = state.track;
  const spinning = localPlaying && state.phase === "play";

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

        <GuessMedia
          mode={mediaMode}
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

        <div className={`controls${state.phase === "play" ? "" : " controls--toggle-only"}`}>
          {state.phase === "play" && (
            <>
              {errorMsg && <div className="error-banner">{errorMsg}</div>}
              <button
                className="btn btn-big btn-play"
                onClick={() => playSnippet(unlocked)}
                disabled={!canPlay || localPlaying || playBusy}
              >
                <span className="btn-disc" aria-hidden="true" />
                {playBusy
                  ? "starting…"
                  : localPlaying
                  ? "playing…"
                  : canPlay
                  ? `play ${unlocked}s`
                  : "loading audio…"}
              </button>
            </>
          )}
          <MediaModeToggle mode={mediaMode} onChange={changeMediaMode} />
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
            <button
              className="btn btn-big btn-play"
              onClick={() => {
                stopAudio();
                send({ type: "next" });
              }}
            >
              <span className="btn-disc" aria-hidden="true" />
              {state.roundIdx + 1 >= state.roundCount ? "see results →" : "next record →"}
            </button>
          </div>
        )}

        {error && <div className="error-banner">{error}</div>}
        <p className="fineprint">audio plays only on your device · anyone can skip or advance</p>
      </div>

      <GuessPopups guesses={state.guesses} myId={playerId} />
    </div>
  );
}
