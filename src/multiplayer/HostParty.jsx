import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { usePartyRoom } from "./usePartyRoom.js";
import { usePreviewPlayer } from "../usePreviewPlayer.js";
import { resolvePreview } from "../itunes.js";
import { isAudioWarm, warmAudioUrl, primePlaylistPreviews } from "../previewWarm.js";
import { STEPS, TOTAL, MAX_GUESSES, randomAvatar, normalizeAvatar, unlockSecondsFor, PLAYER_COLORS, nextVotesNeeded, activePlayerCount, SKIP_PENALTY, HINT_PENALTY, ROUND_COUNT } from "./constants.js";
import { fireConfetti, shakeEl } from "../fx.js";
import GuessMedia from "../components/GuessMedia.jsx";
import GuessTransport from "../components/GuessTransport.jsx";
import ShareScoreButton from "../components/ShareScoreButton.jsx";
import ScrubbableVinyl from "../components/ScrubbableVinyl.jsx";
import PenaltyPop from "../components/PenaltyPop.jsx";
import AlmostFlash from "../components/AlmostFlash.jsx";
import GameOverStats from "../components/GameOverStats.jsx";
import PlayerRail from "./PlayerRail.jsx";
import ProfileEditor from "./ProfileEditor.jsx";
import GuessPopups from "./GuessPopups.jsx";
import { TimedCountdown, TimedPlacesList } from "./TimedHud.jsx";
import { loadLocalProfile, saveLocalProfile } from "../localProfile.js";
import { applyThemeForAccent, accentMatchingTheme } from "../themes.js";
import { isNoPreviewError } from "../shareScore.js";
import { HINT_AFTER_SKIPS } from "../titleHint.js";
import { computeGameStats } from "../gameStats.js";
import { recordPlaylistScore } from "../playlistBests.js";
import { isFastTest, buildFastPartyEnd } from "../fastTest.js";
import { useDebugActions } from "../debugRegistry.js";
import { normalizeRaceMode } from "./constants.js";

/**
 * Host multiplayer session — picks playlist / starts game; audio plays locally
 * on each device (no shared DJ).
 */
