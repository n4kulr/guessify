/** Curated CD packs — shown with a “pack” badge in the dropdown. */
export const CHART_PACK_TAGS = [
  "pop", "2000s", "2010s", "hip-hop", "rnb", "rock", "indie", "electronic",
  "jazz", "soul", "metal", "punk", "folk", "classical", "reggae", "country",
  "house", "techno", "k-pop", "afrobeats", "latin", "blues", "90s", "disco",
];

/**
 * Extra bases Last.fm often has tracks for, but that aren’t on the CD shelf.
 * Typing a prefix (e.g. “mala”) expands these with decade suffixes.
 */
export const CHART_REGION_SEEDS = [
  "malayalam",
  "tamil",
  "hindi",
  "telugu",
  "punjabi",
  "kannada",
  "bollywood",
  "mollywood",
  "kollywood",
  "tollywood",
  "korean",
  "japanese",
  "mandarin",
  "cantonese",
  "arabic",
  "french",
  "spanish",
  "portuguese",
  "brazilian",
  "afrobeat",
  "afrobeats",
  "amapiano",
  "dancehall",
  "soca",
  "gospel",
  "christian",
  "lo-fi",
  "lofi",
  "phonk",
  "hyperpop",
  "city pop",
  "j-pop",
  "j-rock",
  "anime",
  "ost",
];

export const CHART_ERA_SUFFIXES = ["90s", "2000s", "2010s", "2020s"];

function norm(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .slice(0, 64);
}

function matchesPrefix(name, q) {
  if (!q) return false;
  const n = name.toLowerCase();
  if (n.startsWith(q)) return true;
  const compact = n.replace(/[\s-]+/g, "");
  const qCompact = q.replace(/[\s-]+/g, "");
  return compact.startsWith(qCompact) || n.includes(q);
}

/**
 * @param {string} query
 * @param {{ tags?: { name: string }[], artists?: { name: string }[] }} [remote]
 * @returns {{ name: string, label: string, pack: boolean, kind: "tag"|"artist" }[]}
 */
export function buildChartSuggestions(query, remote = {}) {
  const tags = remote.tags || (Array.isArray(remote) ? remote : []);
  const artists = remote.artists || [];
  const q = norm(query);
  if (q.length < 1) return [];

  const packSet = new Set(CHART_PACK_TAGS);
  const out = [];
  const seen = new Set();

  function add(raw, { pack = false, kind = "tag", label } = {}) {
    const name = kind === "artist" ? String(raw || "").trim().slice(0, 120) : norm(raw);
    if (!name) return;
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({
      name: key,
      label: label || (kind === "artist" ? name : key),
      pack: pack || packSet.has(key),
      kind,
    });
  }

  for (const tag of CHART_PACK_TAGS) {
    if (matchesPrefix(tag, q)) add(tag, { pack: true, kind: "tag" });
  }

  for (const seed of CHART_REGION_SEEDS) {
    if (!matchesPrefix(seed, q)) continue;
    add(seed, { kind: "tag" });
    if (!seed.includes(" ")) {
      for (const era of CHART_ERA_SUFFIXES) add(`${seed} ${era}`, { kind: "tag" });
    }
  }

  for (const hit of tags) {
    const name = norm(hit?.name);
    if (!name || !matchesPrefix(name, q)) continue;
    add(name, { kind: "tag" });
    if (!name.includes(" ")) {
      for (const era of CHART_ERA_SUFFIXES) add(`${name} ${era}`, { kind: "tag" });
    }
  }

  // Artists: keep display casing; don't invent “Drake 2000s” tags.
  for (const hit of artists) {
    const label = String(hit?.name || "").trim();
    if (!label || !matchesPrefix(label, q)) continue;
    add(label, { kind: "artist", label });
  }

  out.sort((a, b) => {
    // Artists float up when the query looks like a name (has space or capital intent)
    const aStart = a.label.toLowerCase().startsWith(q) ? 0 : 1;
    const bStart = b.label.toLowerCase().startsWith(q) ? 0 : 1;
    if (aStart !== bStart) return aStart - bStart;
    if (a.kind !== b.kind) return a.kind === "artist" ? -1 : 1;
    if (a.pack !== b.pack) return a.pack ? -1 : 1;
    return a.label.length - b.label.length || a.label.localeCompare(b.label);
  });

  return out.slice(0, 10);
}
