// The multiplayer room's lifecycle, written down in one place.
// Imported by the room server (party/room.js) and safe for React clients too.
//
//   empty ──host──▶ lobby ──start──▶ play ◀──next vote──┐
//                                     │                 │
//                                     ├─solve / all skip / timer──▶ reveal
//                                     │                 │
//                                     └─no playable song┴─last round / end frenzy──▶ over
//
// "empty" is never stored: it's what snapshot() reports before a host claims
// the room. "over" is final — a fresh game gets a fresh room.

import { TIMED_ROUND_MS } from "./constants.js";

export const ROOM_PHASE = Object.freeze({
  EMPTY: "empty",
  LOBBY: "lobby",
  PLAY: "play",
  REVEAL: "reveal",
  OVER: "over",
});

/** Every legal move. Anything missing here is a bug, not a feature. */
export const ROOM_TRANSITIONS = Object.freeze({
  [ROOM_PHASE.EMPTY]: Object.freeze([ROOM_PHASE.LOBBY]),
  [ROOM_PHASE.LOBBY]: Object.freeze([ROOM_PHASE.PLAY]),
  // play → over only when no song in the pool has a preview.
  [ROOM_PHASE.PLAY]: Object.freeze([ROOM_PHASE.REVEAL, ROOM_PHASE.OVER]),
  [ROOM_PHASE.REVEAL]: Object.freeze([ROOM_PHASE.PLAY, ROOM_PHASE.OVER]),
  [ROOM_PHASE.OVER]: Object.freeze([]),
});

/** True when the room may move from `fromPhase` to `toPhase`. */
export function canEnterPhase(fromPhase, toPhase) {
  const allowed = ROOM_TRANSITIONS[fromPhase];
  if (!allowed) return false;
  return allowed.includes(toPhase);
}

/** Title / artist / cover are public once the round has ended. */
export function isAnswerRevealed(phase) {
  return phase === ROOM_PHASE.REVEAL || phase === ROOM_PHASE.OVER;
}

/**
 * Per-round fields wiped at the start of every round (first round and each
 * "next"). Keeping them in one list means a new field can't be reset on one
 * path and forgotten on the other.
 */
export function freshRoundFields(raceMode, now = Date.now()) {
  let roundEndsAt = null;
  if (raceMode === "timed") {
    roundEndsAt = now + TIMED_ROUND_MS;
  }
  return {
    unlockByPlayer: {},
    guesses: [],
    nextVotes: {},
    outcome: null,
    winnerId: null,
    bonus: 0,
    earnedPts: 0,
    revealedArtist: null,
    artistClaimedBy: null,
    artistByPlayer: {},
    roundSolves: {},
    timedPlaces: null,
    solveTimes: null,
    roundStartedAt: now,
    roundEndsAt,
  };
}