export default function HostParty({
  code,
  playlist,
  me,
  profile,
  raceMode = "classic",
  onExit,
}) {
  const { state, status, error, send, playerId: socketPlayerId, titleHint, consumeTitleHint } =
    usePartyRoom(code);
  // Prefer roster host id — handshake/sessionStorage can lag or go stale, which
  // leaves unlockByPlayer lookups stuck at 2s while skip popups still show.
  const playerId =
    state?.players?.find((p) => p.isHost)?.id || socketPlayerId || null;
  const [qr, setQr] = useState(null);
  const [copied, setCopied] = useState(false);
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
  const [cueReady, setCueReady] = useState(false);
  /** Dev-only fake wrap: bypasses the Worker and paints end screen locally. */
  const [fastEnd, setFastEnd] = useState(null);
  const [hostName, setHostName] = useState(() => {
    const fromProfile = profile?.name?.trim();
    if (fromProfile) return fromProfile.slice(0, 16);
    const local = loadLocalProfile().name;
    if (local) return local;
    return me?.displayName?.split(" ")[0] || "host";
  });
  const [hostAvatar, setHostAvatar] = useState(() => {
    if (profile?.avatar) return normalizeAvatar(profile.avatar);
    const local = loadLocalProfile();
    if (local.name && local.avatar) return normalizeAvatar(local.avatar);
    const base = normalizeAvatar(local.avatar || randomAvatar());
    return normalizeAvatar({
      ...base,
      color: accentMatchingTheme(PLAYER_COLORS),
    });
  });
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

  // (host reclaim runs on every socket open — see effect below)

  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/join/${code}`
      : `/join/${code}`;

  const hostMeta = playlist?.tracks?.find((t) => t.id === state?.trackId) || null;
  const playTrack = state?.track
    ? {
        id: state.trackId || state.track.id,
        name: hostMeta?.name || state.track.name,
        artists: hostMeta?.artists || state.track.artists,
        previewUrl: state.track.previewUrl || undefined,
      }
    : null;
  const canPlay = !!(playTrack?.previewUrl || playTrack?.name);

  // Guests only hear audio via room.previewUrl. Host has playlist metadata and
  // can resolve via /api/preview — publish that URL so every device can play.
  useEffect(() => {
    const roundPhase = state?.phase;
    if (status !== "connected") return;
    if (roundPhase !== "play" && roundPhase !== "reveal") return;
    if (!state?.trackId || state?.track?.previewUrl) return;
    if (!hostMeta?.name) return;
    let cancelled = false;
    (async () => {
      try {
        const url = await resolvePreview({
          id: state.trackId,
          name: hostMeta.name,
          artists: hostMeta.artists,
        });
        if (!cancelled && url) {
          void warmAudioUrl(url);
          send({
            type: "setPreview",
            trackId: state.trackId,
            previewUrl: url,
          });
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, state?.phase, state?.trackId, state?.track?.previewUrl, hostMeta?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  // Hold the board until the current preview MP3 is buffered.
  useEffect(() => {
    const roundPhase = state?.phase;
    if (roundPhase !== "play" && roundPhase !== "reveal") {
      setCueReady(true);
      return;
    }
    const url = state?.track?.previewUrl;
    if (!url) {
      setCueReady(false);
      return;
    }
    let cancelled = false;
    if (!isAudioWarm(url)) setCueReady(false);
    (async () => {
      await warmAudioUrl(url);
      if (!cancelled) setCueReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [state?.phase, state?.trackId, state?.track?.previewUrl, state?.roundIdx]);

  useEffect(() => {
    let cancelled = false;

    function paintQr() {
      const cs = getComputedStyle(document.documentElement);
      const dark = cs.getPropertyValue("--main-color").trim() || "#111111";
      const light = cs.getPropertyValue("--sub-alt-color").trim() || "#ffffff";
      QRCode.toDataURL(joinUrl, {
        margin: 1,
        width: 240,
        color: { dark, light },
        errorCorrectionLevel: "M",
      }).then((url) => {
        if (!cancelled) setQr(url);
      });
    }

    paintQr();
    const mo = new MutationObserver(paintQr);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style"],
    });
    return () => {
      cancelled = true;
      mo.disconnect();
    };
  }, [joinUrl]);

  useEffect(() => {
    if (status !== "connected") return;
    // Reclaim host seat on every reconnect (hibernation / background tabs).
    try {
      const saved = sessionStorage.getItem(`guessify-mp-${code.toUpperCase()}`);
      if (saved) send({ type: "rejoin", playerId: saved });
    } catch {
      /* ignore */
    }
    send({
      type: "host",
      hostName,
      avatar: hostAvatar,
      playlistName: playlist.name,
      raceMode: normalizeRaceMode(raceMode),
      tracks: playlist.tracks.map((t) => ({
        id: t.id,
        name: t.name,
        artists: t.artists,
        cover: t.cover,
      })),
    });
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const mePlayer = state?.players?.find((p) => p.id === playerId);
  useEffect(() => {
    if (!mePlayer) return;
    setHostName(mePlayer.name || hostName);
    if (mePlayer.avatar) setHostAvatar(normalizeAvatar(mePlayer.avatar));
  }, [mePlayer?.id, mePlayer?.name, mePlayer?.avatar?.peep, mePlayer?.avatar?.color]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!state?.revealedArtist) setArtistGuess("");
    setTitleHintText("");
    setHintUsed(false);
    setSkipPop(null);
    setHintPop(null);
    setAlmostTitle(null);
    setAlmostArtist(null);
  }, [state?.roundIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // Wall-clock for this device: start when a play round's track is set.
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
    const id = playlist?.id || playlist?.name || `party:${code}`;
    setPlaylistBests(
      recordPlaylistScore(id, playlist?.name || state.playlistName || "Party", mine?.score ?? 0)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.phase]);

  function updateHostProfile({ name, avatar }) {
    setHostName(name);
    setHostAvatar(avatar);
    saveLocalProfile({ name, avatar }, { customized: true });
    if (playerId) send({ type: "profile", name, avatar });
  }

  useEffect(() => {
    if (hostAvatar?.color) applyThemeForAccent(hostAvatar.color, { persist: false });
    // once on mount so a saved quickplay accent paints the lobby
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (g.win || g.lockedIn) fireConfetti("title");
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

  const unlocked = unlockSecondsFor(state?.unlockByPlayer, playerId, state);
  const myStep = state?.unlockByPlayer?.[playerId] ?? 0;
  const phase = state?.phase || "lobby";
  const spinning = localPlaying && (phase === "play" || phase === "reveal");
  const timed = (state?.raceMode || raceMode) === "timed";
  const lockedIn = !!(
    playerId &&
    Array.isArray(state?.lockedInIds) &&
    state.lockedInIds.includes(playerId)
  );

  async function playSnippet(seconds) {
    if (!canPlay) return;
    pause();
    setLocalPlaying(false);
    setPlayBusy(true);
    try {
      await play(playTrack, seconds, {
        onStop: () => {
          setLocalPlaying(false);
        },
      });
      setLocalPlaying(true);
    } catch (e) {
      setLocalPlaying(false);
      if (isNoPreviewError(e) && phase === "play") {
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
    playSnippet(phase === "reveal" ? null : unlocked);
  }

  function startPlay() {
    if (!canPlay || playBusy || localPlaying || phase !== "play") return;
    playSnippet(unlocked);
  }

  // After a round resolves, play the full preview until next song (or end).
  const revealPlayKey = `${state?.roundIdx ?? ""}-${phase}`;
  useEffect(() => {
    if (phase !== "reveal" || !canPlay || !cueReady) return;
    if (lastRevealPlayRef.current === revealPlayKey) return;
    lastRevealPlayRef.current = revealPlayKey;
    playSnippet(null);
  }, [phase, revealPlayKey, canPlay, cueReady]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!titleHint) return;
    setTitleHintText(titleHint);
    consumeTitleHint();
  }, [titleHint, consumeTitleHint]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy this join link:", joinUrl);
    }
  }

  const fast = isFastTest();
  function endFast(alone) {
    stopAudio();
    const hostId = playerId || "host";
    const payload = buildFastPartyEnd({
      alone,
      host: {
        id: hostId,
        name: hostName,
        avatar: hostAvatar,
        color: hostAvatar?.color,
      },
    });
    setRoundLog(payload.roundLog);
    setPlaylistBests(
      recordPlaylistScore(
        playlist?.id || playlist?.name || `party:${code}`,
        playlist?.name || state?.playlistName || "Party",
        payload.myScore
      )
    );
    setFastEnd(payload);
  }

  const debugActions = useMemo(() => {
    if (!fast || fastEnd) return [];
    const acts = [
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
    ];
    if (phase === "lobby" || phase === "empty") {
      acts.push({
        id: "start",
        label: "send start (if connected)",
        run: () => send({ type: "start" }),
      });
    }
    acts.push({ id: "exit", label: "end party → home", run: () => onExit?.() });
    return acts;
  }, [fast, fastEnd, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  useDebugActions("host-party", debugActions);

  // ---- wrap (debug fake + real party over share this UI) ----
  if (fastEnd || (state && phase === "over")) {
    const ranked = [
      ...(fastEnd ? fastEnd.players : state.players),
    ].sort((a, b) => b.score - a.score);
    const mine = fastEnd
      ? ranked.find((p) => p.isHost) || ranked[0]
      : ranked.find((p) => p.id === playerId);
    const myScore = mine?.score ?? 0;
    const endStats = computeGameStats(
      fastEnd ? fastEnd.roundLog : roundLog,
      { score: myScore }
    );
    return (
      <div className="game mp-board mp-board--solo" ref={rootRef}>
        <div className="mp-board-main">
          <div className="game-head">
            <button className="btn btn-mini" onClick={onExit}>
              ← end party
            </button>
            <div className="scoreboard">
              <span className="scoreboard-label">room</span>
              <span className="scoreboard-value">{code}</span>
            </div>
          </div>
          <div className="gameover">
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
              roundResults={
                fastEnd ? fastEnd.roundResults : state.roundResults || []
              }
              players={ranked}
              myId={mine?.id}
              hideMisses
            />
            <div className="gameover-actions">
              <ShareScoreButton
                mode="party"
                score={myScore}
                name={mine?.name || hostName}
                stats={endStats}
                playlistName={
                  playlist?.name || state?.playlistName || ""
                }
              />
              <button className="btn btn-big btn-play" onClick={onExit}>
                back home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- lobby ----
  if (!state || phase === "lobby" || phase === "empty") {
    const players = state?.players || [];
    const canStart = players.some((p) => p.connected);
    const lobbyMode = normalizeRaceMode(state?.raceMode || raceMode);
    function pickLobbyMode(next) {
      const mode = normalizeRaceMode(next);
      if (mode === lobbyMode) return;
      send({ type: "raceMode", raceMode: mode });
    }
    return (
      <div className="mp-lobby">
        <button className="btn btn-mini mp-back" onClick={onExit}>
          ← cancel
        </button>
        <h2 className="section-title">Party lobby</h2>
        <p className="section-sub">
          Friends scan the QR, or open guessify and type the code.
        </p>
        <div className="mp-lobby-grid">
          <div className="mp-qr-card">
            <div className="mp-qr-join">
              <div className="mp-qr-row">
                {qr ? (
                  <img src={qr} alt="Join QR code" className="mp-qr" />
                ) : (
                  <div className="loader">…</div>
                )}
                <div className="mp-qr-meta">
                  <span className="mp-qr-label">party code</span>
                  <div className="mp-code">{code}</div>
                  <button className="btn btn-mini mp-copy-link" type="button" onClick={copyLink}>
                    {copied ? "copied!" : "copy join link"}
                  </button>
                </div>
              </div>
            </div>
            <div className="mp-qr-look">
              <p className="profile-label">your look</p>
              <ProfileEditor
                name={hostName}
                avatar={hostAvatar}
                onChange={updateHostProfile}
              />
            </div>
          </div>
          <div className="mp-lobby-side">
            <h3 className="mp-side-title mp-side-accent">{playlist.name}</h3>
            <h3 className="mp-side-title">mode</h3>
            <div className="lobby-race-mode" role="group" aria-label="Game mode">
              <button
                type="button"
                className={`lobby-race-mode-btn${lobbyMode === "classic" ? " is-active" : ""}`}
                onClick={() => pickLobbyMode("classic")}
              >
                <span className="lobby-race-mode-title">Classic</span>
                <span className="lobby-race-mode-blurb">first to nail it</span>
              </button>
              <button
                type="button"
                className={`lobby-race-mode-btn${lobbyMode === "timed" ? " is-active" : ""}`}
                onClick={() => pickLobbyMode("timed")}
              >
                <span className="lobby-race-mode-title">Timed</span>
                <span className="lobby-race-mode-blurb">45s · score by speed</span>
              </button>
            </div>
            <h3 className="mp-side-title">players</h3>
            <PlayerRail players={players} />
            {error && <div className="error-banner">{error}</div>}
            {status === "connecting" && <p className="fineprint">connecting to room…</p>}
            {status === "error" && (
              <p className="fineprint">
                Multiplayer server unreachable. Run <code>npm run dev:party</code> locally or
                set <code>VITE_PARTYKIT_HOST</code> on Vercel.
              </p>
            )}
            <button
              className="btn btn-big btn-play"
              disabled={!canStart}
              onClick={() => {
                void primePlaylistPreviews(playlist?.tracks, ROUND_COUNT + 2);
                send({ type: "start" });
              }}
            >
              <span className="btn-play-icon" aria-hidden="true" />
              {canStart ? "start game" : "waiting for players…"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  function submitGuess() {
    // Title locks after a correct timed solve; artist bonus stays open.
    const title = lockedIn ? "" : titleGuess.trim();
    const artist = artistGuess.trim();
    if (!title && !artist) return;
    send({ type: "guess", title, artist });
    setTitleGuess("");
    setArtistGuess("");
  }

  function skipGuess() {
    if (myStep >= MAX_GUESSES - 1) return;
    send({ type: "skip" });
    setTitleGuess("");
    setArtistGuess("");
    stopAudio();
    setSkipPop(Date.now());
    shakeEl(skipWrapRef.current);
  }

  function applyTitleHint() {
    if (phase !== "play") return;
    if (myStep < HINT_AFTER_SKIPS) return;
    send({ type: "hint" });
    if (!hintUsed) {
      setHintUsed(true);
      setHintPop(Date.now());
      shakeEl(titleFieldRef.current);
    }
  }

  // ---- play / reveal board ----
  const revealed = phase === "reveal";
  const track = state.track;
  const lastGuesser = state.guesses?.[state.guesses.length - 1];

  return (
    <div className="game mp-host mp-board" ref={rootRef}>
      <div className="mp-board-main">
      <div className="game-head">
        <button className="btn btn-mini" onClick={onExit}>
          ← end party
        </button>
        <div className="scoreboard">
          <span className="scoreboard-label">room</span>
          <span className="scoreboard-value">{code}</span>
        </div>
      </div>

      <div className="now-playing">
        <span className="np-playlist">{state.playlistName}</span>
        <span className="np-round">
          record {state.roundIdx + 1} / {state.roundCount}
        </span>
      </div>

      <PlayerRail
        players={state.players}
        pulseId={lastGuesser?.playerId}
        unlockByPlayer={state.unlockByPlayer || {}}
      />

      {!cueReady ? (
        <div className="loader cue-loader">cueing the record…</div>
      ) : (
        <>
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

      {revealed && state.outcome === "win" && !timed && (
        <div className="inline-badge inline-badge--win">
          {state.players.find((p) => p.id === state.winnerId)?.name || "someone"} NAILED IT
        </div>
      )}
      {revealed && state.outcome === "win" && timed && (
        <div className="inline-badge inline-badge--win">TIME’S UP</div>
      )}
      {revealed && state.outcome === "lose" && (
        <div className="inline-badge inline-badge--lose">NOBODY GOT IT</div>
      )}

      {phase === "play" && timed && (
        <TimedCountdown
          roundEndsAt={state.roundEndsAt}
          lockedIn={lockedIn}
        />
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
          <span>
            {revealed ? "revealed" : `${unlocked}s unlocked · 0:${String(TOTAL).padStart(2, "0")}`}
          </span>
        </div>
      </div>

      {phase === "play" && (
        <div className="guess-input-wrap">
          <div className="guess-fields">
            <div className="guess-title-row">
              <div className="guess-title-field" ref={titleFieldRef}>
                <input
                  className={`guess-input${titleHintText || lockedIn ? " guess-input--hint" : ""}${lockedIn ? " guess-input--locked" : ""}`}
                  placeholder={
                    lockedIn ? "locked in — waiting…" : titleHintText || "song title…"
                  }
                  value={lockedIn ? "" : titleGuess}
                  disabled={lockedIn}
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
                {myStep >= HINT_AFTER_SKIPS && (!hintUsed || hintPop) && !lockedIn && (
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
              disabled={
                lockedIn
                  ? !artistGuess.trim() || !!state.revealedArtist
                  : !titleGuess.trim() && !artistGuess.trim()
              }
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
              {state.outcome === "win" && (
                <span className="reveal-points">
                  +{state.earnedPts} pts
                  {state.bonus ? " · artist bonus!" : ""}
                  {state.winnerId === playerId ? " · you!" : ""}
                </span>
              )}
            </div>
          </div>
          {timed && <TimedPlacesList places={state.timedPlaces} />}
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
        </>
      )}

      {error && <div className="error-banner">{error}</div>}
      </div>

      <GuessPopups guesses={state.guesses} myId={playerId} />
    </div>
  );
}
