import { useEffect, useMemo, useRef, useState } from "react";
import { usePartyRoom } from "./usePartyRoom.js";
import { usePreviewPlayer } from "../usePreviewPlayer.js";
import { STEPS, TOTAL, MAX_GUESSES, randomAvatar, normalizeAvatar, unlockSecondsFor, PLAYER_COLORS, nextVotesNeeded, activePlayerCount, SKIP_PENALTY, HINT_PENALTY } from "./constants.js";
import { accentMatchingTheme } from "../themes.js";
import { fireConfetti, shakeEl } from "../fx.js";
import GuessMedia from "../components/GuessMedia.jsx";
import GuessTransport from "../components/GuessTransport.jsx";
import ShareScoreButton from "../components/ShareScoreButton.jsx";
import ScrubbableVinyl from "../components/ScrubbableVinyl.jsx";
import PenaltyPop from "../components/PenaltyPop.jsx";
import AlmostFlash from "../components/AlmostFlash.jsx";
import GameOverStats from "../components/GameOverStats.jsx";
import { isNoPreviewError } from "../shareScore.js";
import { loadLocalProfile } from "../localProfile.js";
import { HINT_AFTER_SKIPS } from "../titleHint.js";
import { computeGameStats } from "../gameStats.js";
import { recordPlaylistScore } from "../playlistBests.js";
import { isFastTest, buildFastPartyEnd } from "../fastTest.js";
import { useDebugActions } from "../debugRegistry.js";
import PlayerRail from "./PlayerRail.jsx";
import ProfileEditor from "./ProfileEditor.jsx";
import GuessPopups from "./GuessPopups.jsx";

