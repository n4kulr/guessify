/**
 * Self-check: the multiplayer room lifecycle only allows the documented moves.
 * Run: node src/roomPhase.check.js
 */
import assert from "node:assert/strict";
import {
  ROOM_PHASE,
  ROOM_TRANSITIONS,
  canEnterPhase,
  isAnswerRevealed,
  freshRoundFields,
} from "./multiplayer/roomPhase.js";
import { TIMED_ROUND_MS } from "./multiplayer/constants.js";

const { EMPTY, LOBBY, PLAY, REVEAL, OVER } = ROOM_PHASE;

// The happy path of a whole game.
assert.ok(canEnterPhase(EMPTY, LOBBY));
assert.ok(canEnterPhase(LOBBY, PLAY));
assert.ok(canEnterPhase(PLAY, REVEAL));
assert.ok(canEnterPhase(REVEAL, PLAY));
assert.ok(canEnterPhase(REVEAL, OVER));
// Every song in the pool turned out unplayable.
assert.ok(canEnterPhase(PLAY, OVER));

// Moves that would break the game.
assert.ok(!canEnterPhase(LOBBY, REVEAL), "can't reveal before anyone played");
assert.ok(!canEnterPhase(LOBBY, OVER));
assert.ok(!canEnterPhase(PLAY, LOBBY));
assert.ok(!canEnterPhase(PLAY, PLAY), "a round can't restart itself");
assert.ok(!canEnterPhase(REVEAL, REVEAL));
assert.ok(!canEnterPhase(REVEAL, LOBBY));
for (const phase of Object.values(ROOM_PHASE)) {
  assert.ok(!canEnterPhase(OVER, phase), `over is final, not → ${phase}`);
}
assert.ok(!canEnterPhase("bogus", PLAY));
assert.ok(!canEnterPhase(PLAY, "bogus"));

// Every phase has a row, and every target is a real phase.
const phases = new Set(Object.values(ROOM_PHASE));
assert.deepEqual(new Set(Object.keys(ROOM_TRANSITIONS)), phases);
for (const targets of Object.values(ROOM_TRANSITIONS)) {
  for (const target of targets) assert.ok(phases.has(target), target);
}

// The answer is only public once the round is done.
assert.ok(!isAnswerRevealed(LOBBY));
assert.ok(!isAnswerRevealed(PLAY));
assert.ok(isAnswerRevealed(REVEAL));
assert.ok(isAnswerRevealed(OVER));

// Each round starts clean; only timed rounds get a deadline.
const classicRound = freshRoundFields("classic", 1000);
assert.equal(classicRound.roundStartedAt, 1000);
assert.equal(classicRound.roundEndsAt, null);
assert.equal(classicRound.outcome, null);
assert.equal(classicRound.winnerId, null);
assert.deepEqual(classicRound.guesses, []);
assert.deepEqual(classicRound.roundSolves, {});
assert.equal(freshRoundFields("timed", 1000).roundEndsAt, 1000 + TIMED_ROUND_MS);
// Fresh objects each call, so one round can't leak into the next.
assert.notEqual(freshRoundFields("classic").guesses, freshRoundFields("classic").guesses);

console.log("roomPhase.check: ok");
