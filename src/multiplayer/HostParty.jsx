import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { usePartyRoom } from "./usePartyRoom.js";
import { useSpotifyPlayer } from "../useSpotifyPlayer.js";
import { getToken } from "../spotify.js";
import { STEPS, TOTAL } from "./constants.js";
import ScrubbableVinyl from "../components/ScrubbableVinyl.jsx";
import PlayerRail from "./PlayerRail.jsx";

/**
 * Host multiplayer session — one PartySocket for lobby + DJ board so the
 * host never drops the room when the game starts.
 */
export default function HostParty({ code, playlist, me, onExit }) {
  const { state, status, error, send } = usePartyRoom(code);
  const [qr, setQr] = useState(null);
  const [copied, setCopied] = useState(false);
  const { deviceId, status: playerStatus, errorMsg, player } = useSpotifyPlayer();
  const [playBusy, setPlayBusy] = useState(false);
  const [localPlaying, setLocalPlaying] = useState(false);
  const stopTimer = useRef(null);
  const lastTrackRef = useRef(null);
  const hostedRef = useRef(false);

  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/join/${code}`
      : `/join/${code}`;

  useEffect(() => {
    QRCode.toDataURL(joinUrl, {
      margin: 1,
      width: 240,
      color: { dark: "#111111", light: "#ffffff" },
    }).then(setQr);
  }, [joinUrl]);

  useEffect(() => {
    if (status !== "connected" || hostedRef.current) return;
    hostedRef.current = true;
    send({
      type: "host",
      hostName: me?.displayName || "host",
      playlistName: playlist.name,
      tracks: playlist.tracks.map((t) => ({
        id: t.id,
        name: t.name,
        artists: t.artists,
        cover: t.cover,
      })),
    });
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      clearTimeout(stopTimer.current);
      player.current?.pause().catch(() => {});
    };
  }, [player]);

  useEffect(() => {
    if (!state?.trackId) return;
    if (lastTrackRef.current !== state.trackId || state.phase !== "play") {
      clearTimeout(stopTimer.current);
      player.current?.pause().catch(() => {});
      setLocalPlaying(false);
      if (state.phase !== "play") send({ type: "playState", playing: false });
      lastTrackRef.current = state.trackId;
    }
  }, [state?.trackId, state?.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const unlocked = state?.unlocked ?? STEPS[0];
  const canControl = playerStatus === "ready" && !!deviceId && !!state?.trackId;
  const phase = state?.phase || "lobby";
  const spinning = localPlaying && phase === "play";

  async function playSnippet(seconds) {
    if (!canControl || playBusy || localPlaying) return;
    setPlayBusy(true);
    clearTimeout(stopTimer.current);
    try {
      const token = await getToken();
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ uris: [`spotify:track:${state.trackId}`], position_ms: 0 }),
      });
      setLocalPlaying(true);
      send({ type: "playState", playing: true });
      stopTimer.current = setTimeout(() => {
        player.current?.pause().catch(() => {});
        setLocalPlaying(false);
        send({ type: "playState", playing: false });
      }, seconds * 1000);
    } catch {
      setLocalPlaying(false);
      send({ type: "playState", playing: false });
    } finally {
      setPlayBusy(false);
    }
  }

  function stopAudio() {
    clearTimeout(stopTimer.current);
    player.current?.pause().catch(() => {});
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
          Friends scan the QR, or open guessify and type the code below. You keep the
          music here — they race to guess.
        </p>
        <div className="mp-lobby-grid">
          <div className="mp-qr-card">
            {qr ? (
              <img src={qr} alt="Join QR code" className="mp-qr" />
            ) : (
              <div className="loader">…</div>
            )}
            <div className="mp-code">{code}</div>
            <button className="btn btn-mini mp-copy-link" type="button" onClick={copyLink}>
              {copied ? "copied!" : "copy join link"}
            </button>
          </div>
          <div className="mp-lobby-side">
            <h3 className="mp-side-title">crate · {playlist.name}</h3>
            <PlayerRail players={players} />
            {error && <div className="error-banner">{error}</div>}
            {status === "connecting" && <p className="fineprint">connecting to room…</p>}
            {status === "error" && (
              <p className="fineprint">
                Multiplayer server unreachable. Run <code>npx partykit dev</code> locally or
                set <code>VITE_PARTYKIT_HOST</code>.
              </p>
            )}
            <button
              className="btn btn-big btn-play"
              disabled={!canStart}
              onClick={() => send({ type: "start" })}
            >
              <span className="btn-disc" aria-hidden="true" />
              {canStart ? "start race" : "waiting for players…"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- game over ----
  if (phase === "over") {
    const ranked = [...state.players].sort((a, b) => b.score - a.score || b.wins - a.wins);
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
    <div className="game mp-host">
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

      <div className="turntable turntable--game">
        <ScrubbableVinyl
          className={revealed ? "vinyl--revealed" : ""}
          spin={spinning ? "fast" : false}
          enabled={canControl}
          title={canControl ? "play / pause · drag to scrub" : undefined}
          onClick={togglePlay}
          onScrubStart={stopAudio}
        >
          {revealed && track?.cover ? (
            <img src={track.cover} alt="" className="vinyl-cover" draggable={false} />
          ) : (
            <div className="vinyl-label vinyl-label--mystery">?</div>
          )}
        </ScrubbableVinyl>
        <div className={`tonearm ${spinning ? "tonearm--on" : ""}`} />
      </div>

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
        <div className="controls">
          {playerStatus === "error" ? (
            <div className="error-banner">{errorMsg}</div>
          ) : (
            <button
              className="btn btn-big btn-play"
              onClick={() => playSnippet(unlocked)}
              disabled={!canControl || localPlaying || playBusy}
            >
              <span className="btn-disc" aria-hidden="true" />
              {!canControl
                ? "connecting to spotify…"
                : playBusy
                ? "starting…"
                : localPlaying
                ? "playing…"
                : `play ${unlocked}s`}
            </button>
          )}
        </div>
      )}

      <div className="guess-rows mp-guess-feed">
        {state.guesses.length === 0 ? (
          <div className="guess-row active">waiting for guesses…</div>
        ) : (
          state.guesses.map((g, i) => (
            <div
              key={i}
              className={`guess-row ${g.win ? "correct" : "wrong"}`}
              style={{ borderLeft: `4px solid ${g.color}` }}
            >
              <span className="mp-guess-who">{g.name}</span>
              {g.skip ? (
                <span className="gr-skip">⏭ skipped</span>
              ) : (
                <>
                  <span className={`gr-field ${g.titleOk ? "ok" : "no"}`}>{g.title || "—"}</span>
                  <span className="gr-sep">by</span>
                  <span className={`gr-field ${g.artistOk ? "ok" : "no"}`}>{g.artist || "—"}</span>
                </>
              )}
            </div>
          ))
        )}
      </div>

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
        You're the DJ — phones race. Wrong guesses unlock more audio for everyone.
      </p>
    </div>
  );
}
