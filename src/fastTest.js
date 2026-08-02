import { normalizeAvatar, randomAvatar, PLAYER_COLORS } from "./multiplayer/constants.js";

/** Local/dev shortcut: add `?fast=1` once (sticky for the tab via sessionStorage). */

export function isFastTest() {
  try {
    const q = new URLSearchParams(window.location.search).get("fast");
    if (q === "1") {
      sessionStorage.setItem("guessify-fast", "1");
      return true;
    }
    if (q === "0") {
      sessionStorage.removeItem("guessify-fast");
      return false;
    }
    return sessionStorage.getItem("guessify-fast") === "1";
  } catch {
    return false;
  }
}

/** Sample personal log so end-game chart/stats have something to show. */
export const FAST_ROUND_LOG = [
  {
    won: true,
    artistClaimed: true,
    wallMs: 7800,
    title: "no tears left to cry",
    artist: "Ariana Grande",
    unlockStep: 0,
  },
  {
    won: false,
    artistClaimed: true,
    wallMs: null,
    title: "baby",
    artist: "Justin Bieber",
    unlockStep: 3,
  },
  {
    won: true,
    artistClaimed: false,
    wallMs: 16200,
    title: "Blinding Lights",
    artist: "The Weeknd",
    unlockStep: 2,
  },
  {
    won: true,
    artistClaimed: true,
    wallMs: 4200,
    title: "Levitating",
    artist: "Dua Lipa",
    unlockStep: 0,
  },
  {
    won: false,
    artistClaimed: false,
    wallMs: null,
    title: "drivers license",
    artist: "Olivia Rodrigo",
    unlockStep: 4,
  },
];

const GUEST_NAMES = ["BBQ_Bruce", "vrm", "papercut", "lampmoth"];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Fake guests with colors that don't collide with the host. */
export function buildFastGuests(count, reservedColor) {
  const taken = new Set(
    [reservedColor]
      .filter((c) => typeof c === "string")
      .map((c) => c.toLowerCase())
  );
  const free = shuffle(
    PLAYER_COLORS.filter((c) => !taken.has(c.toLowerCase()))
  );
  const scores = [100, 40, 0, 20];
  return GUEST_NAMES.slice(0, count).map((name, i) => {
    const color = free[i % free.length] || PLAYER_COLORS[(i + 1) % PLAYER_COLORS.length];
    const avatar = normalizeAvatar({ ...randomAvatar(), color }, color);
    const score = scores[i] ?? 0;
    return {
      id: `fast-guest-${i}`,
      name,
      avatar,
      color,
      score,
      wins: score > 0 ? 1 : 0,
      connected: true,
      left: false,
      isHost: false,
    };
  });
}

/**
 * Fake party wrap payload.
 * @param {{ alone?: boolean, host: { id: string, name: string, avatar: object, color?: string } }} opts
 */
export function buildFastPartyEnd({ alone = false, host }) {
  const color = host.color || host.avatar?.color || PLAYER_COLORS[0];
  const you = {
    id: host.id || "host",
    name: host.name || "you",
    avatar: host.avatar || normalizeAvatar(randomAvatar(), color),
    color,
    score: 880,
    wins: 3,
    connected: true,
    left: false,
    isHost: true,
  };
  const guests = alone ? [] : buildFastGuests(3, color);
  const players = [you, ...guests];

  const roundResults = FAST_ROUND_LOG.flatMap((r, i) => {
    if (!r.won || r.wallMs == null) return [];
    // Hand Blinding Lights to a guest so the compare chart has 2 lines.
    const toGuest = !alone && i === 2 && guests[0];
    const w = toGuest ? guests[0] : you;
    return [
      {
        round: i + 1,
        winnerId: w.id,
        winnerName: w.name,
        color: w.color,
        wallMs: r.wallMs,
        title: r.title,
        artist: r.artist,
        label: `${r.title} · ${r.artist}`,
      },
    ];
  });

  return {
    players,
    roundLog: FAST_ROUND_LOG,
    roundResults,
    myScore: you.score,
  };
}
