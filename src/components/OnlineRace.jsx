import { useEffect, useMemo, useRef, useState } from "react";
import { isCorrect, matchesAnyArtist } from "../match.js";
import { usePreviewPlayer } from "../usePreviewPlayer.js";
import { fireConfetti, shakeEl } from "../fx.js";
import GuessMedia from "./GuessMedia.jsx";
import PlayerRail from "../multiplayer/PlayerRail.jsx";
import GuessPopups from "../multiplayer/GuessPopups.jsx";
import {
  STEPS,
  MAX_GUESSES,
  TOTAL,
  ROUND_COUNT,
  titlePointsForGuess,
  ARTIST_BONUS,
  randomAvatar,
  normalizeAvatar,
  PLAYER_COLORS,
} from "../multiplayer/constants.js";

const HOT_TAGS = ["pop", "hip-hop", "rnb", "2010s", "k-pop", "afrobeats", "latin", "indie"];

const OPPONENT_NAMES = [
  "mila",
  "jay",
  "nova",
  "kai",
  "remy",
  "zoe",
  "ash",
  "leo",
  "iris",
  "nate",
  "suki",
  "omar",
  "bea",
  "finn",
  "lux",
  "aria",
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickName(used) {
  const pool = shuffle(OPPONENT_NAMES.filter((n) => !used.has(n)));
  return pool[0] || `p${Math.floor(Math.random() * 90) + 10}`;
}

function makeOpponents(count = 3) {
  const used = new Set();
  const out = [];
  for (let i = 0; i < count; i++) {
    const name = pickName(used);
    used.add(name);
    const avatar = normalizeAvatar(randomAvatar(), PLAYER_COLORS[(i + 1) % PLAYER_COLORS.length]);
    out.push({
      id: `op-${i}-${name}`,
      name,
      avatar,
      color: avatar.color,
      score: 0,
      wins: 0,
      connected: true,
      left: false,
      skill: 0.35 + Math.random() * 0.55,
    });
  }
  return out;
}

/**
 * Chart race that looks like live multiplayer. Opponents are local stand-ins —
 * never advertised as bots in the UI.
 */
export default function OnlineRace({ me, onExit }) {
  const youName = me?.displayName?.split(/\s+/)[0]?.slice(0, 16) || "you";
  const youAvatar = useMemo(
    () => normalizeAvatar(randomAvatar(), PLAYER_COLORS[0]),
    []
  );
  const youId = "you";

  const [phase, setPhase] = useState("matching"); // matching | play | reveal | over
  const [loadError, setLoadError] = useState(null);
  const [playlistName, setPlaylistName] = useState("charts");
  const [rounds, setRounds] = useState([]);
  const [players, setPlayers] = useState(() => [
    {
      id: youId,
      name: youName,
      avatar: youAvatar,
      color: youAvatar.color,
      score: 0,
      wins: 0,
      connected: true,
      left: false,
      isHost: true,
    },
  ]);
  const [matchStatus, setMatchStatus] = useState("finding a room…");

  const [roundIdx, setRoundIdx] = useState(0);
  const [myStep, setMyStep] = useState(0);
  const [guesses, setGuesses] = useState([]);
  const [outcome, setOutcome] = useState(null);
  const [winnerId, setWinnerId] = useState(null);
  const [earnedPts, setEarnedPts] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [revealedArtist, setRevealedArtist] = useState(null);
  const [artistClaimedBy, setArtistClaimedBy] = useState(null);
  const [titleGuess, setTitleGuess] = useState("");
  const [artistGuess, setArtistGuess] = useState("");
  const [localPlaying, setLocalPlaying] = useState(false);
  const [playBusy, setPlayBusy] = useState(false);

  const { errorMsg, play, pause } = usePreviewPlayer();
  const rootRef = useRef(null);
  const phaseRef = useRef(phase);
  const timersRef = useRef([]);
  const artistClaimedRef = useRef(null);
  const roundKeyRef = useRef(0);

  phaseRef.current = phase;
  artistClaimedRef.current = artistClaimedBy;

  const track = rounds[roundIdx];
  const unlocked = STEPS[Math.min(myStep, MAX_GUESSES - 1)];
  const revealed = phase === "reveal";
  const spinning = localPlaying && (phase === "play" || phase === "reveal");

  function clearTimers() {
    for (const t of timersRef.current) clearTimeout(t);
    timersRef.current = [];
  }

  function stopAudio() {
    pause();
    setLocalPlaying(false);
    setPlayBusy(false);
  }

  async function playSnippet(seconds) {
    if (!track) return;
    pause();
    setLocalPlaying(false);
    setPlayBusy(true);
    try {
      await play(track, seconds, { onStop: () => setLocalPlaying(false) });
      setLocalPlaying(true);
    } catch {
      setLocalPlaying(false);
    } finally {
      setPlayBusy(false);
    }
  }

  function togglePlay() {
    if (!track || playBusy) return;
    if (localPlaying) {
      stopAudio();
      return;
    }
    playSnippet(phase === "reveal" ? null : unlocked);
  }

  // Matchmaking + chart load
  useEffect(() => {
    let cancelled = false;
    const opponents = makeOpponents(3);
    const tag = HOT_TAGS[Math.floor(Math.random() * HOT_TAGS.length)];

    (async () => {
      try {
        setMatchStatus("finding a room…");
        const r = await fetch(`/api/charts?tag=${encodeURIComponent(tag)}&limit=30`);
        if (!r.ok) throw new Error("charts");
        const data = await r.json();
        if (cancelled) return;
        const tracks = shuffle(data.tracks || []).slice(
          0,
          Math.min(ROUND_COUNT, (data.tracks || []).length)
        );
        if (tracks.length < 2) throw new Error("short");
        setRounds(tracks);
        setPlaylistName(data.name || "today’s charts");

        // Stagger “joins”
        for (let i = 0; i < opponents.length; i++) {
          await new Promise((res) => setTimeout(res, 420 + Math.random() * 520));
          if (cancelled) return;
          const op = opponents[i];
          setPlayers((prev) => [...prev, op]);
          setMatchStatus(
            i === opponents.length - 1 ? "starting…" : `${op.name} joined`
          );
        }
        await new Promise((res) => setTimeout(res, 600));
        if (cancelled) return;
        setPhase("play");
      } catch {
        if (!cancelled) {
          setLoadError("Couldn’t find a room right now — try again in a sec.");
        }
      }
    })();

    return () => {
      cancelled = true;
      clearTimers();
      stopAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto full preview on reveal
  useEffect(() => {
    if (phase !== "reveal" || !track) return;
    playSnippet(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, roundIdx]);

  function bumpScore(playerId, pts) {
    if (!pts) return;
    setPlayers((prev) =>
      prev.map((p) => (p.id === playerId ? { ...p, score: p.score + pts } : p))
    );
  }

  function bumpWins(playerId) {
    setPlayers((prev) =>
      prev.map((p) => (p.id === playerId ? { ...p, wins: p.wins + 1 } : p))
    );
  }

  function endRoundLose() {
    clearTimers();
    setOutcome("lose");
    setWinnerId(null);
    setEarnedPts(0);
    setBonus(0);
    setPhase("reveal");
  }

  function endRoundWin(player, titlePts, artistPts) {
    clearTimers();
    const earned = titlePts + artistPts;
    bumpScore(player.id, titlePts);
    bumpWins(player.id);
    setOutcome("win");
    setWinnerId(player.id);
    setEarnedPts(earned);
    setBonus(artistPts);
    setPhase("reveal");
    if (player.id === youId) fireConfetti("title");
  }

  function claimArtist(player, trackRef) {
    if (phaseRef.current !== "play") return false;
    if (artistClaimedRef.current) return false;
    const artists = trackRef.artists || [];
    const label = artists.join(", ");
    artistClaimedRef.current = player.id;
    setArtistClaimedBy(player.id);
    setRevealedArtist(label);
    bumpScore(player.id, ARTIST_BONUS);
    setGuesses((g) => [
      ...g,
      {
        playerId: player.id,
        name: player.name,
        color: player.color,
        avatar: player.avatar,
        title: null,
        artist: label,
        titleOk: false,
        artistOk: true,
        win: false,
        artistPts: ARTIST_BONUS,
      },
    ]);
    return true;
  }

  function claimTitle(player, trackRef, artistPtsJustNow = 0) {
    if (phaseRef.current !== "play") return;
    const artistWasClaimed = !!artistClaimedRef.current;
    const titlePts = titlePointsForGuess({ artistAlreadyClaimed: artistWasClaimed });
    setGuesses((g) => [
      ...g,
      {
        playerId: player.id,
        name: player.name,
        color: player.color,
        avatar: player.avatar,
        title: trackRef.name,
        artist: artistWasClaimed ? (trackRef.artists || []).join(", ") : null,
        titleOk: true,
        artistOk: false,
        win: true,
        artistPts: artistPtsJustNow,
      },
    ]);
    endRoundWin(player, titlePts, artistPtsJustNow);
  }

  // Schedule opponents for the current round
  useEffect(() => {
    if (phase !== "play" || !track) return;
    clearTimers();
    const key = ++roundKeyRef.current;
    const ops = players.filter((p) => p.id !== youId && p.skill != null);

    for (const op of ops) {
      const skill = op.skill;
      // Faster / smarter opponents guess sooner.
      const artistAt = (3500 + (1 - skill) * 9000) * (0.85 + Math.random() * 0.35);
      const titleAt = (7000 + (1 - skill) * 14000) * (0.85 + Math.random() * 0.4);

      const tArtist = setTimeout(() => {
        if (roundKeyRef.current !== key) return;
        if (Math.random() > 0.55 + skill * 0.35) return; // sometimes miss the artist window
        claimArtist(op, track);
      }, artistAt);

      const tTitle = setTimeout(() => {
        if (roundKeyRef.current !== key) return;
        if (Math.random() > 0.4 + skill * 0.5) {
          // Weak miss — maybe try again later
          const retry = setTimeout(() => {
            if (roundKeyRef.current !== key) return;
            if (phaseRef.current !== "play") return;
            claimTitle(op, track, 0);
          }, 5000 + Math.random() * 6000);
          timersRef.current.push(retry);
          return;
        }
        claimTitle(op, track, 0);
      }, titleAt);

      timersRef.current.push(tArtist, tTitle);
    }

    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, roundIdx, track?.id]);

  function submitGuess() {
    if (phase !== "play" || !track) return;
    const title = titleGuess.trim();
    const artist = artistGuess.trim();
    if (!title && !artist) return;

    const artistWasClaimed = !!artistClaimedRef.current;
    const titleOk = title ? isCorrect(title, track.name) : false;
    const artistOk =
      !artistWasClaimed && artist
        ? matchesAnyArtist(artist, track.artists)
        : false;
    const you = players.find((p) => p.id === youId);
    if (!you) return;

    setTitleGuess("");
    setArtistGuess("");
    stopAudio();

    let artistPts = 0;
    if (artistOk) {
      claimArtist(you, track);
      artistPts = ARTIST_BONUS;
    }

    // Artist-only success already logged in claimArtist; add a row for title / misses.
    if (titleOk || !artistOk) {
      setGuesses((g) => [
        ...g,
        {
          playerId: youId,
          name: youName,
          color: youAvatar.color,
          avatar: youAvatar,
          title: title || null,
          artist: artistOk ? (track.artists || []).join(", ") : artist || null,
          titleOk,
          artistOk,
          win: titleOk,
          artistPts: titleOk ? artistPts : 0,
        },
      ]);
    }

    if (titleOk) {
      const titlePts = titlePointsForGuess({ artistAlreadyClaimed: artistWasClaimed });
      endRoundWin(you, titlePts, artistPts);
      return;
    }

    if (!artistOk) shakeEl(rootRef.current);
  }

  function skip() {
    if (phase !== "play") return;
    stopAudio();
    setTitleGuess("");
    setArtistGuess("");
    if (myStep < MAX_GUESSES - 1) {
      setMyStep((s) => s + 1);
    } else {
      endRoundLose();
    }
  }

  function nextRound() {
    stopAudio();
    clearTimers();
    if (roundIdx + 1 >= rounds.length) {
      setPhase("over");
      fireConfetti("victory");
      return;
    }
    setRoundIdx((i) => i + 1);
    setMyStep(0);
    setGuesses([]);
    setOutcome(null);
    setWinnerId(null);
    setEarnedPts(0);
    setBonus(0);
    setRevealedArtist(null);
    setArtistClaimedBy(null);
    artistClaimedRef.current = null;
    setTitleGuess("");
    setArtistGuess("");
    setPhase("play");
  }

  // ---- matching / error ----
  if (loadError) {
    return (
      <div className="mp-lobby online-race">
        <button className="btn btn-mini mp-back" onClick={onExit}>
          ← back
        </button>
        <div className="error-banner">{loadError}</div>
        <button className="btn btn-big btn-play" onClick={onExit}>
          back home
        </button>
      </div>
    );
  }

  if (phase === "matching") {
    return (
      <div className="mp-lobby online-race online-race--match">
        <button className="btn btn-mini mp-back" onClick={onExit}>
          ← leave
        </button>
        <h2 className="online-race-title">play online</h2>
        <p className="online-race-status">{matchStatus}</p>
        <PlayerRail players={players} />
        <p className="fineprint">today’s charts · first to name it wins</p>
      </div>
    );
  }

  // ---- game over ----
  if (phase === "over") {
    const ranked = [...players].sort((a, b) => b.score - a.score);
    const mine = ranked.find((p) => p.id === youId);
    const place = ranked.findIndex((p) => p.id === youId) + 1;
    return (
      <div className="mp-over">
        <h2>race over</h2>
        <p>
          You finished <strong>#{place}</strong> with <strong>{mine?.score ?? 0}</strong> pts.
        </p>
        <ol className="mp-final">
          {ranked.map((p, i) => (
            <li key={p.id} className={p.id === youId ? "me" : ""}>
              <span className="mp-final-place">{i + 1}</span>
              <span className="mp-final-name">{p.id === youId ? "you" : p.name}</span>
              <span className="mp-final-score">{p.score}</span>
            </li>
          ))}
        </ol>
        <div className="gameover-actions">
          <button className="btn btn-big btn-play" onClick={onExit}>
            back home
          </button>
        </div>
      </div>
    );
  }

  const lastGuesser = guesses[guesses.length - 1];
  const winnerName =
    players.find((p) => p.id === winnerId)?.name ||
    (winnerId === youId ? "you" : "someone");

  return (
    <div className="game mp-host mp-board online-race" ref={rootRef}>
      <div className="mp-board-main">
        <div className="game-head">
          <button className="btn btn-mini" onClick={onExit}>
            ← leave race
          </button>
          <div className="scoreboard">
            <span className="scoreboard-label">live</span>
            <span className="scoreboard-value">online</span>
          </div>
        </div>

        <div className="now-playing">
          <span className="np-playlist">{playlistName}</span>
          <span className="np-round">
            record {roundIdx + 1} / {rounds.length}
          </span>
        </div>

        <PlayerRail players={players} pulseId={lastGuesser?.playerId} winnerId={winnerId} />

        <GuessMedia
          mode="vinyl"
          revealed={revealed}
          spinning={spinning}
          cover={track?.cover}
          title={track?.name}
          artist={(track?.artists || []).join(", ")}
          canControl={!!track}
          interactive={!!track}
          vinylTitle="play / pause · drag to scrub"
          onTogglePlay={togglePlay}
          onScrubStart={stopAudio}
        />

        {revealed && outcome === "win" && (
          <div className="inline-badge inline-badge--win">
            {winnerId === youId ? "you" : winnerName} NAILED IT
          </div>
        )}
        {revealed && outcome === "lose" && (
          <div className="inline-badge inline-badge--lose">NOBODY GOT IT</div>
        )}

        <div className="progress">
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${((revealed ? TOTAL : unlocked) / TOTAL) * 100}%` }}
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
              {revealed
                ? "revealed"
                : `${unlocked}s unlocked · 0:${String(TOTAL).padStart(2, "0")}`}
            </span>
          </div>
        </div>

        {phase === "play" && (
          <div className="controls">
            {errorMsg && <div className="error-banner">{errorMsg}</div>}
            <button
              className="btn btn-big btn-play"
              onClick={togglePlay}
              disabled={playBusy}
            >
              <span
                className={localPlaying ? "btn-pause-icon" : "btn-play-icon"}
                aria-hidden="true"
              />
              {playBusy
                ? "starting…"
                : localPlaying
                  ? "pause"
                  : `play ${unlocked}s`}
            </button>
          </div>
        )}

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
                value={revealedArtist || artistGuess}
                disabled={!!revealedArtist}
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
                <span className="btn-hint">enter</span>
              </button>
            </div>
          </div>
        )}

        {revealed && track && (
          <div className="inline-reveal">
            <div className="reveal">
              <div className="reveal-art">
                {track.cover && (
                  <img src={track.cover} alt="" className="reveal-cover" />
                )}
              </div>
              <div className="reveal-text">
                <span className="reveal-title">{track.name}</span>
                <span className="reveal-artist">
                  {(track.artists || []).join(", ")}
                </span>
                {outcome === "win" && (
                  <span className="reveal-points">
                    +{earnedPts} pts
                    {bonus ? " · artist bonus!" : ""}
                    {winnerId === youId ? " · you!" : ""}
                  </span>
                )}
              </div>
            </div>
            <button className="btn btn-big btn-play" onClick={nextRound}>
              <span className="btn-play-icon" aria-hidden="true" />
              {roundIdx + 1 >= rounds.length ? "see results →" : "next song →"}
            </button>
          </div>
        )}
      </div>

      <GuessPopups guesses={guesses} myId={youId} />
    </div>
  );
}
