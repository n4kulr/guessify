/** Curated CD packs — “pack” badge; must stay in sync with PlaylistPicker spindle. */
export const CHART_PACK_TAGS = [
  "pop", "2000s", "2010s", "hip-hop", "rnb", "rock", "indie", "electronic",
  "jazz", "soul", "metal", "punk", "folk", "classical", "reggae", "country",
  "house", "techno", "k-pop", "afrobeats", "latin", "blues", "90s", "disco",
];

/** Genres — autocomplete seeds (also get decade compounds). */
export const CHART_GENRE_SEEDS = [
  "pop",
  "rock",
  "indie",
  "alternative",
  "hip-hop",
  "rap",
  "rnb",
  "r&b",
  "soul",
  "funk",
  "jazz",
  "blues",
  "country",
  "folk",
  "metal",
  "punk",
  "emo",
  "electronic",
  "edm",
  "house",
  "techno",
  "trance",
  "drum & bass",
  "dnb",
  "dubstep",
  "lo-fi",
  "lofi",
  "ambient",
  "classical",
  "opera",
  "disco",
  "reggae",
  "dancehall",
  "afrobeats",
  "afro house",
  "latin",
  "salsa",
  "bachata",
  "reggaeton",
  "k-pop",
  "j-pop",
  "city pop",
  "synthwave",
];

/** Languages / regional scenes (not every country). */
export const CHART_LANGUAGE_SEEDS = [
  "english",
  "hindi",
  "tamil",
  "telugu",
  "malayalam",
  "kannada",
  "punjabi",
  "bengali",
  "marathi",
  "gujarati",
  "urdu",
  "sinhala",
  "arabic",
  "persian",
  "turkish",
  "korean",
  "japanese",
  "mandarin",
  "cantonese",
  "thai",
  "vietnamese",
  "indonesian",
  "malay",
  "spanish",
  "portuguese",
  "french",
  "german",
  "italian",
];

/** Film industries. */
export const CHART_FILM_SEEDS = [
  "bollywood",
  "kollywood",
  "tollywood",
  "mollywood",
  "sandalwood",
  "lollywood",
  "nollywood",
];

/** Regional / niche styles. */
export const CHART_STYLE_SEEDS = [
  "carnatic",
  "hindustani",
  "qawwali",
  "ghazal",
  "bhangra",
  "baul",
  "devotional",
  "gospel",
  "worship",
  "anime",
  "video game music",
  "ost",
  "amapiano",
  "baile funk",
  "phonk",
  "hyperpop",
  "j-rock",
];

/**
 * Country-as-scene only — people actually type these as music vibes.
 * Everything else comes from Last.fm tags.
 */
export const CHART_SCENE_COUNTRY_SEEDS = [
  "brazil",
  "nigeria",
  "jamaica",
  "india",
  "korea",
  "japan",
  "mexico",
];

/** Chart / hit-list style queries. No decade expansion. */
export const CHART_HITS_SEEDS = [
  "global top 50",
  "viral 50",
  "top hits",
  "trending",
  "new releases",
  "billboard hot 100",
  "uk top 40",
  "us top 50",
];

export const CHART_ERA_SUFFIXES = [
  "60s",
  "70s",
  "80s",
  "90s",
  "2000s",
  "2010s",
  "2020s",
];

/** Bases that get “{seed} {era}” compounds. */
export const CHART_COMPOUND_BASES = [
  ...CHART_GENRE_SEEDS,
  ...CHART_LANGUAGE_SEEDS,
  ...CHART_FILM_SEEDS,
  ...CHART_STYLE_SEEDS,
  ...CHART_SCENE_COUNTRY_SEEDS,
];

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

  // 1) CD packs
  for (const tag of CHART_PACK_TAGS) {
    if (matchesPrefix(tag, q)) add(tag, { pack: true, kind: "tag" });
  }

  // 2) Hit-list / chart seeds (no decade compounds)
  for (const seed of CHART_HITS_SEEDS) {
    if (matchesPrefix(seed, q)) add(seed, { kind: "tag" });
  }

  // 3) Genres, languages, film, styles, scene-countries + decade compounds
  for (const seed of CHART_COMPOUND_BASES) {
    if (!matchesPrefix(seed, q)) continue;
    add(seed, { kind: "tag" });
    for (const era of CHART_ERA_SUFFIXES) {
      add(`${seed} ${era}`, { kind: "tag" });
    }
  }

  // 4) Bare era tags when typing “80” / “90s” / “2000”
  for (const era of CHART_ERA_SUFFIXES) {
    if (matchesPrefix(era, q)) add(era, { kind: "tag" });
  }

  // 5) Last.fm tags (+ compounds for short single-token hits)
  for (const hit of tags) {
    const name = norm(hit?.name);
    if (!name || !matchesPrefix(name, q)) continue;
    add(name, { kind: "tag" });
    if (!name.includes(" ") && name.length <= 24) {
      for (const era of CHART_ERA_SUFFIXES) add(`${name} ${era}`, { kind: "tag" });
    }
  }

  // 6) Artists from Last.fm (no fake “Drake 2000s”)
  for (const hit of artists) {
    const label = String(hit?.name || "").trim();
    if (!label || !matchesPrefix(label, q)) continue;
    add(label, { kind: "artist", label });
  }

  out.sort((a, b) => {
    const aL = a.label.toLowerCase();
    const bL = b.label.toLowerCase();
    const aStart = aL.startsWith(q) ? 0 : 1;
    const bStart = bL.startsWith(q) ? 0 : 1;
    if (aStart !== bStart) return aStart - bStart;

    // “mala” → malayalam before malay (longer continuing base wins)
    const aTok = aL.split(" ")[0];
    const bTok = bL.split(" ")[0];
    if (aTok.startsWith(q) && bTok.startsWith(q) && aTok !== bTok) {
      return bTok.length - aTok.length;
    }

    if (a.kind !== b.kind) return a.kind === "artist" ? -1 : 1;
    if (a.pack !== b.pack) return a.pack ? -1 : 1;

    // Same base: bare tag first, then common decades
    if (aTok === bTok && aL !== bL) {
      const aBare = aL === aTok;
      const bBare = bL === bTok;
      if (aBare !== bBare) return aBare ? -1 : 1;
      const eraRank = (name) => {
        const era = name.slice(aTok.length).trim();
        const order = ["90s", "2000s", "2010s", "2020s", "80s", "70s", "60s"];
        const i = order.indexOf(era);
        return i === -1 ? 50 : i;
      };
      const er = eraRank(aL) - eraRank(bL);
      if (er) return er;
    }

    return aL.length - bL.length || aL.localeCompare(bL);
  });

  return out.slice(0, 12);
}
