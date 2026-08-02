import { useEffect, useMemo, useRef, useState } from "react";
import { isCorrect, matchesAnyArtist } from "../match.js";
import { usePreviewPlayer } from "../usePreviewPlayer.js";
import { resolvePreview } from "../itunes.js";
import { fireConfetti, shakeEl } from "../fx.js";
import { loadLocalProfile } from "../localProfile.js";
import { isNoPreviewError } from "../shareScore.js";
import { nextSpareTrack } from "../deadPreview.js";
import { titleHintMask, HINT_AFTER_SKIPS } from "../titleHint.js";
import GuessMedia from "./GuessMedia.jsx";
import GuessTransport from "./GuessTransport.jsx";
import ShareScoreButton from "./ShareScoreButton.jsx";
import ScrubbableVinyl from "./ScrubbableVinyl.jsx";
import PlayerRail from "../multiplayer/PlayerRail.jsx";
import {
  STEPS,
  MAX_GUESSES,
  TOTAL,
  ROUND_COUNT,
  titlePointsForGuess,
  ARTIST_BONUS,
  SKIP_PENALTY,
  HINT_PENALTY,
  ROUND_MAX_POINTS,
  normalizeAvatar,
  randomAvatar,
} from "../multiplayer/constants.js";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const YOU_ID = "you";

