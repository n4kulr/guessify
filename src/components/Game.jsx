import { useEffect, useMemo, useRef, useState } from "react";
import { isCorrect, matchesAnyArtist } from "../match.js";
import { useSpotifyPlayer } from "../useSpotifyPlayer.js";
import { getToken } from "../spotify.js";

const STEPS = [1, 2, 4, 7, 11, 16]; // cumulative unlocked seconds per guess
const MAX_GUESSES = STEPS.length;
const TOTAL = STEPS[STEPS.length - 1];
const ROUND_COUNT = 5;

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
  const [phase, setPhase] = useState("play"); // play | result | over
  const [outcome, setOutcome] = useState(null); // win | lose
  const [score, setScore] = useState(0);
  const [bonus, setBonus] = useState(0); // +1 if artist also nailed on the winning guess
  const [titleGuess, setTitleGuess] = useState("");
  const [artistGuess, setArtistGuess] = useState("");
  const [playing, setPlaying] = useState(false);

  const { deviceId, status: playerStatus, errorMsg, player } = useSpotifyPlayer();
  const stopTimer = useRef(null);

  const track = rounds[roundIdx];
  const unlocked = STEPS[Math.min(guessNum, MAX_GUESSES - 1)];

  // Stop playback whenever the track changes (and on unmount).
  useEffect(() => {
    stopAudio();
    return stopAudio;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx]);

  function stopAudio() {
    clearTimeout(stopTimer.current);
    if (player.current) player.current.pause().catch(() => {});
    setPlaying(false);
  }

  async function playSnippet(seconds) {
    if (playerStatus !== "ready" || !deviceId || !track) return;
    clearTimeout(stopTimer.current);
    try {
      const token = await getToken();
      // Start the real track from the top on our in-browser device...
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ uris: [`spotify:track:${track.id}`], position_ms: 0 }),
      });
      setPlaying(true);
      // ...then pause after the unlocked number of seconds.
      stopTimer.current = setTimeout(() => {
        if (player.current) player.current.pause().catch(() => {});
        setPlaying(false);
      }, seconds * 1000);
    } catch {
      setPlaying(false);
    }
  }

  // Advance to the next attempt, or lose the round if out of guesses.
  function consumeGuess() {
    const nextNum = guessNum + 1;
    if (nextNum >= MAX_GUESSES) {
      setOutcome("lose");
      setPhase("result");
    } else {
      setGuessNum(nextNum);
    }
  }

  function submitGuess() {
    if (phase !== "play") return;
    const title = titleGuess.trim();
    const artist = artistGuess.trim();
    if (!title && !artist) return; // nothing entered

    const titleOk = title ? isCorrect(title, track.name) : false;
    const artistOk = artist ? matchesAnyArtist(artist, track.artists) : false;
    const win = titleOk; // getting the title identifies the song

    setGuesses([...guesses, { title, artist, titleOk, artistOk, win }]);
    setTitleGuess("");
    setArtistGuess("");
    stopAudio();

    if (win) {
      const earned = MAX_GUESSES - guessNum + (artistOk ? 1 : 0);
      setBonus(artistOk ? 1 : 0);
      setScore((s) => s + earned);
      setOutcome("win");
      setPhase("result");
    } else {
      consumeGuess();
    }
  }

  function skip() {
    if (phase !== "play") return;
    setGuesses([...guesses, { skip: true }]);
    setTitleGuess("");
    setArtistGuess("");
    stopAudio();
    consumeGuess();
  }

  function nextRound() {
    if (roundIdx + 1 >= rounds.length) {
      setPhase("over");
      return;
    }
    setRoundIdx((i) => i + 1);
    setGuessNum(0);
    setGuesses([]);
    setOutcome(null);
    setBonus(0);
    setTitleGuess("");
    setArtistGuess("");
    setPhase("play");
  }

  function restart() {
    onExit();
  }

  const maxScore = rounds.length * MAX_GUESSES;

  return (
    <div className="game">
      <div className="game-head">
        <button className="btn btn-mini" onClick={onExit}>
          ← change playlist
        </button>
        <div className="scoreboard">
          <span className="scoreboard-label">score</span>
          <span className="scoreboard-value">{score}</span>
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
          <div className="turntable turntable--game">
            <div className={`vinyl ${playing ? "spin-fast" : ""}`}>
              <div className="vinyl-label vinyl-label--mystery">?</div>
            </div>
            <div className={`tonearm ${playing ? "tonearm--on" : ""}`} />
          </div>

          <div className="progress">
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${(unlocked / TOTAL) * 100}%` }}
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
                {unlocked}s unlocked · 0:{String(TOTAL).padStart(2, "0")}
              </span>
            </div>
          </div>

          <div className="controls">
            {playerStatus === "error" ? (
              <div className="error-banner">{errorMsg}</div>
            ) : (
              <button
                className="btn btn-big btn-play"
                onClick={() => playSnippet(unlocked)}
                disabled={playerStatus !== "ready"}
              >
                <span className="btn-disc" aria-hidden="true" />
                {playerStatus !== "ready"
                  ? "connecting to spotify…"
                  : playing
                  ? "playing…"
                  : `play ${unlocked}s`}
              </button>
            )}
          </div>

          <div className="guess-rows">
            {Array.from({ length: MAX_GUESSES }).map((_, i) => {
              const g = guesses[i];
              const active = i === guessNum;
              let cls = "guess-row";
              if (g?.win) cls += " correct";
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
              <button className="btn btn-ghost" onClick={skip}>
                skip (+audio)
              </button>
              <button
                className="btn"
                onClick={submitGuess}
                disabled={!titleGuess.trim() && !artistGuess.trim()}
              >
                guess
              </button>
            </div>
          </div>
        </>
      )}

      {phase === "result" && (
        <div className={`result ${outcome}`}>
          <div className="result-badge">{outcome === "win" ? "NAILED IT" : "MISSED"}</div>
          <div className="reveal">
            <div className="reveal-art">
              {track.cover && <img src={track.cover} alt="" className="reveal-cover" />}
            </div>
            <div className="reveal-text">
              <span className="reveal-title">{track.name}</span>
              <span className="reveal-artist">{track.artists.join(", ")}</span>
              {outcome === "win" && (
                <span className="reveal-points">
                  +{MAX_GUESSES - guessNum + bonus} pts
                  {bonus ? " (artist bonus!)" : ""}
                </span>
              )}
            </div>
          </div>
          <button className="btn btn-big" onClick={nextRound}>
            {roundIdx + 1 >= rounds.length ? "see results →" : "next record →"}
          </button>
        </div>
      )}

      {phase === "over" && (
        <div className="gameover">
          <div className="turntable">
            <div className="vinyl spin-slow">
              <div className="vinyl-label">
                <span>{score}</span>
                <span>pts</span>
              </div>
            </div>
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
