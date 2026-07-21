import { useEffect, useMemo, useRef, useState } from "react";
import { isCorrect, matchesAnyArtist } from "../match.js";
import { useSpotifyPlayer } from "../useSpotifyPlayer.js";
import { getToken } from "../spotify.js";
import ScrubbableVinyl from "./ScrubbableVinyl.jsx";
import {
  STEPS,
  MAX_GUESSES,
  TOTAL,
  ROUND_COUNT,
  titlePointsForGuess,
  ARTIST_BONUS,
  TITLE_POINTS,
} from "../multiplayer/constants.js";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Game({ playlist, onExit }) {
  const rounds = useMemo(
    () => shuffle(playlist.tracks).slice(0, Math.min(ROUND_COUNT, playlist.tracks.length)),
    [playlist]
  );

  const [roundIdx, setRoundIdx] = useState(0);
  const [guessNum, setGuessNum] = useState(0);
  const [guesses, setGuesses] = useState([]); // {title, artist, titleOk, artistOk, win, skip}
  const [phase, setPhase] = useState("play"); // play | over
  const [outcome, setOutcome] = useState(null); // null | win | lose
  const [score, setScore] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [earnedPts, setEarnedPts] = useState(0);
  const [artistBonusTaken, setArtistBonusTaken] = useState(false);
  const [titleGuess, setTitleGuess] = useState("");
  const [artistGuess, setArtistGuess] = useState("");
  const [playing, setPlaying] = useState(false);
  const [playBusy, setPlayBusy] = useState(false); // lock while Spotify request is in flight
  const [celebrate, setCelebrate] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);

  const { deviceId, status: playerStatus, errorMsg, player } = useSpotifyPlayer();
  const stopTimer = useRef(null);

  const track = rounds[roundIdx];
  const unlocked = STEPS[Math.min(guessNum, MAX_GUESSES - 1)];
  const resolved = outcome !== null;
  const canControl = playerStatus === "ready" && !!deviceId && !!track;

  // Stop playback whenever the track changes (and on unmount).
  useEffect(() => {
    stopAudio();
    setScrubbing(false);
    setPlayBusy(false);
    return stopAudio;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx]);

  function stopAudio() {
    clearTimeout(stopTimer.current);
    if (player.current) player.current.pause().catch(() => {});
    setPlaying(false);
    setPlayBusy(false);
  }

  function armStopTimer(seconds) {
    clearTimeout(stopTimer.current);
    stopTimer.current = setTimeout(() => {
      if (player.current) player.current.pause().catch(() => {});
      setPlaying(false);
    }, seconds * 1000);
  }

  async function playSnippet(seconds) {
    if (!canControl || playBusy || playing) return;
    setPlayBusy(true);
    clearTimeout(stopTimer.current);
    try {
      const token = await getToken();
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ uris: [`spotify:track:${track.id}`], position_ms: 0 }),
      });
      setPlaying(true);
      armStopTimer(seconds);
    } catch {
      setPlaying(false);
    } finally {
      setPlayBusy(false);
    }
  }

  async function togglePlay() {
    if (!canControl || phase !== "play" || playBusy) return;
    if (playing) {
      stopAudio();
      return;
    }
    const secs = resolved ? Math.max(unlocked, 8) : unlocked;
    await playSnippet(secs);
  }

  function onVinylScrubStart() {
    setScrubbing(true);
    clearTimeout(stopTimer.current);
    if (player.current) player.current.pause().catch(() => {});
    setPlaying(false);
    setPlayBusy(false);
  }

  function onVinylScrubEnd() {
    setScrubbing(false);
  }

  // Advance to the next attempt, or lose the round if out of guesses.
  function consumeGuess() {
    const nextNum = guessNum + 1;
    if (nextNum >= MAX_GUESSES) {
      setOutcome("lose");
    } else {
      setGuessNum(nextNum);
    }
  }

  function submitGuess() {
    if (phase !== "play" || resolved) return;
    const title = titleGuess.trim();
    const artist = artistGuess.trim();
    if (!title && !artist) return;

    const titleOk = title ? isCorrect(title, track.name) : false;
    const artistOk = artist ? matchesAnyArtist(artist, track.artists) : false;
    const win = titleOk;

    setGuesses([...guesses, { title, artist, titleOk, artistOk, win }]);
    setTitleGuess("");
    setArtistGuess("");
    stopAudio();

    let artistPts = 0;
    if (artistOk && !artistBonusTaken) {
      artistPts = ARTIST_BONUS;
      setArtistBonusTaken(true);
      setBonus(artistPts);
      setScore((s) => s + artistPts);
    }

    if (win) {
      const titlePts = titlePointsForGuess(guessNum);
      const earned = titlePts + artistPts;
      setEarnedPts(earned);
      setScore((s) => s + titlePts);
      setOutcome("win");
      setCelebrate(true);
      playSnippet(Math.max(unlocked, 8));
    } else {
      if (artistPts) setEarnedPts(artistPts);
      consumeGuess();
    }
  }

  function skip() {
    if (phase !== "play" || resolved) return;
    setGuesses([...guesses, { skip: true }]);
    setTitleGuess("");
    setArtistGuess("");
    stopAudio();
    consumeGuess();
  }

  function nextRound() {
    stopAudio();
    if (roundIdx + 1 >= rounds.length) {
      setPhase("over");
      return;
    }
    setRoundIdx((i) => i + 1);
    setGuessNum(0);
    setGuesses([]);
    setOutcome(null);
    setBonus(0);
    setEarnedPts(0);
    setArtistBonusTaken(false);
    setCelebrate(false);
    setTitleGuess("");
    setArtistGuess("");
    setPhase("play");
  }

  function restart() {
    onExit();
  }

  const maxScore = rounds.length * (TITLE_POINTS[0] + ARTIST_BONUS);
  const spinning = (playing || celebrate) && !scrubbing;
  // Play button: only start a snippet — greyed out while playing / busy.
  // Pause lives on the vinyl (click).
  const playDisabled = !canControl || playing || playBusy;

  return (
    <div className={`game ${outcome === "win" ? "game--win" : ""} ${outcome === "lose" ? "game--lose" : ""}`}>
      <div className="game-head">
        <button className="btn btn-mini" onClick={onExit}>
          ← change playlist
        </button>
        <div className="scoreboard">
          <span className="scoreboard-label">score</span>
          <span className="scoreboard-value">{score}</span>
          {celebrate && earnedPts > 0 && (
            <span key={`pts-${roundIdx}`} className="points-float">
              +{earnedPts}
            </span>
          )}
        </div>
      </div>

      {phase !== "over" && (
        <div className="now-playing">
          <span className="np-playlist">{playlist.name}</span>
          <span className="np-round">
            record {roundIdx + 1} / {rounds.length}
          </span>
        </div>
      )}

      {phase === "play" && (
        <>
          <div className={`turntable turntable--game ${celebrate ? "turntable--celebrate" : ""}`}>
            {celebrate && (
              <>
                <span className="win-ring win-ring--1" aria-hidden="true" />
                <span className="win-ring win-ring--2" aria-hidden="true" />
                <span className="win-ring win-ring--3" aria-hidden="true" />
              </>
            )}
            <ScrubbableVinyl
              className={resolved ? "vinyl--revealed" : ""}
              spin={spinning ? "fast" : false}
              enabled={canControl}
              title={
                canControl
                  ? playing
                    ? "click to pause · drag to scrub"
                    : "click to play · drag to scrub"
                  : undefined
              }
              onClick={togglePlay}
              onScrubStart={onVinylScrubStart}
              onScrubEnd={onVinylScrubEnd}
            >
              {resolved && track.cover ? (
                <img src={track.cover} alt="" className="vinyl-cover" draggable={false} />
              ) : (
                <div className="vinyl-label vinyl-label--mystery">
                  {outcome === "lose" ? "✗" : "?"}
                </div>
              )}
            </ScrubbableVinyl>
            <div className={`tonearm ${spinning ? "tonearm--on" : ""}`} />
          </div>

          {outcome === "win" && (
            <div key={`badge-${roundIdx}`} className="inline-badge inline-badge--win">
              NAILED IT
            </div>
          )}
          {outcome === "lose" && (
            <div className="inline-badge inline-badge--lose">MISSED</div>
          )}

          <div className="progress">
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: `${((resolved ? TOTAL : unlocked) / TOTAL) * 100}%`,
                }}
              />
              {STEPS.map((s) => (
                <span
                  key={s}
                  className="progress-tick"
                  style={{ left: `${(s / TOTAL) * 100}%` }}
                />
              ))}
            </div>
            <div className="progress-labels">
              <span>0:00</span>
              <span>
                {resolved
                  ? "revealed"
                  : `${unlocked}s unlocked · 0:${String(TOTAL).padStart(2, "0")}`}
              </span>
            </div>
          </div>

          {!resolved && (
            <div className="controls">
              {playerStatus === "error" ? (
                <div className="error-banner">{errorMsg}</div>
              ) : (
                <button
                  className="btn btn-big btn-play"
                  onClick={() => playSnippet(unlocked)}
                  disabled={playDisabled}
                >
                  <span className="btn-disc" aria-hidden="true" />
                  {!canControl
                    ? "connecting to spotify…"
                    : playBusy
                    ? "starting…"
                    : playing
                    ? "playing…"
                    : `play ${unlocked}s`}
                </button>
              )}
            </div>
          )}

          <div className="guess-rows">
            {Array.from({ length: MAX_GUESSES }).map((_, i) => {
              const g = guesses[i];
              const active = !resolved && i === guessNum;
              let cls = "guess-row";
              if (g?.win) cls += " correct correct--pulse";
              else if (g) cls += " wrong";
              if (active) cls += " active";
              return (
                <div key={i} className={cls}>
                  {g ? (
                    g.skip ? (
                      <span className="gr-skip">⏭ skipped</span>
                    ) : (
                      <>
                        <span className={`gr-field ${g.titleOk ? "ok" : "no"}`}>
                          {g.title || "—"}
                        </span>
                        <span className="gr-sep">by</span>
                        <span className={`gr-field ${g.artistOk ? "ok" : "no"}`}>
                          {g.artist || "—"}
                        </span>
                      </>
                    )
                  ) : active ? (
                    "◉ your guess…"
                  ) : (
                    ""
                  )}
                </div>
              );
            })}
          </div>

          {resolved ? (
            <div className={`inline-reveal ${outcome}`}>
              <div className="reveal">
                <div className="reveal-art">
                  {track.cover && <img src={track.cover} alt="" className="reveal-cover" />}
                </div>
                <div className="reveal-text">
                  <span className="reveal-title">{track.name}</span>
                  <span className="reveal-artist">{track.artists.join(", ")}</span>
                  {outcome === "win" && (
                    <span className="reveal-points">
                      +{earnedPts} pts
                      {bonus ? " · artist bonus!" : ""}
                    </span>
                  )}
                </div>
              </div>
              <button className="btn btn-big btn-play" onClick={nextRound}>
                <span className="btn-disc" aria-hidden="true" />
                {roundIdx + 1 >= rounds.length ? "see results →" : "next record →"}
              </button>
            </div>
          ) : (
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
        </>
      )}

      {phase === "over" && (
        <div className="gameover">
          <div className="turntable">
            <ScrubbableVinyl spin="slow" title="drag to scrub">
              <div className="vinyl-label">
                <span>{score}</span>
                <span>pts</span>
              </div>
            </ScrubbableVinyl>
          </div>
          <h2 className="title">That's a wrap!</h2>
          <p className="subtitle">
            You scored <strong>{score}</strong> of {maxScore} possible points across{" "}
            {rounds.length} records.
          </p>
          <div className="gameover-actions">
            <button className="btn btn-big btn-play" onClick={() => window.location.reload()}>
              play again
            </button>
            <button className="btn btn-ghost" onClick={restart}>
              pick another playlist
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