export default function Game({ playlist, me, onExit, onReplay }) {
  const pool = useMemo(
    () => shuffle(playlist.tracks || []),
    [playlist]
  );
  const [rounds, setRounds] = useState(() =>
    pool.slice(0, Math.min(ROUND_COUNT, pool.length))
  );
  const usedIdsRef = useRef(new Set(rounds.map((t) => t.id).filter(Boolean)));
  const replacingRef = useRef(false);
  const rootRef = useRef(null);

  const { soloName, soloAvatar } = useMemo(() => {
    const local = loadLocalProfile();
    const name =
      me?.displayName?.split(/\s+/)[0]?.trim().slice(0, 16) ||
      local.name ||
      "you";
    const avatar = normalizeAvatar(local.avatar || randomAvatar());
    return { soloName: name, soloAvatar: avatar };
  }, [me?.displayName]);

  const [roundIdx, setRoundIdx] = useState(0);
  const [guessNum, setGuessNum] = useState(0);
  const [phase, setPhase] = useState("play"); // play | over
  const [outcome, setOutcome] = useState(null); // null | win | lose
  const [score, setScore] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [earnedPts, setEarnedPts] = useState(0);
  const [artistBonusTaken, setArtistBonusTaken] = useState(false);
  const [revealedArtist, setRevealedArtist] = useState(null);
  const [titleGuess, setTitleGuess] = useState("");
  const [artistGuess, setArtistGuess] = useState("");
  const [playing, setPlaying] = useState(false);
  const [playBusy, setPlayBusy] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [titleHintText, setTitleHintText] = useState("");

  const { errorMsg, setErrorMsg, play, pause } = usePreviewPlayer();

  const track = rounds[roundIdx];
  const unlocked = STEPS[Math.min(guessNum, MAX_GUESSES - 1)];
  const resolved = outcome !== null;
  const canControl = !!track;

  const players = useMemo(
    () => [
      {
        id: YOU_ID,
        name: soloName,
        avatar: soloAvatar,
        color: soloAvatar.color,
        score,
        connected: true,
        left: false,
        isHost: true,
      },
    ],
    [soloName, soloAvatar, score]
  );

  function resetInRound() {
    setGuessNum(0);
    setOutcome(null);
    setBonus(0);
    setEarnedPts(0);
    setArtistBonusTaken(false);
    setRevealedArtist(null);
    setCelebrate(false);
    setTitleGuess("");
    setArtistGuess("");
    setHintUsed(false);
    setTitleHintText("");
    setPhase("play");
  }

  /** Same round number; pull another track from the playlist/chart pool. */
  async function replaceDeadTrack(deadTrack) {
    if (replacingRef.current) return false;
    replacingRef.current = true;
    try {
      const used = usedIdsRef.current;
      if (deadTrack?.id) used.add(deadTrack.id);

      // Try spares until one resolves a preview (or pool runs out).
      for (;;) {
        const spare = nextSpareTrack(pool, used, deadTrack?.id);
        if (!spare) {
          return false;
        }
        used.add(spare.id);
        const url = await resolvePreview(spare);
        if (!url) continue;
        const patched = { ...spare, previewUrl: url };
        setRounds((rs) => {
          const copy = [...rs];
          copy[roundIdx] = patched;
          return copy;
        });
        stopAudio();
        resetInRound();
        return true;
      }
    } finally {
      replacingRef.current = false;
    }
  }

  // Stop playback whenever the track changes (and on unmount).
  useEffect(() => {
    stopAudio();
    setScrubbing(false);
    setPlayBusy(false);
    return stopAudio;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx, track?.id]);

  // Before the player hits play: if this track has no preview, swap in-place.
  useEffect(() => {
    if (phase !== "play" || outcome !== null || !track?.id) return;
    let cancelled = false;
    (async () => {
      const url = await resolvePreview(track);
      if (cancelled || url) return;
      const ok = await replaceDeadTrack(track);
      if (!cancelled && !ok) {
        // Pool exhausted — burn the round so the game can finish.
        window.setTimeout(() => {
          if (!cancelled) nextRound();
        }, 700);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?.id, roundIdx, phase, outcome]);

  function stopAudio() {
    pause();
    setPlaying(false);
    setPlayBusy(false);
  }

  async function playSnippet(seconds) {
    if (!track) return;
    pause();
    setPlaying(false);
    setPlayBusy(true);
    try {
      await play(track, seconds, { onStop: () => setPlaying(false) });
      setPlaying(true);
    } catch (e) {
      setPlaying(false);
      if (isNoPreviewError(e) && phase === "play" && outcome === null) {
        const ok = await replaceDeadTrack(track);
        if (!ok) {
          window.setTimeout(() => {
            setErrorMsg(null);
            nextRound();
          }, 700);
        }
      }
    } finally {
      setPlayBusy(false);
    }
  }

  async function togglePlay() {
    if (!track || phase !== "play" || playBusy) return;
    if (playing) {
      stopAudio();
      return;
    }
    const secs = resolved ? null : unlocked;
    await playSnippet(secs);
  }

  function startPlay() {
    if (!track || phase !== "play" || playBusy || playing || resolved) return;
    playSnippet(unlocked);
  }

  function onVinylScrubStart() {
    setScrubbing(true);
    pause();
    setPlaying(false);
    setPlayBusy(false);
  }

  function onVinylScrubEnd() {
    setScrubbing(false);
  }

  // Skip only: unlock more audio, or lose the round when steps are exhausted.
  function consumeGuess() {
    const nextNum = guessNum + 1;
    if (nextNum >= MAX_GUESSES) {
      setOutcome("lose");
      playSnippet(null); // full preview until next song
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

    setTitleGuess("");
    stopAudio();

    // Correct artist = small bonus + locks the field. Title still pays full.
    let artistPts = 0;
    if (artistOk && !artistBonusTaken) {
      const locked = (track.artists || []).join(", ");
      artistPts = ARTIST_BONUS;
      setArtistBonusTaken(true);
      setRevealedArtist(locked);
      setArtistGuess("");
      setBonus(artistPts);
      setScore((s) => s + artistPts);
    } else if (!artistBonusTaken) {
      setArtistGuess("");
    }

    if (win) {
      const titlePts = titlePointsForGuess(guessNum, hintUsed);
      setEarnedPts(titlePts + artistPts);
      setScore((s) => s + titlePts);
      setOutcome("win");
      setCelebrate(true);
      fireConfetti("title");
      playSnippet(null); // full preview until next song
    } else {
      // Unlimited guesses — only Skip unlocks more audio / ends the round.
      if (!artistOk) shakeEl(rootRef.current);
      if (artistPts) setEarnedPts(artistPts);
    }
  }

  function skip() {
    if (phase !== "play" || resolved) return;
    setTitleGuess("");
    if (!revealedArtist) setArtistGuess("");
    stopAudio();
    consumeGuess();
  }

  function applyTitleHint() {
    if (phase !== "play" || resolved || !track?.name) return;
    if (guessNum < HINT_AFTER_SKIPS) return;
    if (!hintUsed) setHintUsed(true);
    setTitleHintText(titleHintMask(track.name));
  }

  function nextRound() {
    stopAudio();
    setErrorMsg(null);
    if (roundIdx + 1 >= rounds.length) {
      setPhase("over");
      return;
    }
    setRoundIdx((i) => i + 1);
    resetInRound();
  }

  function restart() {
    onExit();
  }

  function playAgain() {
    if (onReplay) onReplay();
    else window.location.reload();
  }

  useEffect(() => {
    if (phase === "over") fireConfetti("victory");
  }, [phase]);

  const maxScore = rounds.length * ROUND_MAX_POINTS;
  const spinning = (playing || celebrate) && !scrubbing;

  return (
    <div
      ref={rootRef}
      className={`game mp-board mp-board--solo ${outcome === "win" ? "game--win" : ""} ${outcome === "lose" ? "game--lose" : ""}`}
    >
      <div className="mp-board-main">
        <div className="game-head">
          <button className="btn btn-mini" onClick={onExit}>
            ← change playlist
          </button>
          <div className="scoreboard">
            <span className="scoreboard-label">solo</span>
            <span className="scoreboard-value">{playlist.name}</span>
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
            <PlayerRail
              players={players}
              unlockByPlayer={{ [YOU_ID]: guessNum }}
            />

            <GuessMedia
              mode="vinyl"
              revealed={resolved}
              spinning={spinning}
              celebrate={celebrate}
              cover={track.cover}
              title={track.name}
              artist={(track.artists || []).join(", ")}
              canControl={canControl}
              interactive={canControl}
              vinylTitle={
                canControl
                  ? playing
                    ? "click to pause · drag to scrub"
                    : "click to play · drag to scrub"
                  : undefined
              }
              onTogglePlay={togglePlay}
              onScrubStart={onVinylScrubStart}
              onScrubEnd={onVinylScrubEnd}
            />

            {outcome === "win" && (
              <div key={`badge-${roundIdx}`} className="inline-badge inline-badge--win">
                NAILED IT
              </div>
            )}
            {outcome === "lose" && (
              <div className="inline-badge inline-badge--lose">MISSED</div>
            )}

            {errorMsg && !resolved && (
              <div className="error-banner">{errorMsg}</div>
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
                  <span className="btn-play-icon" aria-hidden="true" />
                  {roundIdx + 1 >= rounds.length ? "see results →" : "next song →"}
                </button>
              </div>
            ) : (
              <div className="guess-input-wrap">
                <div className="guess-fields">
                  <div className="guess-title-row">
                    <div className="guess-title-field">
                      <input
                        className={`guess-input${titleHintText ? " guess-input--hint" : ""}`}
                        placeholder={titleHintText || "song title…"}
                        value={titleGuess}
                        onChange={(e) => setTitleGuess(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && submitGuess()}
                      />
                      {guessNum >= HINT_AFTER_SKIPS && (
                        <button
                          type="button"
                          className="guess-hint-link"
                          onClick={applyTitleHint}
                          aria-label={`Reveal title hint (−${HINT_PENALTY})`}
                        >
                          hint · −{HINT_PENALTY}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="guess-artist-row">
                    <input
                      className="guess-input"
                      placeholder="artist…"
                      value={revealedArtist || artistGuess}
                      disabled={!!revealedArtist}
                      onChange={(e) => setArtistGuess(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submitGuess()}
                    />
                    <GuessTransport
                      playing={playing}
                      busy={playBusy}
                      canPlay={canControl && !resolved}
                      playLabel={`Play ${unlocked}s`}
                      onPlay={startPlay}
                      onPause={stopAudio}
                    />
                  </div>
                </div>
                <div className="guess-actions">
                  <button className="btn btn-skip" onClick={skip}>
                    <span className="btn-label">skip</span>
                    <span className="btn-hint">+audio · −{SKIP_PENALTY}</span>
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
            <PlayerRail players={players} />
            <div className="gameover-actions">
              <ShareScoreButton mode="solo" score={score} maxScore={maxScore} />
              <button className="btn btn-big btn-play" onClick={playAgain}>
                play again
              </button>
              <button className="btn btn-ghost" onClick={restart}>
                pick another playlist
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
