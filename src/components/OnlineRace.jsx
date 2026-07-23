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

/** Lobby name pools by archetype — mix lengths + styles so it doesn't read generated. */
const NAME_ARCHETYPES = {
  compounds: [
    "lampmoth", "dampsocks", "wetcardboard", "gravyboat", "softserve",
    "tinfoilhat", "mosscovered", "quietstorm", "brickwall", "papercut",
  ],
  numbered: [
    "kian04", "noodle07", "marlo23", "zaine17", "obie06",
    "tam0k", "vex21", "rhys09", "juno12", "cass88",
  ],
  stylized: [
    "kaii", "jvnior", "syyd", "mattr", "nikaa",
    "roshhh", "drewww", "elll", "beniii", "aris_",
  ],
  ironic: [
    "notdrake", "certifiedyapper", "localmenace", "mildlyhungry", "guyfromthebus",
    "professionalliar", "tunnelvision", "spotifywrapped2019", "sorryimlate", "thirdplace",
  ],
  short: ["oz", "jnk", "vrm", "dux", "kro"],
  underscore: ["_slugbait", "x_hollow", "bean_", "__rue", "low_res"],
  caps: [
    "SilentJoy", "PaperTiger", "BlueHourGlass", "NorthFacing", "TapeDeck",
    "Vagrant", "MidnightRun", "GhostOfTuesday", "SlowBurn", "Ferro",
  ],
  camel: [
    "ZaneRuns", "KiraPlays", "MattOnMic", "AceOfLows", "RyeBread",
    "TheRealOtis", "JustNoahThings", "CallMeVee", "DevWithADream", "NotYourGuy",
  ],
  // Spaces / periods / birth years — strong “real person” signal. Cap 1–2 per lobby.
  dad: [
    "Greg_Sullivan", "David Holt", "Paul.Mercer", "AndrewJTan", "SteveWilkinson",
    "MartinB", "Chris O'Dea", "RobertLeung", "TonyMcGrath", "Ian_Fraser",
    "DaveM1968", "Karen_1972", "Mike74", "JenniferA1969", "Rick_1965",
    "PeterK1971", "Sue1970", "GaryW66", "Lisa_M_1973", "BigMike62",
    "GregFishes", "DadOfThree", "GolfDad74", "Coach_Reilly", "PapaBear1967",
    "SundayCyclist", "HandymanHal", "Grillmaster_Ken", "BBQ_Bruce", "RetiredRon",
  ],
};

