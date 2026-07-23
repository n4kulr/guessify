/** Believable “players online” count that drifts over time (no server). */
export function onlineActiveCount(now = Date.now()) {
  const slot = Math.floor(now / 45_000);
  const wave = Math.sin(slot * 1.618) * 0.5 + 0.5; // 0..1
  return Math.round(17 + wave * 21); // 17–38
}
