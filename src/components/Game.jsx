import { useEffect, useMemo, useRef, useState } from "react";
import { isCorrect, normalize } from "../match.js";
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
  const titles = useMemo(
    () => [...new Set(playlist.tracks.map((t) => t.name))].sort(),
    [playlist]
  );

  const [roundIdx, setRoundIdx] = useState(0);
  const [guessNum, setGuessNum] = useState(0);
  const [guesses, setGuesses] = useState([]); // {text, correct}
  const [phase, setPhase] = useState("play"); // play | result | over
  const [outcome, setOutcome] = useState(null); // win | lose
  const [score, setScore] = useState(0);
  const [query, setQuery] = useState("");
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

  const suggestions = useMemo(() => {
    const q = normalize(query);
    if (!q) return [];
    return titles.filter((t) => normalize(t).includes(q)).slice(0, 6);
  }, [query, titles]);

  function submitGuess(text) {
    if (phase !== "play") return;
    const correct = isCorrect(text, track.name);
    const nextGuesses = [...guesses, { text, correct }];
    setGuesses(nextGuesses);
    setQuery("");
    stopAudio();

    if (correct) {
      setOutcome("win");
      setScore((s) => s + (MAX_GUESSES - guessNum));
      setPhase("result");
      return;
    }
    const nextNum = guessNum + 1;
    if (nextNum >= MAX_GUESSES) {
      setOutcome("lose");
      setPhase("result");
    } else {
      setGuessNum(nextNum);
    }
  }

  function skip() {
    submitGuessRaw("⏭ skipped");
  }
  function submitGuessRaw(label) {
    if (phase !== "play") return;
    const nextGuesses = [...guesses, { text: label, correct: false }];
    setGuesses(nextGuesses);
    stopAudio();
    const nextNum = guessNum + 1;
    if (nextNum >= MAX_GUESSES) {
      setOutcome("lose");
      setPhase("result");
    } else {
      setGuessNum(nextNum);
    }
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
    setQuery("");
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
              return (
                <div
                  key={i}
                  className={`guess-row ${g ? (g.correct ? "correct" : "wrong") : ""} ${
                    active ? "active" : ""
                  }`}
                >
                  {g ? g.text : active ? "◉ your guess…" : ""}
                </div>
              );
            })}
          </div>

          <div className="guess-input-wrap">
            <input
              className="guess-input"
              placeholder="type a song title from this playlist…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && suggestions[0]) submitGuess(suggestions[0]);
              }}
            />
            {suggestions.length > 0 && (
              <div className="suggestions">
                {suggestions.map((s) => (
                  <button key={s} className="suggestion" onClick={() => submitGuess(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div className="guess-actions">
              <button className="btn btn-ghost" onClick={skip}>
                skip (+audio)
              </button>
              <button
                className="btn"
                onClick={() => query && submitGuess(query)}
                disabled={!query}
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
                  +{MAX_GUESSES - guessNum} pts
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
