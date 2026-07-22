import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { usePartyRoom } from "./usePartyRoom.js";
import { usePreviewPlayer } from "../usePreviewPlayer.js";
import { STEPS, TOTAL, randomAvatar } from "./constants.js";
import { loadMediaMode, saveMediaMode } from "../mediaMode.js";
import GuessMedia from "../components/GuessMedia.jsx";
import MediaModeToggle from "../components/MediaModeToggle.jsx";
import PlayerRail from "./PlayerRail.jsx";
import ProfileEditor from "./ProfileEditor.jsx";
import GuessPopups from "./GuessPopups.jsx";

/**
 * Host multiplayer session — one PartySocket for lobby + DJ board so the
 * host never drops the room when the game starts.
 */
export default function HostParty({ code, playlist, me, onExit }) {
  const { state, status, error, send, playerId } = usePartyRoom(code);
  const [qr, setQr] = useState(null);
  const [copied, setCopied] = useState(false);
  const [titleGuess, setTitleGuess] = useState("");
  const [artistGuess, setArtistGuess] = useState("");
  const [hostName, setHostName] = useState(
    () => me?.displayName?.split(" ")[0] || "host"
  );
  const [hostAvatar, setHostAvatar] = useState(() => randomAvatar());
  const { errorMsg, play, pause } = usePreviewPlayer();
  const [playBusy, setPlayBusy] = useState(false);
  const [localPlaying, setLocalPlaying] = useState(false);
  const [mediaMode, setMediaMode] = useState(loadMediaMode);
  const lastTrackRef = useRef(null);

  function changeMediaMode(next) {
    setMediaMode(next);
    saveMediaMode(next);
  }
  const hostedRef = useRef(false);

  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/join/${code}`
      : `/join/${code}`;

  const hostTrack = playlist?.tracks?.find((t) => t.id === state?.trackId) || null;

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
    if (status !== "connected" || hostedRef.current) return;
    hostedRef.current = true;
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
    if (mePlayer.avatar) setHostAvatar(mePlayer.avatar);
  }, [mePlayer?.id, mePlayer?.name, mePlayer?.avatar?.peep, mePlayer?.avatar?.color]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (state?.revealedArtist) setArtistGuess(state.revealedArtist);
  }, [state?.revealedArtist]);

  useEffect(() => {
    if (!state?.revealedArtist) setArtistGuess("");
  }, [state?.roundIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  function updateHostProfile({ name, avatar }) {
    setHostName(name);
    setHostAvatar(avatar);
    if (playerId) send({ type: "profile", name, avatar });
  }

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
      if (state.phase !== "play") send({ type: "playState", playing: false });
      lastTrackRef.current = state.trackId;
    }
  }, [state?.trackId, state?.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const unlocked = state?.unlocked ?? STEPS[0];
  const canControl = !!hostTrack;
  const phase = state?.phase || "lobby";
  const spinning = localPlaying && phase === "play";

  async function playSnippet(seconds) {
    if (!hostTrack || playBusy || localPlaying) return;
    setPlayBusy(true);
    try {
      await play(hostTrack, seconds, {
        onStop: () => {
          setLocalPlaying(false);
          send({ type: "playState", playing: false });
        },
      });
      setLocalPlaying(true);
      send({ type: "playState", playing: true });
    } catch {
      setLocalPlaying(false);
      send({ type: "playState", playing: false });
    } finally {
      setPlayBusy(false);
    }
  }

  function stopAudio() {
    pause();
    setLocalPlaying(false);
    send({ type: "playState", playing: false });
    setPlayBusy(false);
  }

  function togglePlay() {
    if (!canControl || playBusy) return;
    if (localPlaying) {
      stopAudio();
      return;
    }
    playSnippet(phase === "reveal" ? Math.max(unlocked, 8) : unlocked);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback for older browsers / insecure contexts
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
          Friends scan the QR, or open guessify and type the code. You DJ the audio
          and can race guesses too.
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
            <h3 className="mp-side-title">
              playlists · <span className="mp-side-accent">{playlist.name}</span>
            </h3>
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
              <span className="btn-disc" aria-hidden="true" />
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
  }

  // ---- game over ----
  if (phase === "over") {
    const ranked = [...state.players].sort((a, b) => b.score - a.score);
    return (
      <div className="mp-over">
        <h2 className="title">That's a wrap!</h2>
        <PlayerRail players={ranked} winnerId={ranked[0]?.id} />
        <div className="gameover-actions">
          <button className="btn btn-big btn-play" onClick={onExit}>
            back home
          </button>
        </div>
      </div>
    );
  }

  // ---- DJ board (play / reveal) ----
  const revealed = phase === "reveal";
  const track = state.track;
  const lastGuesser = state.guesses[state.guesses.length - 1];

  return (
    <div className="game mp-host mp-board">
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
        winnerId={state.winnerId}
        pulseId={lastGuesser?.playerId}
      />

      <GuessMedia
        mode={mediaMode}
        revealed={revealed}
        spinning={spinning}
        cover={track?.cover}
        title={track?.name}
        artist={(track?.artists || []).join(", ")}
        canControl={canControl}
        interactive={canControl}
        vinylTitle={canControl ? "play / pause · drag to scrub" : undefined}
        onTogglePlay={togglePlay}
        onScrubStart={stopAudio}
      />

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

      <div className={`controls${phase === "play" ? "" : " controls--toggle-only"}`}>
        {phase === "play" && (
          <>
            {errorMsg && <div className="error-banner">{errorMsg}</div>}
            <button
              className="btn btn-big btn-play"
              onClick={() => playSnippet(unlocked)}
              disabled={!canControl || localPlaying || playBusy}
            >
              <span className="btn-disc" aria-hidden="true" />
              {playBusy
                ? "starting…"
                : localPlaying
                ? "playing…"
                : `play ${unlocked}s`}
            </button>
          </>
        )}
        <MediaModeToggle mode={mediaMode} onChange={changeMediaMode} />
      </div>

      {phase === "play" && (
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
              {state.outcome === "win" && (
                <span className="reveal-points">
                  +{state.earnedPts} pts
                  {state.bonus ? " · artist bonus!" : ""}
                  {state.winnerId === playerId ? " · you!" : ""}
                </span>
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
      <p className="fineprint mp-host-hint">
        You're in the race too — only you can skip to unlock more audio for everyone.
      </p>
      </div>

      <GuessPopups guesses={state.guesses} myId={playerId} />
    </div>
  );
}
