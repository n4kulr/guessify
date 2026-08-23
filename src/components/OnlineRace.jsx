import { useEffect, useMemo, useRef, useState } from "react";
import { isCorrect, matchesAnyArtist, isAlmost, isAlmostAnyArtist } from "../match.js";
import { usePreviewPlayer } from "../usePreviewPlayer.js";
import { fireConfetti, shakeEl } from "../fx.js";
import GuessMedia from "./GuessMedia.jsx";
import GuessSuggest, { useGuessSuggest } from "./GuessSuggest.jsx";
import GuessTransport from "./GuessTransport.jsx";
import ShareScoreButton from "./ShareScoreButton.jsx";
import ScrubbableVinyl from "./ScrubbableVinyl.jsx";
import PenaltyPop from "./PenaltyPop.jsx";
import AlmostFlash from "./AlmostFlash.jsx";
import GameOverStats from "./GameOverStats.jsx";
import PlayerRail from "../multiplayer/PlayerRail.jsx";
import GuessPopups from "../multiplayer/GuessPopups.jsx";
import { isNoPreviewError } from "../shareScore.js";
import { nextSpareTrack } from "../deadPreview.js";
import {
  isAudioWarm,
  warmAudioUrl,
  warmTrackPreview,
  patchRoundsPreview,
} from "../previewWarm.js";
import { titleHintMask, displayTitle } from "../titleHint.js";
import { useAutoTitleHint } from "../useAutoTitleHint.js";
import { computeGameStats } from "../gameStats.js";
import { recordPlaylistScore } from "../playlistBests.js";
import { isFastTest, FAST_ROUND_LOG } from "../fastTest.js";
import { useDebugActions } from "../debugRegistry.js";
import {
  STEPS,
  MAX_GUESSES,
  TOTAL,
  ROUND_COUNT,
  titlePointsForGuess,
  timedTitlePoints,
  TITLE_POINTS,
  TIMED_ROUND_MS,
  ARTIST_BONUS,
  SKIP_PENALTY,
  randomAvatar,
  normalizeAvatar,
  PLAYER_COLORS,
  nextVotesNeeded,
  activePlayerCount,
  allPlayersMaxUnlocked,
  normalizeRaceMode,
} from "../multiplayer/constants.js";
import { TimedCountdown } from "../multiplayer/TimedHud.jsx";

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

