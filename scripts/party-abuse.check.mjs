// Needs a running party server: `npm run dev:party`, then
// node scripts/party-abuse.check.mjs [ws://127.0.0.1:8787]
import assert from "node:assert/strict";

const base = (process.argv[2] || "ws://127.0.0.1:8787") + "/parties/main/";
const room = "T" + Math.random().toString(36).slice(2, 7).toUpperCase();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function client() {
  const ws = new WebSocket(base + room);
  const c = { ws, state: null, msgs: [], id: null };
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    c.msgs.push(m);
    if (m.type === "state") c.state = m.state;
    if (m.playerId) c.id = m.playerId;
  };
  c.open = new Promise((r) => (ws.onopen = r));
  c.send = (o) => ws.send(typeof o === "string" ? o : JSON.stringify(o));
  return c;
}

const tracks = ["Levitating", "Bad Guy", "Flowers", "Stay", "Heat Waves", "Espresso"].map((name, i) => ({
  id: "t" + i,
  name,
  artists: ["Artist" + i],
  previewUrl: `https://example.com/p${i}.m4a`,
}));

const host = client();
await host.open;
host.send({ type: "host", hostName: "host", tracks, raceMode: "timed" });
await wait(300);
const alice = client();
const eve = client();
await Promise.all([alice.open, eve.open]);
alice.send({ type: "join", name: "alice" });
eve.send({ type: "join", name: "eve" });
await wait(300);
host.send({ type: "start", raceMode: "timed" });
await wait(500);

const cur = tracks.find((t) => t.id === host.state.trackId);
alice.send({ type: "guess", title: cur.name, artist: cur.artists[0] });
await wait(300);
const seen = eve.state.guesses.find((g) => g.playerId === alice.id);
assert.equal(seen.title, null, "timed: other players must not see a locked-in title");
assert.deepEqual(eve.state.artistByPlayer, {}, "timed: other players' artists stay hidden");
assert.ok(alice.state.guesses.some((g) => g.playerId === alice.id && g.titleOk), "own lock-in still visible");

const hostId = eve.state.players.find((p) => p.isHost).id;
eve.send({ type: "rejoin", playerId: hostId });
await wait(300);
assert.ok(!eve.msgs.some((m) => m.type === "hosted"), "public host id alone must not reclaim the seat");

const secret = host.msgs.find((m) => m.type === "hosted").secret;
const host2 = client();
await host2.open;
host2.send({ type: "rejoin", playerId: host.id, secret });
await wait(300);
assert.ok(host2.msgs.some((m) => m.type === "hosted"), "real host reconnects with its secret");
assert.ok(!JSON.stringify(alice.state).includes(secret), "secret never broadcast");

for (const m of ["null", "[]", "{}", "not json"]) eve.send(m);
eve.send({ type: "guess", title: "x".repeat(200_000) });
for (let i = 0; i < 300; i++) eve.send({ type: "guess", title: "spam" + i });
await wait(1200);
assert.ok(JSON.stringify(alice.state).length < 20_000, "guess flood keeps state small");

for (const c of [host, host2, alice, eve]) c.ws.close();
console.log("party-abuse.check: ok");
process.exit(0);
