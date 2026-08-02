import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { usePartyRoom } from "./usePartyRoom.js";
import { usePreviewPlayer } from "../usePreviewPlayer.js";
import { resolvePreview } from "../itunes.js";
import { STEPS, TOTAL, randomAvatar, normalizeAvatar, unlockSecondsFor, PLAYER_COLORS, nextVotesNeeded, activePlayerCount } from "./constants.js";
import { fireConfetti, shakeEl } from "../fx.js";
import GuessMedia from "../components/GuessMedia.jsx";
import GuessTransport from "../components/GuessTransport.jsx";
import ShareScoreButton from "../components/ShareScoreButton.jsx";
import PlayerRail from "./PlayerRail.jsx";
import ProfileEditor from "./ProfileEditor.jsx";
import GuessPopups from "./GuessPopups.jsx";
import { loadLocalProfile, saveLocalProfile } from "../localProfile.js";
import { applyThemeForAccent, accentMatchingTheme } from "../themes.js";
import { isNoPreviewError } from "../shareScore.js";
import { HINT_AFTER_SKIPS } from "../titleHint.js";

/**
 * Host multiplayer session — picks playlist / starts game; audio plays locally
 * on each device (no shared DJ).
 */
export default function HostParty({ code, playlist, me, profile, onExit }) {
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
  const lastFxGuess = useRef(-1);

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
  }, [state?.roundIdx]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (g.win) fireConfetti("title");
    else if (!g.artistOk) shakeEl(rootRef.current);
  }, [state?.guesses, playerId]);

  useEffect(() => {
    if (state?.phase === "over") fireConfetti("victory");
  }, [state?.phase]);

  const unlocked = unlockSecondsFor(state?.unlockByPlayer, playerId, state);
  const myStep = state?.unlockByPlayer?.[playerId] ?? 0;
  const phase = state?.phase || "lobby";
  const spinning = localPlaying && (phase === "play" || phase === "reveal");

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
    if (phase !== "reveal" || !canPlay) return;
    if (lastRevealPlayRef.current === revealPlayKey) return;
    lastRevealPlayRef.current = revealPlayKey;
    playSnippet(null);
  }, [phase, revealPlayKey, canPlay]); // eslint-disable-line react-hooks/exhaustive-deps

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy this join link:", joinUrl);
    }
  }

  // ---- lobby ----
  if (!state || phase === "lobby" || phase === "empty") {
    const players = state?.players || [];
    const canStart = players.some((p) => p.connected);
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
              onClick={() => send({ type: "start" })}
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

  function applyTitleHint() {
    if (phase !== "play") return;
    if (myStep < HINT_AFTER_SKIPS) return;
    send({ type: "hint" });
  }

  useEffect(() => {
    if (!titleHint) return;
    setTitleGuess(titleHint);
    consumeTitleHint();
  }, [titleHint, consumeTitleHint]);

  // ---- game over ----
  if (phase === "over") {
    const ranked = [...state.players].sort((a, b) => b.score - a.score);
    const mine = ranked.find((p) => p.id === playerId);
    return (
      <div className="mp-over">
        <h2 className="title">That's a wrap!</h2>
        <PlayerRail players={ranked} />
        <div className="gameover-actions">
          <ShareScoreButton
            mode="party"
            score={mine?.score ?? 0}
            name={mine?.name || hostName}
          />
          <button className="btn btn-big btn-play" onClick={onExit}>
            back home
          </button>
        </div>
      </div>
    );
  }

  // ---- play / reveal board ----
  const revealed = phase === "reveal";
  const track = state.track;
  const lastGuesser = state.guesses[state.guesses.length - 1];

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

      <div className="media-stage">
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
      </div>
      {errorMsg && <div className="error-banner">{errorMsg}</div>}

      {revealed && state.outcome === "win" && (
        <div className="inline-badge inline-badge--win">
          {state.players.find((p) => p.id === state.winnerId)?.name || "someone"} NAILED IT
        </div>
      )}
      {revealed && state.outcome === "lose" && (
        <div className="inline-badge inline-badge--lose">NOBODY GOT IT</div>
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
              <div className="guess-title-field">
                <input
                  className="guess-input"
                  placeholder="song title…"
                  value={titleGuess}
                  onChange={(e) => setTitleGuess(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitGuess()}
                />
                {myStep >= HINT_AFTER_SKIPS && (
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
            </div>
            <div className="guess-artist-row">
              <input
                className="guess-input"
                placeholder="artist…"
                value={state.revealedArtist || artistGuess}
                disabled={!!state.revealedArtist}
                onChange={(e) => setArtistGuess(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitGuess()}
              />
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
              {state.outcome === "win" && (
                <span className="reveal-points">
                  +{state.earnedPts} pts
                  {state.bonus ? " · artist bonus!" : ""}
                  {state.winnerId === playerId ? " · you!" : ""}
                </span>
              )}
            </div>
          </div>
          <div className="media-stage-vote">
            <button
              type="button"
              className={`btn btn-play media-stage-btn ${
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
              <span className="btn-label">
                {state.roundIdx + 1 >= state.roundCount ? "end" : "next"}
              </span>
              <span className="vote-tally">
                {(state.nextVotes || []).length}/
                {state.nextVotesNeeded ??
                  nextVotesNeeded(activePlayerCount(state.players))}
              </span>
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