export default function GuestApp({ code }) {
  const upper = code.toUpperCase();
  const { state, playerId, status, error, setError, send, titleHint, consumeTitleHint } =
    usePartyRoom(upper);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(() => {
    const local = loadLocalProfile();
    const base = normalizeAvatar(local.avatar || randomAvatar());
    return normalizeAvatar({
      ...base,
      color: accentMatchingTheme(PLAYER_COLORS),
    });
  });
  const [titleGuess, setTitleGuess] = useState("");
  const [artistGuess, setArtistGuess] = useState("");
  const [titleHintText, setTitleHintText] = useState("");
  const [hintUsed, setHintUsed] = useState(false);
  const [skipPop, setSkipPop] = useState(null);
  const [hintPop, setHintPop] = useState(null);
  const [almostTitle, setAlmostTitle] = useState(null);
  const [almostArtist, setAlmostArtist] = useState(null);
  const [roundLog, setRoundLog] = useState([]);
  const [playlistBests, setPlaylistBests] = useState(null);
  const [fastEnd, setFastEnd] = useState(null);
  const { errorMsg, setErrorMsg, play, pause } = usePreviewPlayer();
  const [playBusy, setPlayBusy] = useState(false);
  const [localPlaying, setLocalPlaying] = useState(false);
  const lastTrackRef = useRef(null);
  const lastRevealPlayRef = useRef(null);
  const rootRef = useRef(null);
  const skipWrapRef = useRef(null);
  const titleFieldRef = useRef(null);
  const lastFxGuess = useRef(-1);
  const roundStartedAt = useRef(Date.now());
  const loggedRoundRef = useRef(-1);

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
    setTitleHintText("");
    setHintUsed(false);
    setSkipPop(null);
    setHintPop(null);
    setAlmostTitle(null);
    setAlmostArtist(null);
  }, [state?.roundIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (state?.phase !== "play" || !state?.trackId) return;
    roundStartedAt.current = Date.now();
    loggedRoundRef.current = -1;
  }, [state?.phase, state?.trackId, state?.roundIdx]);

  useEffect(() => {
    if (state?.phase !== "reveal") return;
    const idx = state.roundIdx ?? 0;
    if (loggedRoundRef.current === idx) return;
    loggedRoundRef.current = idx;
    const won = state.winnerId === playerId;
    const wallMs =
      won && roundStartedAt.current != null
        ? Date.now() - roundStartedAt.current
        : null;
    setRoundLog((prev) => [
      ...prev,
      {
        won,
        artistClaimed: state.artistClaimedBy === playerId,
        wallMs,
        unlockStep: state.unlockByPlayer?.[playerId] ?? 0,
        title: state.track?.name || null,
        artist: (state.track?.artists || []).join(", ") || null,
      },
    ]);
  }, [
    state?.phase,
    state?.roundIdx,
    state?.winnerId,
    state?.artistClaimedBy,
    state?.unlockByPlayer,
    state?.track,
    playerId,
  ]);

  useEffect(() => {
    if (state?.phase !== "over") return;
    const mine = state.players?.find((p) => p.id === playerId);
    const plName = state.playlistName || "Party";
    const id = `party:${upper}:${plName}`;
    setPlaylistBests(recordPlaylistScore(id, plName, mine?.score ?? 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.phase]);

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
    else {
      if (g.almostTitle) setAlmostTitle(Date.now());
      if (g.almostArtist) setAlmostArtist(Date.now());
      // artistOk stays true once locked — still shake on a wrong title try
      if (!g.almostTitle && !g.almostArtist && (g.title ? !g.titleOk : !g.artistOk)) {
        shakeEl(rootRef.current);
      }
    }
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
    const step = state?.unlockByPlayer?.[playerId] ?? 0;
    if (step >= MAX_GUESSES - 1) return;
    send({ type: "skip" });
    setTitleGuess("");
    setArtistGuess("");
    stopAudio();
    setSkipPop(Date.now());
    shakeEl(skipWrapRef.current);
  }

  function applyTitleHint() {
    const step = state?.unlockByPlayer?.[playerId] ?? 0;
    if (state?.phase !== "play" || step < HINT_AFTER_SKIPS) return;
    send({ type: "hint" });
    if (!hintUsed) {
      setHintUsed(true);
      setHintPop(Date.now());
      shakeEl(titleFieldRef.current);
    }
  }

  useEffect(() => {
    if (!titleHint) return;
    setTitleHintText(titleHint);
    consumeTitleHint();
  }, [titleHint, consumeTitleHint]);

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
    } catch (e) {
      setLocalPlaying(false);
      if (isNoPreviewError(e) && state?.phase === "play") {
        // Silent — room track can't be swapped here.
      }
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

  function startPlay() {
    if (!canPlay || playBusy || localPlaying || state?.phase !== "play") return;
    playSnippet(unlockSecondsFor(state?.unlockByPlayer, playerId, state));
  }

  const phase = state?.phase;
  const revealPlayKey = `${state?.roundIdx ?? ""}-${phase}`;
  useEffect(() => {
    if (phase !== "reveal" || !canPlay) return;
    if (lastRevealPlayRef.current === revealPlayKey) return;
    lastRevealPlayRef.current = revealPlayKey;
    playSnippet(null);
  }, [phase, revealPlayKey, canPlay]); // eslint-disable-line react-hooks/exhaustive-deps

  const fast = isFastTest();
  function endFast(alone) {
    pause();
    setLocalPlaying(false);
    const payload = buildFastPartyEnd({
      alone,
      host: {
        id: playerId || "guest",
        name: name || "you",
        avatar,
        color: avatar?.color,
      },
    });
    // Mark as non-host guest seat for the rail.
    payload.players = payload.players.map((p) =>
      p.id === (playerId || "guest") ? { ...p, isHost: false } : p
    );
    setRoundLog(payload.roundLog);
    setPlaylistBests(
      recordPlaylistScore(
        `party:${upper}`,
        state?.playlistName || "Party",
        payload.myScore
      )
    );
    setFastEnd(payload);
  }

  const debugActions = useMemo(() => {
    if (!fast || fastEnd) return [];
    return [
      {
        id: "end-alone",
        label: "wrap alone (fake)",
        run: () => endFast(true),
      },
      {
        id: "end-4",
        label: "wrap with 4 players (fake)",
        run: () => endFast(false),
      },
      {
        id: "home",
        label: "leave → home",
        run: () => {
          window.location.href = "/";
        },
      },
    ];
  }, [fast, fastEnd]); // eslint-disable-line react-hooks/exhaustive-deps

  useDebugActions("guest", debugActions);

  if (fastEnd) {
    const ranked = [...fastEnd.players].sort((a, b) => b.score - a.score);
    const mine = ranked[0];
    const myScore = mine?.score ?? 0;
    const endStats = computeGameStats(fastEnd.roundLog, { score: myScore });
    return (
      <div className="mp-guest mp-over gameover">
        <div className="turntable">
          <ScrubbableVinyl spin="slow" title="drag to scrub">
            <div className="vinyl-label" aria-hidden="true" />
          </ScrubbableVinyl>
        </div>
        <h2 className="title">That's a wrap!</h2>
        <p className="subtitle">
          You finished with <strong>{myScore}</strong> pts.
        </p>
        <PlayerRail players={ranked} />
        <GameOverStats
          stats={endStats}
          bests={playlistBests}
          roundResults={fastEnd.roundResults}
          players={ranked}
          myId={mine?.id}
          hideMisses
        />
        <div className="gameover-actions">
          <ShareScoreButton
            mode="party"
            score={myScore}
            name={mine?.name || name}
            stats={endStats}
            playlistName={state?.playlistName || ""}
          />
          <button
            className="btn btn-big btn-play"
            onClick={() => {
              window.location.href = "/";
            }}
          >
            back home
          </button>
        </div>
      </div>
    );
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
    const myScore = mine?.score ?? 0;
    const endStats = computeGameStats(roundLog, { score: myScore });
    return (
      <div className="mp-guest mp-over gameover">
        <div className="turntable">
          <ScrubbableVinyl spin="slow" title="drag to scrub">
            <div className="vinyl-label" aria-hidden="true" />
          </ScrubbableVinyl>
        </div>
        <h2 className="title">That's a wrap!</h2>
        <p className="subtitle">
          You finished with <strong>{myScore}</strong> pts.
        </p>
        <PlayerRail players={ranked} />
        <GameOverStats
          stats={endStats}
          bests={playlistBests}
          roundResults={state.roundResults || []}
          players={ranked}
          myId={playerId}
          hideMisses
        />
        <div className="gameover-actions">
          <ShareScoreButton
            mode="party"
            score={myScore}
            name={mine?.name || name}
            stats={endStats}
            playlistName={state.playlistName || ""}
          />
          <button
            className="btn btn-big btn-play"
            onClick={() => {
              window.location.href = "/";
            }}
          >
            back home
          </button>
        </div>
      </div>
    );
  }

  const revealed = state.phase === "reveal";
  const unlocked = unlockSecondsFor(state.unlockByPlayer, playerId, state);
  const myStep = state.unlockByPlayer?.[playerId] ?? 0;
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
          pulseId={state.guesses?.[state.guesses.length - 1]?.playerId}
          unlockByPlayer={state.unlockByPlayer || {}}
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
        {errorMsg && <div className="error-banner">{errorMsg}</div>}

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
              <div className="guess-title-row">
                <div className="guess-title-field" ref={titleFieldRef}>
                  <input
                    className={`guess-input${titleHintText ? " guess-input--hint" : ""}`}
                    placeholder={titleHintText || "song title…"}
                    value={titleGuess}
                    onChange={(e) => {
                      setAlmostTitle(null);
                      setTitleGuess(e.target.value);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && submitGuess()}
                  />
                  <AlmostFlash
                    token={almostTitle}
                    onDone={() => setAlmostTitle(null)}
                  />
                  {myStep >= HINT_AFTER_SKIPS && (!hintUsed || hintPop) && (
                    <div className="guess-hint-slot">
                      {hintPop ? (
                        <PenaltyPop
                          token={hintPop}
                          pts={HINT_PENALTY}
                          className="penalty-pop--hint"
                          onDone={() => setHintPop(null)}
                        />
                      ) : (
                        <button
                          type="button"
                          className="guess-hint-link"
                          onClick={applyTitleHint}
                          aria-label="Reveal title hint"
                        >
                          hint
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="guess-artist-row">
                <div className="guess-artist-field">
                  <input
                    className={`guess-input${state.revealedArtist ? " guess-input--locked" : ""}`}
                    placeholder="artist…"
                    value={state.revealedArtist || artistGuess}
                    disabled={!!state.revealedArtist}
                    onChange={(e) => {
                      setAlmostArtist(null);
                      setArtistGuess(e.target.value);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && submitGuess()}
                  />
                  <AlmostFlash
                    token={almostArtist}
                    onDone={() => setAlmostArtist(null)}
                  />
                </div>
                <GuessTransport
                  playing={localPlaying}
                  busy={playBusy}
                  canPlay={canPlay}
                  playLabel={canPlay ? `Play ${unlocked}s` : "Loading audio"}
                  onPlay={startPlay}
                  onPause={stopAudio}
                />
              </div>
            </div>
            <div className="guess-actions">
              <div className="btn-skip-wrap" ref={skipWrapRef}>
                <button className="btn btn-skip" onClick={skipGuess}>
                  <span className="btn-label">skip</span>
                  <span className="btn-hint">+audio</span>
                </button>
                <PenaltyPop
                  token={skipPop}
                  pts={SKIP_PENALTY}
                  onDone={() => setSkipPop(null)}
                />
              </div>
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
            <div className="media-stage-vote">
              <button
                type="button"
                className={`btn btn-big btn-play media-stage-btn ${
                  playerId && (state.nextVotes || []).includes(playerId) ? "is-voted" : ""
                }`}
                onClick={(e) => {
                  if (playerId && (state.nextVotes || []).includes(playerId)) return;
                  stopAudio();
                  send({ type: "next" });
                  e.currentTarget.blur();
                }}
                disabled={!!(playerId && (state.nextVotes || []).includes(playerId))}
                aria-label={
                  state.roundIdx + 1 >= state.roundCount ? "Results" : "Next song"
                }
              >
                <span className="btn-play-icon" aria-hidden="true" />
                {state.roundIdx + 1 >= state.roundCount ? "see results" : "next song"}
                <span className="vote-tally">
                  {(state.nextVotes || []).length}/
                  {state.nextVotesNeeded ??
                    nextVotesNeeded(activePlayerCount(state.players))}
                </span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        )}

        {error && <div className="error-banner">{error}</div>}
      </div>

      <GuessPopups guesses={state.guesses} myId={playerId} />
    </div>
  );
}