function makeOpponents(count = 3, reservedColors = []) {
  const names = pickLobbyNames(count);
  const taken = new Set(
    reservedColors
      .filter((c) => typeof c === "string")
      .map((c) => c.toLowerCase())
  );
  const free = shuffle(
    PLAYER_COLORS.filter((c) => !taken.has(c.toLowerCase()))
  );
  // Prefer unused swatches; wrap only if the lobby is bigger than the palette.
  const colors =
    free.length >= count
      ? free.slice(0, count)
      : [...free, ...shuffle(PLAYER_COLORS)].slice(0, count);

  return names.map((name, i) => {
    const color = colors[i];
    const avatar = normalizeAvatar({ ...randomAvatar(), color }, color);
    return {
      id: `op-${i}-${name.replace(/\s+/g, "_")}`,
      name,
      avatar,
      color,
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
export default function OnlineRace({ profile, onExit, raceMode: raceModeProp }) {
  const youName = profile?.name?.trim().slice(0, 16) || "you";
  const youAvatar = useMemo(
    () => normalizeAvatar(profile?.avatar || randomAvatar(), PLAYER_COLORS[0]),
    [profile?.avatar?.peep, profile?.avatar?.color]
  );
  const youId = "you";
  const timed = normalizeRaceMode(raceModeProp) === "timed";

  const [phase, setPhase] = useState("matching"); // matching | play | reveal | over
  const [loadError, setLoadError] = useState(null);
  const [playlistName, setPlaylistName] = useState("charts");
  const [rounds, setRounds] = useState([]);
  const poolRef = useRef([]);
  const usedIdsRef = useRef(new Set());
  const replacingRef = useRef(false);
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
  const [unlockByPlayer, setUnlockByPlayer] = useState({ [youId]: 0 });
  const [guesses, setGuesses] = useState([]);
  const [nextVotes, setNextVotes] = useState({});
  const [outcome, setOutcome] = useState(null);
  const [winnerId, setWinnerId] = useState(null);
  const [earnedPts, setEarnedPts] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [revealedArtist, setRevealedArtist] = useState(null);
  const [artistClaimedBy, setArtistClaimedBy] = useState(null);
  const [artistByPlayer, setArtistByPlayer] = useState({});
  const [titleGuess, setTitleGuess] = useState("");
  const [artistGuess, setArtistGuess] = useState("");
  const [localPlaying, setLocalPlaying] = useState(false);
  const [playBusy, setPlayBusy] = useState(false);
  const [titleHintText, setTitleHintText] = useState("");
  const [skipPop, setSkipPop] = useState(null);
  const [almostTitle, setAlmostTitle] = useState(null);
  const [almostArtist, setAlmostArtist] = useState(null);
  const [roundLog, setRoundLog] = useState([]);
  const [roundResults, setRoundResults] = useState([]);
  const [playlistBests, setPlaylistBests] = useState(null);
  const [chartKey, setChartKey] = useState(null);
  const [cueReady, setCueReady] = useState(false);
  const [roundEndsAt, setRoundEndsAt] = useState(null);
  const [lockedInIds, setLockedInIds] = useState([]);
  const [timedPlaces, setTimedPlaces] = useState(null);
  const [solveTimes, setSolveTimes] = useState(null);

  const { errorMsg, setErrorMsg, play, pause, prime } = usePreviewPlayer();
  const rootRef = useRef(null);
  const skipWrapRef = useRef(null);
  const titleFieldRef = useRef(null);
  const phaseRef = useRef(phase);
  const timersRef = useRef([]);
  const artistClaimedRef = useRef(null);
  const artistByPlayerRef = useRef({});
  const roundKeyRef = useRef(0);
  const advancingRef = useRef(false);
  const roundStartedAt = useRef(Date.now());
  const submitGuessRef = useRef(() => {});
  const loggedRoundRef = useRef(-1);
  const roundSolvesRef = useRef({});
  const playersRef = useRef(players);
  const roundsRef = useRef(rounds);
  roundsRef.current = rounds;
  playersRef.current = players;

  phaseRef.current = phase;
  artistClaimedRef.current = artistClaimedBy;
  artistByPlayerRef.current = artistByPlayer;

  const track = rounds[roundIdx];
  const myRevealedArtist = timed
    ? artistByPlayer[youId] || null
    : revealedArtist;
  const myStep = unlockByPlayer[youId] ?? 0;
  const unlocked = STEPS[Math.min(myStep, MAX_GUESSES - 1)];
  const revealed = phase === "reveal";
  const spinning = localPlaying && (phase === "play" || phase === "reveal");
  const voteNeed = nextVotesNeeded(activePlayerCount(players));
  const voteHave = Object.keys(nextVotes).length;
  const iVotedNext = !!nextVotes[youId];
  const lockedIn = lockedInIds.includes(youId);
  const canSuggest = phase === "play" && !lockedIn;
  const roundArtists = track?.artists || [];
  const titleSuggest = useGuessSuggest({
    kind: "track",
    value: titleGuess,
    enabled: canSuggest,
    roundArtists,
    submitPick: (name) => submitGuessRef.current({ title: name }),
  });
  const artistSuggest = useGuessSuggest({
    kind: "artist",
    value: artistGuess,
    enabled: canSuggest && !myRevealedArtist,
    roundArtists,
    submitPick: (name) => submitGuessRef.current({ artist: name }),
  });

  function clearTimedRound() {
    roundSolvesRef.current = {};
    setLockedInIds([]);
    setTimedPlaces(null);
    setSolveTimes(null);
    setRoundEndsAt(null);
  }

  function armTimedClock() {
    if (!timed) {
      setRoundEndsAt(null);
      return;
    }
    setRoundEndsAt(Date.now() + TIMED_ROUND_MS);
  }

  function bumpUnlock(playerId) {
    setUnlockByPlayer((prev) => {
      const step = prev[playerId] ?? 0;
      if (step >= MAX_GUESSES - 1) return prev;
      return { ...prev, [playerId]: step + 1 };
    });
  }

  function clearTimers() {
    for (const t of timersRef.current) clearTimeout(t);
    timersRef.current = [];
  }

  function stopAudio() {
    pause();
    setLocalPlaying(false);
    setPlayBusy(false);
  }

  function resetInRound() {
    clearTimedRound();
    setUnlockByPlayer(() => {
      const next = {};
      for (const p of players) next[p.id] = 0;
      return next;
    });
    setGuesses([]);
    setNextVotes({});
    setOutcome(null);
    setWinnerId(null);
    setEarnedPts(0);
    setBonus(0);
    setRevealedArtist(null);
    setArtistClaimedBy(null);
    setArtistByPlayer({});
    artistClaimedRef.current = null;
    artistByPlayerRef.current = {};
    setTitleGuess("");
    setArtistGuess("");
    setTitleHintText("");
    setSkipPop(null);
    setAlmostTitle(null);
    setAlmostArtist(null);
    setPhase("play");
    roundStartedAt.current = Date.now();
    loggedRoundRef.current = -1;
    armTimedClock();
  }

  async function replaceDeadTrack(deadTrack) {
    if (replacingRef.current || phase !== "play") return false;
    replacingRef.current = true;
    try {
      const used = usedIdsRef.current;
      if (deadTrack?.id) used.add(deadTrack.id);
      for (;;) {
        const spare = nextSpareTrack(poolRef.current, used, deadTrack?.id);
        if (!spare) {
          return false;
        }
        used.add(spare.id);
        const url = await warmTrackPreview(spare);
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

  async function playSnippet(seconds) {
    if (!track) return;
    pause();
    setLocalPlaying(false);
    setPlayBusy(true);
    try {
      await play(track, seconds, { onStop: () => setLocalPlaying(false) });
      setLocalPlaying(true);
    } catch (e) {
      setLocalPlaying(false);
      if (isNoPreviewError(e) && phase === "play") {
        const ok = await replaceDeadTrack(track);
        if (!ok) {
          // Last resort: don't burn unlocks — end as a miss for the room.
          endRoundLose();
        }
      }
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

  function startPlay() {
    if (!track || playBusy || localPlaying || phase !== "play") return;
    playSnippet(unlocked);
  }

  // Cue current + keep one ahead (same as solo).
  useEffect(() => {
    if (phase !== "play" || !track?.id) return;
    let cancelled = false;
    (async () => {
      const hot = track.previewUrl && isAudioWarm(track.previewUrl);
      if (!hot) setCueReady(false);

      let url = track.previewUrl || null;
      if (url) await warmAudioUrl(url);
      else url = await warmTrackPreview(track);
      if (cancelled) return;

      if (!url) {
        const ok = await replaceDeadTrack(track);
        if (!cancelled && !ok) {
          setCueReady(true);
          endRoundLose();
        }
        return;
      }

      setRounds((rs) => patchRoundsPreview(rs, roundIdx, url));
      if (!cancelled) setCueReady(true);

      const nextIdx = roundIdx + 1;
      const next = roundsRef.current[nextIdx];
      if (!next || cancelled) return;
      const nurl = await warmTrackPreview(next);
      if (!cancelled && nurl) {
        setRounds((rs) => patchRoundsPreview(rs, nextIdx, nurl));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, track?.id, roundIdx]);

  // Matchmaking + chart load
  useEffect(() => {
    let cancelled = false;
    const opponents = makeOpponents(3, [youAvatar.color]);
    const tag = HOT_TAGS[Math.floor(Math.random() * HOT_TAGS.length)];

    (async () => {
      try {
        setMatchStatus("finding a room…");
        const r = await fetch(`/api/charts?tag=${encodeURIComponent(tag)}&limit=30`);
        if (!r.ok) throw new Error("charts");
        const data = await r.json();
        if (cancelled) return;
        const all = shuffle(data.tracks || []);
        const tracks = all.slice(0, Math.min(ROUND_COUNT, all.length));
        if (tracks.length < 2) throw new Error("short");
        poolRef.current = all;
        usedIdsRef.current = new Set(tracks.map((t) => t.id).filter(Boolean));

        // Prefetch while the lobby fake-fills so round 1 isn’t cold.
        setMatchStatus("cueing tracks…");
        const url0 = await warmTrackPreview(tracks[0]);
        if (url0) tracks[0] = { ...tracks[0], previewUrl: url0 };
        if (tracks[1]) {
          const url1 = await warmTrackPreview(tracks[1]);
          if (url1) tracks[1] = { ...tracks[1], previewUrl: url1 };
        }
        if (cancelled) return;

        setRounds(tracks);
        setPlaylistName(data.name || "today’s charts");
        setChartKey(`online:${tag}`);

        // Pause before anyone else shows up — feels less instant.
        setMatchStatus("finding a room…");
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
        roundStartedAt.current = Date.now();
        loggedRoundRef.current = -1;
        clearTimedRound();
        armTimedClock();
        setCueReady(Boolean(tracks[0]?.previewUrl && isAudioWarm(tracks[0].previewUrl)));
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
    if (phase !== "reveal" || !track || !cueReady) return;
    playSnippet(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, roundIdx, cueReady]);

  function bumpScore(playerId, pts) {
    if (!pts) return;
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === playerId ? { ...p, score: Math.max(0, p.score + pts) } : p
      )
    );
  }

  function bumpWins(playerId) {
    setPlayers((prev) =>
      prev.map((p) => (p.id === playerId ? { ...p, wins: p.wins + 1 } : p))
    );
  }

  function endRoundLose() {
    clearTimers();
    setNextVotes({});
    advancingRef.current = false;
    setOutcome("lose");
    setWinnerId(null);
    setEarnedPts(0);
    setBonus(0);
    setSolveTimes(null);
    setPhase("reveal");
  }

  function endRoundWin(player, titlePts, artistPts = 0) {
    clearTimers();
    setNextVotes({});
    advancingRef.current = false;
    bumpScore(player.id, titlePts);
    bumpWins(player.id);
    setOutcome("win");
    setWinnerId(player.id);
    setEarnedPts(titlePts + artistPts);
    setBonus(artistPts);
    setSolveTimes({
      [player.id]: Math.max(
        0,
        Date.now() - (roundStartedAt.current || Date.now())
      ),
    });
    setPhase("reveal");
    if (player.id === youId) fireConfetti("title");
  }

  // Personal round log + shared solve results when the round resolves.
  useEffect(() => {
    if (phase !== "reveal") return;
    if (loggedRoundRef.current === roundIdx) return;
    loggedRoundRef.current = roundIdx;
    const won = winnerId === youId;
    const wallMs =
      winnerId && roundStartedAt.current != null
        ? Date.now() - roundStartedAt.current
        : null;
    setRoundLog((prev) => [
      ...prev,
      {
        won,
        artistClaimed: artistClaimedBy === youId,
        wallMs: won ? wallMs : null,
        unlockStep: unlockByPlayer[youId] ?? 0,
        title: track?.name || null,
        artist: (track?.artists || []).join(", ") || null,
      },
    ]);
    if (winnerId && wallMs != null) {
      const w = players.find((p) => p.id === winnerId);
      setRoundResults((prev) => {
        const round = roundIdx + 1;
        if (prev.some((r) => r.round === round)) return prev;
        return [
          ...prev,
          {
            round,
            winnerId,
            winnerName: winnerId === youId ? youName : w?.name || "?",
            color: w?.color || w?.avatar?.color || youAvatar?.color,
            wallMs,
            title: track?.name || null,
            artist: (track?.artists || []).join(", ") || null,
            label: track?.name
              ? `${displayTitle(track.name)}${(track.artists || []).length ? ` · ${track.artists.join(", ")}` : ""}`
              : null,
          },
        ];
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, roundIdx, winnerId, artistClaimedBy, track?.id]);

  useEffect(() => {
    if (phase !== "over") return;
    const me = players.find((p) => p.id === youId);
    const id = chartKey || `online:${playlistName || "charts"}`;
    setPlaylistBests(
      recordPlaylistScore(id, playlistName || "Online race", me?.score ?? 0)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function claimArtist(player, trackRef) {
    if (phaseRef.current !== "play") return false;
    const artists = trackRef.artists || [];
    const label = artists.join(", ");
    if (timed) {
      if (artistByPlayerRef.current[player.id]) return false;
      artistByPlayerRef.current = {
        ...artistByPlayerRef.current,
        [player.id]: label,
      };
      setArtistByPlayer((prev) => ({ ...prev, [player.id]: label }));
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
    if (artistClaimedRef.current) return false;
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
    const skips = unlockByPlayer[player.id] ?? 0;
    const titlePts = titlePointsForGuess(skips);
    setGuesses((g) => [
      ...g,
      {
        playerId: player.id,
        name: player.name,
        color: player.color,
        avatar: player.avatar,
        title: trackRef.name,
        artist: artistByPlayerRef.current[player.id]
          ? (trackRef.artists || []).join(", ")
          : null,
        titleOk: true,
        artistOk: !!artistByPlayerRef.current[player.id],
        win: !timed,
        lockedIn: timed,
        artistPts: artistPtsJustNow,
      },
    ]);
    if (timed) {
      registerTimedSolve(player, titlePts);
      return;
    }
    endRoundWin(player, titlePts, artistPtsJustNow);
  }

  function registerTimedSolve(player, titlePts) {
    if (phaseRef.current !== "play") return;
    if (roundSolvesRef.current[player.id]) return;
    roundSolvesRef.current[player.id] = {
      wallMs: Math.max(0, Date.now() - (roundStartedAt.current || Date.now())),
      baseTitlePts: titlePts,
    };
    setLockedInIds(Object.keys(roundSolvesRef.current));
    if (player.id === youId) fireConfetti("title");
    maybeFinishTimedIfAllSolved();
  }

  function maybeFinishTimedIfAllSolved() {
    if (!timed || phaseRef.current !== "play") return;
    const roster = playersRef.current || [];
    const active = roster.filter((p) => p && !p.left && p.connected !== false);
    if (!active.length) return;
    if (active.every((p) => roundSolvesRef.current[p.id])) {
      finishTimedRound();
    }
  }

  function finishTimedRound() {
    if (phaseRef.current !== "play") return;
    clearTimers();
    setNextVotes({});
    advancingRef.current = false;
    setRoundEndsAt(null);

    const solves = roundSolvesRef.current;
    const ranked = Object.entries(solves)
      .map(([playerId, s]) => ({ playerId, ...s }))
      .sort((a, b) => a.wallMs - b.wallMs);

    const places = [];
    ranked.forEach((row, place) => {
      const player = (playersRef.current || []).find((p) => p.id === row.playerId);
      if (!player) return;
      // Timed: speed rank only (skips unlock audio, don't cut this payout).
      const titlePts = timedTitlePoints(TITLE_POINTS, place);
      bumpScore(player.id, titlePts);
      if (place === 0) bumpWins(player.id);
      places.push({
        playerId: row.playerId,
        name: player.name,
        color: player.color,
        avatar: player.avatar,
        place,
        wallMs: row.wallMs,
        titlePts,
      });
    });

    setTimedPlaces(places);
    setSolveTimes(
      places.length
        ? Object.fromEntries(places.map((p) => [p.playerId, p.wallMs]))
        : null
    );
    if (places.length) {
      setOutcome("win");
      setWinnerId(places[0].playerId);
      setEarnedPts(places[0].titlePts);
      setBonus(0);
    } else {
      setOutcome("lose");
      setWinnerId(null);
      setEarnedPts(0);
      setBonus(0);
    }
    setPhase("reveal");
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

      // Skip up to full unlock so a human who maxes out still waits on others.
      const skipCount = MAX_GUESSES - 1;
      for (let s = 0; s < skipCount; s++) {
        const skipAt = 1200 + s * (2400 + Math.random() * 2000) + Math.random() * 800;
        const tSkip = setTimeout(() => {
          if (roundKeyRef.current !== key) return;
          if (phaseRef.current !== "play") return;
          bumpUnlock(op.id);
        }, skipAt);
        timersRef.current.push(tSkip);
      }

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
            claimTitle(op, track);
          }, 8000 + Math.random() * 10000);
          timersRef.current.push(retry);
          return;
        }
        claimTitle(op, track);
      }, titleAt);

      timersRef.current.push(tArtist, tTitle);
    }

    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, roundIdx, track?.id]);

  // Timed wall clock — ends the round even if nobody locked in.
  useEffect(() => {
    if (!timed || phase !== "play" || !roundEndsAt) return;
    const delay = Math.max(0, roundEndsAt - Date.now());
    const t = setTimeout(() => finishTimedRound(), delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timed, phase, roundEndsAt, roundIdx]);

  function submitGuess(overrides = {}) {
    if (phase !== "play" || !track) return;
    const title = lockedIn
      ? ""
      : String(overrides.title !== undefined ? overrides.title : titleGuess).trim();
    const artist = String(
      overrides.artist !== undefined ? overrides.artist : artistGuess
    ).trim();
    if (!title && !artist) return;

    titleSuggest.dismiss();
    artistSuggest.dismiss();

    const artistWasClaimed = timed
      ? !!artistByPlayerRef.current[youId]
      : !!artistClaimedRef.current;
    const titleOk = title ? isCorrect(title, track.name) : false;
    const artistOk =
      !artistWasClaimed && artist
        ? matchesAnyArtist(artist, track.artists)
        : false;
    const titleAlmost = title && !titleOk && isAlmost(title, track.name);
    const artistAlmost =
      artist && !artistOk && !artistWasClaimed && isAlmostAnyArtist(artist, track.artists);
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

    // Locked artist stays green on later title tries (wrong → red title + green artist).
    const artistKnown = timed
      ? artistOk || !!artistByPlayerRef.current[youId]
      : artistOk || artistWasClaimed || !!artistClaimedRef.current;
    const artistLabel = artistKnown
      ? (track.artists || []).join(", ")
      : artist || null;

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
          artist: artistLabel,
          titleOk,
          artistOk: artistKnown,
          win: titleOk && !timed,
          lockedIn: titleOk && timed,
          artistPts: titleOk ? artistPts : 0,
        },
      ]);
    }

    if (titleOk) {
      const pts = titlePointsForGuess(myStep);
      if (timed) {
        registerTimedSolve(you, pts);
        return;
      }
      endRoundWin(you, pts, artistPts);
      return;
    }

    if (titleAlmost) setAlmostTitle(Date.now());
    if (artistAlmost) setAlmostArtist(Date.now());
    if (!artistOk && !titleAlmost && !artistAlmost) shakeEl(rootRef.current);
  }
  submitGuessRef.current = submitGuess;

  function skip() {
    if (phase !== "play") return;
    if (myStep >= MAX_GUESSES - 1) return;
    stopAudio();
    setTitleGuess("");
    setArtistGuess("");
    setSkipPop(Date.now());
    shakeEl(skipWrapRef.current);
    // Grow unlock only — never end the round alone. Loss waits until
    // every active player has fully skipped (see effect below).
    bumpUnlock(youId);
  }

  // Free title hint, handed over on the round clock (10s left / 30s in).
  useAutoTitleHint({
    active: phase === "play" && !lockedIn && !!track?.name && !titleHintText,
    raceMode: timed ? "timed" : "classic",
    roundStartedAt: roundStartedAt.current,
    roundEndsAt,
    resetKey: roundIdx,
    onDue: () => setTitleHintText(titleHintMask(track.name)),
  });

  // Lose only once everyone still in the race has maxed their skip ladder.
  // Timed mode waits for the 45s clock (or everyone locked in) instead.
  useEffect(() => {
    if (phase !== "play") return;
    if (timed) return;
    if (!allPlayersMaxUnlocked(players, unlockByPlayer)) return;
    endRoundLose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, unlockByPlayer, players, timed]);

  function nextRound() {
    stopAudio();
    clearTimers();
    clearTimedRound();
    advancingRef.current = false;
    if (roundIdx + 1 >= rounds.length) {
      setPhase("over");
      fireConfetti("victory");
      return;
    }
    setRoundIdx((i) => i + 1);
    setUnlockByPlayer({ [youId]: 0 });
    setGuesses([]);
    setNextVotes({});
    setOutcome(null);
    setWinnerId(null);
    setEarnedPts(0);
    setBonus(0);
    setRevealedArtist(null);
    setArtistClaimedBy(null);
    setArtistByPlayer({});
    artistClaimedRef.current = null;
    artistByPlayerRef.current = {};
    setTitleGuess("");
    setArtistGuess("");
    setTitleHintText("");
    setSkipPop(null);
    setAlmostTitle(null);
    setAlmostArtist(null);
    setPhase("play");
    roundStartedAt.current = Date.now();
    loggedRoundRef.current = -1;
    armTimedClock();
  }

  function voteNext(e) {
    if (phase !== "reveal" || nextVotes[youId]) return;
    stopAudio();
    setNextVotes((prev) => ({ ...prev, [youId]: true }));
    e?.currentTarget?.blur?.();
  }

  // Opponents cast next-votes during reveal so the tally fills — staggered
  // per opponent (not fully independent random) so they trickle in one at a
  // time instead of occasionally landing all at once.
  useEffect(() => {
    if (phase !== "reveal") return;
    const key = ++roundKeyRef.current;
    const ops = shuffle(players.filter((p) => p.id !== youId));
    const timers = [];
    ops.forEach((op, i) => {
      const delay = 1100 + i * 1300 + Math.random() * 1500;
      const t = setTimeout(() => {
        if (roundKeyRef.current !== key) return;
        if (phaseRef.current !== "reveal") return;
        setNextVotes((prev) => {
          if (prev[op.id]) return prev;
          return { ...prev, [op.id]: true };
        });
      }, delay);
      timers.push(t);
    });
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, roundIdx]);

  // Advance once enough next-votes land.
  useEffect(() => {
    if (phase !== "reveal") return;
    if (voteHave < voteNeed) return;
    if (advancingRef.current) return;
    advancingRef.current = true;
    const t = setTimeout(() => nextRound(), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, voteHave, voteNeed, roundIdx]);

  const fast = isFastTest();
  function endFast() {
    clearTimers();
    stopAudio();
    let roster = players;
    if (roster.filter((p) => p.id !== youId).length < 1) {
      roster = [
        roster.find((p) => p.id === youId) || {
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
        ...makeOpponents(3, [youAvatar.color]),
      ];
    }
    const opScores = [100, 40, 0];
    let oi = 0;
    roster = roster.map((p) => {
      if (p.id === youId) return { ...p, score: 880, wins: 3 };
      const score = opScores[oi++] ?? 0;
      return { ...p, score, wins: score > 0 ? 1 : 0 };
    });
    setPlayers(roster);
    setRoundLog(FAST_ROUND_LOG);
    const ops = roster.filter((p) => p.id !== youId);
    const results = FAST_ROUND_LOG.flatMap((r, i) => {
      if (!r.won || r.wallMs == null) return [];
      const toOp = i === 2 && ops[0];
      const w = toOp ? ops[0] : null;
      return [
        {
          round: i + 1,
          winnerId: w ? w.id : youId,
          winnerName: w ? w.name : youName,
          color: w ? w.color : youAvatar.color,
          wallMs: r.wallMs,
          title: r.title,
          artist: r.artist,
          label: `${r.title} · ${r.artist}`,
        },
      ];
    });
    setRoundResults(results);
    setPlaylistBests(
      recordPlaylistScore(
        chartKey || `online:${playlistName || "charts"}`,
        playlistName || "Online race",
        880
      )
    );
    setPhase("over");
  }

  const debugActions = useMemo(() => {
    if (!fast) return [];
    const acts = [];
    if (phase === "matching") {
      acts.push({
        id: "end-match",
        label: "skip match → wrap (fake)",
        run: endFast,
      });
    } else if (phase !== "over") {
      acts.push(
        { id: "end", label: "jump to wrap (fake stats)", run: endFast },
        {
          id: "force-reveal-win",
          label: "force you win this round",
          run: () => {
            const you = players.find((p) => p.id === youId);
            if (you && track) endRoundWin(you, 500, 0);
          },
        }
      );
    }
    acts.push({ id: "exit", label: "leave race", run: () => onExit?.() });
    return acts;
  }, [fast, phase, players, track]); // eslint-disable-line react-hooks/exhaustive-deps

  useDebugActions("online-race", debugActions);

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
        <p className="fineprint">
          {timed
            ? "today’s charts · 45s for everyone · guesses revealed at the end"
            : "today’s charts · first to guess wins — ends round"}
        </p>
      </div>
    );
  }

  // ---- game over ----
  if (phase === "over") {
    const ranked = [...players].sort((a, b) => b.score - a.score);
    const mine = ranked.find((p) => p.id === youId);
    const place = ranked.findIndex((p) => p.id === youId) + 1;
    const myScore = mine?.score ?? 0;
    const endStats = computeGameStats(roundLog, { score: myScore });
    return (
      <div className="game mp-board mp-board--solo online-race" ref={rootRef}>
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
          <div className="gameover">
            <div className="turntable">
              <ScrubbableVinyl spin="slow" title="drag to scrub">
                <div className="vinyl-label" aria-hidden="true" />
              </ScrubbableVinyl>
            </div>
            <h2 className="title">That's a wrap!</h2>
            <p className="subtitle">
              You finished <strong>#{place}</strong> with <strong>{myScore}</strong>{" "}
              pts.
            </p>
            <PlayerRail players={ranked} />
            <GameOverStats
              stats={endStats}
              bests={playlistBests}
              roundResults={roundResults}
              players={ranked}
              myId={youId}
              hideMisses
            />
            <div className="gameover-actions">
              <ShareScoreButton
                mode="online"
                score={myScore}
                place={place}
                stats={endStats}
                playlistName={playlistName}
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
          unlockByPlayer={unlockByPlayer}
          solveTimes={revealed ? solveTimes : null}
          artistClaimedBy={revealed ? artistClaimedBy : null}
          timed={timed}
        />

        {phase === "play" && !cueReady ? (
          <div className="loader cue-loader">cueing the record…</div>
        ) : (
          <>
        <GuessMedia
          mode="vinyl"
          revealed={revealed}
          spinning={spinning}
          cover={track?.cover}
          title={displayTitle(track?.name)}
          artist={(track?.artists || []).join(", ")}
          canControl={!!track}
          interactive={!!track}
          vinylTitle="play / pause · drag to scrub"
          onTogglePlay={togglePlay}
          onPrimeAudio={prime}
          onScrubStart={stopAudio}
        />
        {errorMsg && <div className="error-banner">{errorMsg}</div>}

        {revealed && outcome === "win" && !timed && (
          <div className="inline-badge inline-badge--win">
            {winnerId === youId ? "you" : winnerName} NAILED IT
          </div>
        )}
        {revealed && outcome === "win" && timed && (
          <div className="inline-badge inline-badge--win">TIME’S UP</div>
        )}
        {revealed && outcome === "lose" && (
          <div className="inline-badge inline-badge--lose">NOBODY GOT IT</div>
        )}

        {phase === "play" && timed && (
          <TimedCountdown roundEndsAt={roundEndsAt} lockedIn={lockedIn} />
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
                : `${unlocked}s unlocked`}
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
                      lockedIn
                        ? "locked in — waiting…"
                        : titleHintText || "song title…"
                    }
                    value={lockedIn ? "" : titleGuess}
                    disabled={lockedIn}
                    {...titleSuggest.inputProps}
                    onChange={(e) => {
                      setAlmostTitle(null);
                      setTitleGuess(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (titleSuggest.handleKeyDown(e)) return;
                      if (e.key === "Enter") submitGuess();
                    }}
                  />
                  <GuessSuggest suggest={titleSuggest} />
                  <AlmostFlash
                    token={almostTitle}
                    onDone={() => setAlmostTitle(null)}
                  />
                </div>
              </div>
              <div className="guess-artist-row">
                <div className="guess-artist-field">
                  <input
                    className={`guess-input${myRevealedArtist ? " guess-input--locked" : ""}`}
                    placeholder="artist…"
                    value={myRevealedArtist || artistGuess}
                    disabled={!!myRevealedArtist}
                    {...artistSuggest.inputProps}
                    onChange={(e) => {
                      setAlmostArtist(null);
                      setArtistGuess(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (artistSuggest.handleKeyDown(e)) return;
                      if (e.key === "Enter") submitGuess();
                    }}
                  />
                  <GuessSuggest suggest={artistSuggest} />
                  <AlmostFlash
                    token={almostArtist}
                    onDone={() => setAlmostArtist(null)}
                  />
                </div>
                <GuessTransport
                  playing={localPlaying}
                  busy={playBusy}
                  canPlay={!!track}
                  playLabel={`Play ${unlocked}s`}
                  onPlay={startPlay}
                  onPause={stopAudio}
                />
              </div>
            </div>
            <div className="guess-actions">
              <div className="btn-skip-wrap" ref={skipWrapRef}>
                <button className="btn btn-skip" onClick={skip}>
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
                    ? !artistGuess.trim() || !!myRevealedArtist
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
                {track.cover && (
                  <img src={track.cover} alt="" className="reveal-cover" />
                )}
              </div>
              <div className="reveal-text">
                <span className="reveal-title">{displayTitle(track.name)}</span>
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
            <div className="media-stage-vote">
              <button
                type="button"
                className={`btn btn-big btn-play media-stage-btn ${iVotedNext ? "is-voted" : ""}`}
                onClick={voteNext}
                disabled={iVotedNext}
                aria-label={
                  roundIdx + 1 >= rounds.length ? "Results" : "Next song"
                }
              >
                <span className="btn-play-icon" aria-hidden="true" />
                {roundIdx + 1 >= rounds.length ? "see results" : "next song"}
                <span className="vote-tally">
                  {voteHave}/{voteNeed}
                </span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        )}
          </>
        )}
      </div>

      <GuessPopups guesses={guesses} myId={youId} timed={timed} />
    </div>
  );
}