const NON_DAD_KEYS = [
  "compounds",
  "numbered",
  "stylized",
  "ironic",
  "short",
  "underscore",
  "caps",
  "camel",
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function hasNumberSuffix(name) {
  return /\d/.test(name);
}

/**
 * Build a lobby roster: mix archetypes + lengths, ≤2 dad names, ≤2 number-ish
 * handles, always at least one short handle and ≥3 archetypes.
 */
function pickLobbyNames(count = 5) {
  const used = new Set();
  const picked = [];
  const archetypesUsed = new Set();
  let dadCount = 0;
  let numberishCount = 0;

  function takeFrom(key, { require = false } = {}) {
    const pool = shuffle(
      (NAME_ARCHETYPES[key] || []).filter((n) => !used.has(n.toLowerCase()))
    );
    for (const name of pool) {
      const numberish = hasNumberSuffix(name);
      if (numberish && numberishCount >= 2) continue;
      if (key === "dad" && dadCount >= 2) continue;
      used.add(name.toLowerCase());
      picked.push(name);
      archetypesUsed.add(key);
      if (key === "dad") dadCount += 1;
      if (numberish) numberishCount += 1;
      return true;
    }
    if (require) {
      // Fallback: any unused name from this pool ignoring soft caps.
      const any = (NAME_ARCHETYPES[key] || []).find((n) => !used.has(n.toLowerCase()));
      if (any) {
        used.add(any.toLowerCase());
        picked.push(any);
        archetypesUsed.add(key);
        if (key === "dad") dadCount += 1;
        if (hasNumberSuffix(any)) numberishCount += 1;
        return true;
      }
    }
    return false;
  }

  // Always: one short handle + one dad (spaces/years sell the lobby).
  takeFrom("short", { require: true });
  if (count >= 3) takeFrom("dad", { require: true });

  // Fill from shuffled non-dad archetypes so we hit ≥3 groups.
  const restKeys = shuffle(NON_DAD_KEYS.filter((k) => k !== "short"));
  let guard = 0;
  while (picked.length < count && guard++ < 80) {
    // Prefer unused archetypes until we have three.
    const preferFresh = archetypesUsed.size < 3;
    const keys = preferFresh
      ? [...restKeys.filter((k) => !archetypesUsed.has(k)), ...restKeys]
      : restKeys;
    let got = false;
    for (const key of keys) {
      if (picked.length >= count) break;
      if (takeFrom(key)) {
        got = true;
        break;
      }
    }
    if (!got) {
      // Last resort: any remaining name from any pool.
      const all = shuffle(
        Object.values(NAME_ARCHETYPES)
          .flat()
          .filter((n) => !used.has(n.toLowerCase()))
      );
      const name = all[0];
      if (!name) break;
      used.add(name.toLowerCase());
      picked.push(name);
    }
  }

  return shuffle(picked).slice(0, count);
}

function makeOpponents(count = 5) {
  const names = pickLobbyNames(count);
  return names.map((name, i) => {
    const avatar = normalizeAvatar(
      randomAvatar(),
      PLAYER_COLORS[(i + 1) % PLAYER_COLORS.length]
    );
    return {
      id: `op-${i}-${name.replace(/\s+/g, "_")}`,
      name,
      avatar,
      color: avatar.color,
      score: 0,
      wins: 0,
      connected: true,
      left: false,
      // Keep them beatable — low/mid skill only.
      skill: 0.1 + Math.random() * 0.35,
    };
  });
}

/**
 * Chart race that looks like live multiplayer. Opponents are local stand-ins —
 * never advertised as bots in the UI.
 */
export default function OnlineRace({ profile, onExit }) {
  const youName = profile?.name?.trim().slice(0, 16) || "you";
  const youAvatar = useMemo(
    () => normalizeAvatar(profile?.avatar || randomAvatar(), PLAYER_COLORS[0]),
    [profile?.avatar?.peep, profile?.avatar?.color]
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
    const opponents = makeOpponents(5);
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

        // Pause before anyone else shows up — feels less instant.
        await new Promise((res) => setTimeout(res, 900 + Math.random() * 700));
        if (cancelled) return;

        // Stagger “joins”
        for (let i = 0; i < opponents.length; i++) {
          await new Promise((res) => setTimeout(res, 1400 + Math.random() * 2200));
          if (cancelled) return;
          const op = opponents[i];
          setPlayers((prev) => [...prev, op]);
          setMatchStatus(
            i === opponents.length - 1 ? "starting…" : `${op.name} joined`
          );
        }
        await new Promise((res) => setTimeout(res, 1100 + Math.random() * 500));
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
      // Slower + more misses — leave room for the human to win.
      const artistAt = (9000 + (1 - skill) * 16000) * (0.9 + Math.random() * 0.45);
      const titleAt = (16000 + (1 - skill) * 24000) * (0.9 + Math.random() * 0.5);

      const tArtist = setTimeout(() => {
        if (roundKeyRef.current !== key) return;
        // Often skip the artist race entirely.
        if (Math.random() > 0.22 + skill * 0.28) return;
        claimArtist(op, track);
      }, artistAt);

      const tTitle = setTimeout(() => {
        if (roundKeyRef.current !== key) return;
        // Frequently whiff the first title attempt.
        if (Math.random() > 0.18 + skill * 0.35) {
          const retry = setTimeout(() => {
            if (roundKeyRef.current !== key) return;
            if (phaseRef.current !== "play") return;
            if (Math.random() > 0.35 + skill * 0.4) return; // may never get it
            claimTitle(op, track, 0);
          }, 8000 + Math.random() * 10000);
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

        <PlayerRail
          players={players}
          pulseId={lastGuesser?.playerId}
          winnerId={winnerId}
          unlockByPlayer={{ [youId]: myStep }}
        />

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
