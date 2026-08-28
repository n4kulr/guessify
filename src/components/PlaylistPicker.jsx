import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import ChartCdSpindle from "./ChartCdSpindle.jsx";
import ChartCdStack from "./ChartCdStack.jsx";
import ChartPreviewDialog from "./ChartPreviewDialog.jsx";
import PlaylistCdShelf from "./PlaylistCdShelf.jsx";
import { shakeEl } from "../fx.js";
import { useTypewriterPh } from "../useTypewriterPh.js";
import GuessSuggest, { useGuessSuggest } from "./GuessSuggest.jsx";
import {
  pickerTourPending,
  markPickerTourSeen,
} from "./PlayHowto.jsx";

const YOURS_PREVIEW = 6;

// Fixed display order for the "yours" shelf, matched case-insensitively by
// name. Anything not on the list falls after it, shuffled.
const PLAYLIST_ORDER = [
  "nakul's favs",
  "beats",
  "not beats",
  "cultural roots",
  "nostalgia",
  "beat switch",
  "calm",
  "liked songs",
];

/** Owned playlists that stay off the public / shared shelf. */
const PLAYLIST_HIDDEN = new Set([
  "nvieifayjrayem",
  "zeke mone zatch mone",
  "on loop",
  "what i dooo",
  "hi nviedra",
  "mallu magnet",
  "uterus",
]);

const CHART_PACKS = [
  { tag: "pop", label: "Pop", blurb: "chart pop", about: "Catchy, radio-friendly songs with big choruses.", artists: ["Dua Lipa", "Sabrina Carpenter", "Olivia Rodrigo", "The Weeknd", "Taylor Swift", "Harry Styles", "Billie Eilish", "Ariana Grande"] },
  { tag: "2000s", label: "2000s", blurb: "decade pack", about: "Hits and radio staples from the 2000s.", artists: ["Beyoncé", "Linkin Park", "Rihanna", "The Killers", "Eminem", "Coldplay", "Usher", "OutKast"] },
  { tag: "2010s", label: "2010s", blurb: "decade pack", about: "Hits from the 2010s, when streaming took over.", artists: ["Adele", "Drake", "Lorde", "Post Malone", "Rihanna", "Ed Sheeran", "Kendrick Lamar", "Lana Del Rey"] },
  { tag: "hip-hop", label: "Hip-hop", blurb: "raps & beats", about: "Rapped verses over beats, from boom-bap to trap.", artists: ["Kendrick Lamar", "Drake", "Travis Scott", "Nicki Minaj", "J. Cole", "Tyler, the Creator", "Cardi B", "Future"] },
  { tag: "rnb", label: "R&B", blurb: "smooth cuts", about: "Smooth singing over midtempo grooves.", artists: ["SZA", "Frank Ocean", "Usher", "Summer Walker", "The Weeknd", "H.E.R.", "Brent Faiyaz", "Giveon"] },
  { tag: "rock", label: "Rock", blurb: "guitars up", about: "Guitar-based music with riffs and loud choruses.", artists: ["Foo Fighters", "Arctic Monkeys", "Queen", "Paramore", "The Strokes", "Red Hot Chili Peppers", "Muse", "Nirvana"] },
  { tag: "indie", label: "Indie", blurb: "left of center", about: "Alternative rock and pop outside the mainstream charts.", artists: ["Tame Impala", "Phoebe Bridgers", "Vampire Weekend", "Clairo", "Arcade Fire", "The 1975", "Mac DeMarco", "Japanese Breakfast"] },
  { tag: "electronic", label: "Electronic", blurb: "synths", about: "Synth- and beat-driven music made with machines and computers.", artists: ["Flume", "Disclosure", "Deadmau5", "Fred again..", "Skrillex", "ODESZA", "Aphex Twin", "Kaytranada"] },
  { tag: "jazz", label: "Jazz", blurb: "late night", about: "Improvised music rooted in swing, blues, and standards.", artists: ["Miles Davis", "Norah Jones", "Kamasi Washington", "Esperanza Spalding", "John Coltrane", "Billie Holiday", "Robert Glasper", "Snarky Puppy"] },
  { tag: "soul", label: "Soul", blurb: "warm grooves", about: "Heartfelt vocals over warm, rhythmic arrangements.", artists: ["Aretha Franklin", "Amy Winehouse", "Leon Bridges", "Alicia Keys", "Marvin Gaye", "Anderson .Paak", "Lauryn Hill", "Al Green"] },
  { tag: "metal", label: "Metal", blurb: "loud & proud", about: "Loud, heavy music with distorted guitars and intense drums.", artists: ["Metallica", "Gojira", "Slipknot", "Ghost", "Iron Maiden", "Tool", "Bring Me the Horizon", "Sleep Token"] },
  { tag: "punk", label: "Punk", blurb: "fast & raw", about: "Short, fast rock songs with raw energy and simple chords.", artists: ["Green Day", "The Offspring", "IDLES", "Amyl and the Sniffers", "Blink-182", "Ramones", "Paramore", "Turnstile"] },
  { tag: "folk", label: "Folk", blurb: "acoustic tales", about: "Acoustic songwriting focused on stories and melody.", artists: ["Bon Iver", "Mumford & Sons", "Joni Mitchell", "Fleet Foxes", "Bob Dylan", "Simon & Garfunkel", "Noah Kahan", "Iron & Wine"] },
  { tag: "classical", label: "Classical", blurb: "orchestral", about: "Orchestral and piano works from the Western classical tradition.", artists: ["Beethoven", "Bach", "Debussy", "Hans Zimmer", "Mozart", "Chopin", "Vivaldi", "Philip Glass"] },
  { tag: "reggae", label: "Reggae", blurb: "riddim", about: "Jamaican music with a skanking guitar rhythm and prominent bass.", artists: ["Bob Marley", "Toots & the Maytals", "Protoje", "Chronixx", "Peter Tosh", "Burning Spear", "Koffee", "Damian Marley"] },
  { tag: "country", label: "Country", blurb: "story songs", about: "Story songs with steel guitar, fiddle, and a Southern twang.", artists: ["Luke Combs", "Kacey Musgraves", "Johnny Cash", "Zach Bryan", "Dolly Parton", "Chris Stapleton", "Shania Twain", "Morgan Wallen"] },
  { tag: "house", label: "House", blurb: "four on the floor", about: "Dance music built on a steady four-on-the-floor kick.", artists: ["Disclosure", "Peggy Gou", "Calvin Harris", "Kerri Chandler", "Fisher", "Duke Dumont", "Frankie Knuckles", "Purple Disco Machine"] },
  { tag: "techno", label: "Techno", blurb: "warehouse", about: "Dark, repetitive electronic dance music for warehouses and clubs.", artists: ["Charlotte de Witte", "Amelie Lens", "Richie Hawtin", "Carl Cox", "Jeff Mills", "Nina Kraviz", "Adam Beyer", "Peggy Gou"] },
  { tag: "k-pop", label: "K-pop", blurb: "idol charts", about: "Korean pop with polished production and very catchy hooks.", artists: ["BTS", "BLACKPINK", "NewJeans", "Stray Kids", "TWICE", "EXO", "IU", "aespa"] },
  { tag: "afrobeats", label: "Afrobeats", blurb: "global pulse", about: "West African pop with danceable rhythms and melodic vocals.", artists: ["Wizkid", "Burna Boy", "Tems", "Rema", "Davido", "Asake", "Ayra Starr", "Tiwa Savage"] },
  { tag: "latin", label: "Latin", blurb: "ritmo", about: "Music from Latin America and Spain — reggaeton, salsa, and related styles.", artists: ["Bad Bunny", "Shakira", "J Balvin", "Rosalía", "Karol G", "Daddy Yankee", "Peso Pluma", "Rauw Alejandro"] },
  { tag: "blues", label: "Blues", blurb: "bent notes", about: "Guitar music built around bent notes and songs about hard times.", artists: ["B.B. King", "Buddy Guy", "Gary Clark Jr.", "Hozier", "Stevie Ray Vaughan", "Muddy Waters", "Joe Bonamassa", "Eric Clapton"] },
  { tag: "90s", label: "90s", blurb: "decade pack", about: "Hits from the 1990s across pop, rock, hip-hop, and R&B.", artists: ["Spice Girls", "Nirvana", "TLC", "Oasis", "Mariah Carey", "2Pac", "Radiohead", "Destiny's Child"] },
  { tag: "disco", label: "Disco", blurb: "dancefloor", about: "Seventies dance music with four-on-the-floor beats and lush arrangements.", artists: ["ABBA", "Donna Summer", "Bee Gees", "Daft Punk", "Chic", "Gloria Gaynor", "KC and the Sunshine Band", "Sister Sledge"] },
];

const CHART_PH_EXAMPLES = [
  "drake",
  "spanish 2010s",
  "taylor swift",
  "malayalam 2000s",
  "indie",
  "billboard hot 100",
  "gemini rights",
];

const PICKER_TOUR = [
  { id: "record", title: "Pick a record" },
  { id: "stack", title: "Make your own playlist" },
  { id: "describe", title: "Or describe it" },
];

function pickerTourClass(step, id) {
  if (step < 0) return "";
  if (PICKER_TOUR[step] && PICKER_TOUR[step].id === id) return "picker-tour-focus";
  return "picker-tour-dim";
}

export default function PlaylistPicker({ onPick, needsLogin = false }) {
  const [data, setData] = useState(null); // { playlists, liked }
  const [error, setError] = useState(null);
  const [ownerUnavailable, setOwnerUnavailable] = useState(false);
  const [loadingId, setLoadingId] = useState(null);
  const [note, setNote] = useState(null);
  const [showAllYours, setShowAllYours] = useState(false);
  const [chartQuery, setChartQuery] = useState("");
  const chartPh = useTypewriterPh(CHART_PH_EXAMPLES, !!chartQuery);
  const [chartFieldError, setChartFieldError] = useState(false);
  const [chartFieldFading, setChartFieldFading] = useState(false);
  const [chartPreview, setChartPreview] = useState(null);
  const [stackLayers, setStackLayers] = useState([]);
  const [stackMix, setStackMix] = useState(null);
  const [stackInsertOpen, setStackInsertOpen] = useState(false);
  const [stackBusy, setStackBusy] = useState(false);
  const [yoursView, setYoursView] = useState("cds"); // cds | list
  const [showLoginModal, setShowLoginModal] = useState(false);
  const loginModalTitleId = useId();
  const chartFieldRef = useRef(null);
  const chartErrorTimer = useRef(0);
  const tourCardRef = useRef(null);
  const [tourStep, setTourStep] = useState(-1);

  useEffect(() => {
    return () => clearTimeout(chartErrorTimer.current);
  }, []);

  useEffect(() => {
    if (error) return;
    if (!ownerUnavailable && !data) return;
    if (tourStep >= 0) return;
    if (!pickerTourPending()) return;
    setTourStep(0);
  }, [data, ownerUnavailable, error, tourStep]);

  useLayoutEffect(() => {
    if (tourStep < 0) return undefined;
    const card = tourCardRef.current;
    if (!card) return undefined;
    const btn = card.querySelector("button");
    if (btn) btn.focus({ preventScroll: true });
    // Record step is already at the top — scrolling the card to center
    // hides “Pick a record…”. Later steps still need the jump.
    if (tourStep === 0) return undefined;

    let behavior = "smooth";
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      behavior = "auto";
    }

    function go() {
      card.scrollIntoView({ behavior, block: "center", inline: "nearest" });
    }
    const frame = requestAnimationFrame(go);
    return () => cancelAnimationFrame(frame);
  }, [tourStep]);

  useEffect(() => {
    if (tourStep < 0) return undefined;
    function onKey(e) {
      if (e.key !== "Escape") return;
      setTourStep((step) => {
        if (step < 0) return step;
        const next = step + 1;
        if (next >= PICKER_TOUR.length) {
          markPickerTourSeen();
          return -1;
        }
        return next;
      });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tourStep]);

  useEffect(() => {
    if (!showLoginModal) return;
    function onKey(e) {
      if (e.key === "Escape") setShowLoginModal(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showLoginModal]);

  useEffect(() => {
    // Logged out: the API falls back to the site owner's shared library.
    fetch("/api/playlists", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(setData)
      .catch((r) => {
        if (needsLogin && r?.status === 503) setOwnerUnavailable(true);
        else setError(needsLogin ? "Couldn't load playlists." : "Couldn't load your playlists.");
      });
  }, [needsLogin]);

  // Liked Songs + owned playlists only (locked ones can't be played), sorted per PLAYLIST_ORDER.
  const yours = useMemo(() => {
    if (!data) return [];
    const list = [];
    if (data.liked && data.liked.total > 0) {
      list.push({
        id: "liked",
        liked: true,
        owned: true,
        name: "Liked Songs",
        owner: "you",
        cover: data.liked.cover,
        total: data.liked.total,
      });
    }
    list.push(
      ...(data.playlists || []).filter(
        (p) => p.owned && !PLAYLIST_HIDDEN.has(p.name.trim().toLowerCase())
      )
    );

    const rank = (p) => {
      const i = PLAYLIST_ORDER.indexOf(p.name.trim().toLowerCase());
      return i === -1 ? PLAYLIST_ORDER.length : i;
    };
    return list
      .map((p) => [p, rank(p), Math.random()])
      .sort((a, b) => a[1] - b[1] || a[2] - b[2])
      .map(([p]) => p);
  }, [data]);

  const visibleYours = showAllYours ? yours : yours.slice(0, YOURS_PREVIEW);
  const hiddenYours = Math.max(0, yours.length - YOURS_PREVIEW);

  async function chooseYours(p) {
    if (!p.owned) return;
    setLoadingId(p.id);
    setNote(null);
    try {
      const url = p.liked ? "/api/liked" : `/api/playlist/${p.id}`;
      const res = await fetch(url, { credentials: "include" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "failed");
      if (d.playableCount < 2) {
        setNote(`"${p.name}" needs at least 2 tracks to play. Try another.`);
        setLoadingId(null);
        return;
      }
      onPick(d);
    } catch (err) {
      setNote(err.message || "Couldn't load that playlist. Try another.");
      setLoadingId(null);
    }
  }

  async function chooseChart(tag, { artist = false } = {}) {
    const clean = String(tag || "").trim();
    if (!clean) return;
    const id = `chart:${artist ? "a:" : ""}${clean.toLowerCase()}`;
    setLoadingId(id);
    setNote(null);
    try {
      const qs = artist
        ? `artist=${encodeURIComponent(clean)}`
        : `tag=${encodeURIComponent(clean)}`;
      const res = await fetch(`/api/charts?${qs}&limit=30`, {
        credentials: "include",
      });
      const d = await res.json();
      if (!res.ok) {
        throw new Error(d.error || "Couldn't find a chart for that. Try another pick.");
      }
      if (d.playableCount < 2) {
        setNote(`“${d.name || clean}” needs at least 2 tracks. Try another pick.`);
        setLoadingId(null);
        return;
      }
      onPick(d);
    } catch (err) {
      setNote(err.message || "Couldn't load that chart. Try another pick.");
      setLoadingId(null);
    }
  }

  function resetChartField() {
    clearTimeout(chartErrorTimer.current);
    setChartFieldError(false);
    setChartFieldFading(false);
    setChartQuery("");
  }

  /** Wipe query, put a short error in the field, shake, then fade back. */
  function failChartSearch() {
    clearTimeout(chartErrorTimer.current);
    setLoadingId(null);
    setChartFieldFading(false);
    setChartFieldError(true);
    setChartQuery("try another :(");
    requestAnimationFrame(() => shakeEl(chartFieldRef.current));
    chartErrorTimer.current = window.setTimeout(() => {
      setChartFieldFading(true);
      chartErrorTimer.current = window.setTimeout(() => {
        resetChartField();
      }, 380);
    }, 1400);
  }

  /** Free-text “describe it” → load chart, show paper preview, then play. */
  async function previewChartSearch(query, { artist = false } = {}) {
    const clean = String(query || "").trim();
    if (!clean || chartFieldError) return;
    const id = `chart:${clean.toLowerCase()}`;
    setLoadingId(id);
    setNote(null);
    clearTimeout(chartErrorTimer.current);
    setChartFieldError(false);
    setChartFieldFading(false);
    try {
      let qs = `q=${encodeURIComponent(clean)}`;
      if (artist) qs = `artist=${encodeURIComponent(clean)}`;
      const res = await fetch(`/api/charts?${qs}&limit=30`, {
        credentials: "include",
      });
      const d = await res.json();
      if (!res.ok) {
        throw new Error(d.error || "chart miss");
      }
      if (d.playableCount < 2) {
        failChartSearch();
        return;
      }
      setChartPreview(d);
      setLoadingId(null);
    } catch {
      failChartSearch();
    }
  }

  function submitChartSearch(e) {
    e.preventDefault();
    if (chartFieldError) return;
    chartSuggest.dismiss();
    previewChartSearch(chartQuery);
  }

  const chartSuggest = useGuessSuggest({
    kind: "artist",
    value: chartQuery,
    enabled: !chartFieldError && loadingId === null,
    submitPick: (name) => {
      setChartQuery(name);
      previewChartSearch(name, { artist: true });
    },
  });

  function confirmChartPreview() {
    if (!chartPreview) return;
    const d = chartPreview;
    setChartPreview(null);
    onPick(d);
  }

  async function buildStackMix(layers) {
    if (!layers.length) {
      setStackMix(null);
      setStackInsertOpen(false);
      return null;
    }
    setStackBusy(true);
    setNote(null);
    try {
      const per = Math.max(8, Math.ceil(36 / layers.length));
      const parts = await Promise.all(
        layers.map(async (layer) => {
          const qs =
            layer.kind === "artist"
              ? `artist=${encodeURIComponent(layer.name)}`
              : `tag=${encodeURIComponent(layer.name)}`;
          const res = await fetch(`/api/charts?${qs}&limit=${per}`, {
            credentials: "include",
          });
          const d = await res.json();
          if (!res.ok) throw new Error(d.error || "mix layer failed");
          return d;
        })
      );
      const tracks = [];
      const seen = new Set();
      for (const part of parts) {
        for (const t of part.tracks || []) {
          const k = `${t.name}|${(t.artists?.[0] || "").toLowerCase()}`.toLowerCase();
          if (seen.has(k)) continue;
          seen.add(k);
          tracks.push(t);
        }
      }
      for (let i = tracks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tracks[i], tracks[j]] = [tracks[j], tracks[i]];
      }
      const sliced = tracks.slice(0, 40);
      const playlist = {
        id: `lfm-mix-${slugBits(layers.map((l) => l.name))}`,
        name: "mashup",
        owner: "your stack",
        cover: sliced.find((t) => t.cover)?.cover || parts[0]?.cover || null,
        total: sliced.length,
        playableCount: sliced.length,
        tracks: sliced,
        source: "lastfm",
        fuzzy: layers.some((l) => l.fuzzy),
        query: layers.map((l) => l.query).join(" · "),
      };
      setStackMix(playlist);
      setStackInsertOpen(true);
      if (sliced.length < 2) {
        setNote("Add another disc — need at least 2 tracks to play.");
      }
      return playlist;
    } catch (err) {
      setNote(err.message || "Couldn't build that mix.");
      return null;
    } finally {
      setStackBusy(false);
    }
  }

  async function addStackLayer(query, { artist = false } = {}) {
    const clean = String(query || "").trim();
    if (!clean || stackLayers.length >= 8) return false;
    setStackBusy(true);
    setNote(null);
    try {
      let qs = `q=${encodeURIComponent(clean)}`;
      if (artist) qs = `artist=${encodeURIComponent(clean)}`;
      const res = await fetch(`/api/charts?${qs}&limit=12`, {
        credentials: "include",
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Couldn't find that pick.");
      const kind = d.artist ? "artist" : "tag";
      const name = d.artist || d.tag || clean;
      const label =
        kind === "artist"
          ? d.artist || d.name?.replace(/ essentials$/, "") || clean
          : d.name || clean;
      const key = `${kind}:${name.toLowerCase()}`;
      if (stackLayers.some((l) => `${l.kind}:${l.name.toLowerCase()}` === key)) {
        setNote(`“${label}” is already in the stack.`);
        setStackBusy(false);
        return false;
      }
      const newLayers = [
        ...stackLayers,
        {
          id: `stack-${Date.now()}-${stackLayers.length}`,
          query: clean,
          kind,
          name,
          label,
          fuzzy: !!d.fuzzy,
        },
      ];
      setStackLayers(newLayers);
      await buildStackMix(newLayers);
      return true;
    } catch (err) {
      setNote(err.message || "Couldn't add that to the stack.");
      setStackBusy(false);
      return false;
    }
  }

  function putStackInPlayer(playlist) {
    if (!playlist || playlist.playableCount < 2) return;
    onPick(playlist);
  }

  function slugBits(names) {
    return names
      .join("-")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48);
  }

  function toggleYoursView() {
    setYoursView((v) => (v === "cds" ? "list" : "cds"));
  }

  function advancePickerTour() {
    const next = tourStep + 1;
    if (next >= PICKER_TOUR.length) {
      markPickerTourSeen();
      setTourStep(-1);
      return;
    }
    setTourStep(next);
  }

  if (!ownerUnavailable) {
    if (error) return <div className="panel">{error}</div>;
    if (!data) return <div className="loader">loading{needsLogin ? "" : " your"} playlists…</div>;
  }

  const cdsMode = yoursView === "cds";
  const touring = tourStep >= 0;
  let tour = null;
  if (touring) tour = PICKER_TOUR[tourStep];
  let pickerClass = "picker";
  if (touring) pickerClass += " is-touring";
  let tourBody = "add multiple artists/albums";
  if (tour && tour.id === "record") {
    tourBody = "Choose a playlist to start a game";
    if (needsLogin) {
      tourBody = "Choose a playlist to start a game (my curated list)";
    }
  } else if (tour && tour.id === "describe") {
    tourBody = "Type an artist, era, or album";
  }
  let tourBtn = "next";
  if (tourStep === PICKER_TOUR.length - 1) tourBtn = "got it";

  const tourIndex = tourStep + 1;
  const tourCount = PICKER_TOUR.length;
  let tourCard = null;
  if (tour) {
    tourCard = (
      <div
        key={tourStep}
        ref={tourCardRef}
        className="picker-tour-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="picker-tour-title"
        aria-describedby="picker-tour-step picker-tour-body"
      >
        <div className="spotlight-head">
          <span className="picker-tour-mark" aria-hidden="true">
            ?
          </span>
          <h2 id="picker-tour-title" className="spotlight-title">
            {tour.title}
          </h2>
          <span id="picker-tour-step" className="picker-tour-step">
            {tourIndex}/{tourCount}
          </span>
        </div>
        <p id="picker-tour-body" className="spotlight-hint">
          {tourBody}
        </p>
        <div className="spotlight-actions">
          <button
            type="button"
            className="btn btn-big btn-play"
            onClick={advancePickerTour}
          >
            <span className="btn-play-icon" aria-hidden="true" />
            {tourBtn}
          </button>
        </div>
      </div>
    );
  }

  let stackTourSlot = null;
  if (tour && tour.id === "stack") stackTourSlot = tourCard;

  return (
    <div className={pickerClass}>
      <div
        className={`picker-tour-section ${pickerTourClass(tourStep, "record")}`.trim()}
      >
      <div className="picker-heading">
        {yours.length > 0 && (
          <button
            type="button"
            className="view-toggle"
            aria-pressed={cdsMode}
            aria-label={cdsMode ? "Switch to button list" : "Switch to CD shelf"}
            onClick={toggleYoursView}
          >
            {cdsMode ? "CD" : "Button"}
          </button>
        )}
        <h2 className="section-title">Pick a record…</h2>
      </div>
      <p className="section-sub">
        {needsLogin ? "heres my playlists! hand curated :)" : "Your Spotify playlists only."}
      </p>
      {needsLogin && (
        <button
          type="button"
          className="own-playlists-link"
          onClick={() => setShowLoginModal(true)}
        >
          want your own playlists?
        </button>
      )}

      {note && <div className="error-banner">{note}</div>}

      {ownerUnavailable ? (
        <p className="section-sub">Playlists aren’t set up for guests yet — log in with Spotify below.</p>
      ) : yours.length === 0 ? (
        <p className="section-sub">
          No owned playlists found — make one on Spotify, or describe one below.
        </p>
      ) : (
        <>
          {cdsMode ? (
            <PlaylistCdShelf
              playlists={yours}
              loadingId={loadingId}
              onChoose={chooseYours}
            />
          ) : (
            <>
              <div className="playlists">
                {visibleYours.map((p) => (
                  <button
                    key={p.id}
                    className={`record-card ${p.liked ? "liked-card" : ""}`}
                    onClick={() => chooseYours(p)}
                    disabled={loadingId !== null}
                  >
                    <div className="record-art">
                      {p.liked ? (
                        <div className="record-cover record-cover--liked">♥</div>
                      ) : p.cover ? (
                        <img src={p.cover} alt="" className="record-cover" draggable={false} />
                      ) : (
                        <div className="record-cover record-cover--empty">♪</div>
                      )}
                    </div>
                    <div className="record-meta">
                      <span className="record-name">{p.name}</span>
                      <span className="record-count">{p.total} tracks</span>
                    </div>
                    {loadingId === p.id && (
                      <span className="record-loading">loading…</span>
                    )}
                  </button>
                ))}
              </div>
              {hiddenYours > 0 && !showAllYours && (
                <button
                  type="button"
                  className="btn btn-ghost picker-more"
                  onClick={() => setShowAllYours(true)}
                >
                  show {hiddenYours} more
                </button>
              )}
              {showAllYours && yours.length > YOURS_PREVIEW && (
                <button
                  type="button"
                  className="btn btn-ghost picker-more"
                  onClick={() => setShowAllYours(false)}
                >
                  show less
                </button>
              )}
            </>
          )}
        </>
      )}

      {tour && tour.id === "record" && tourCard}

      </div>

      <div
        className={`picker-tour-section picker-tour-describe ${pickerTourClass(tourStep, "describe")}`.trim()}
      >
      <div className="chart-search-block">
        <h3 className="picker-section-title">or describe it!</h3>
        <p className="section-sub chart-search-sub">(artist/era/album)</p>
        <form className="chart-search" onSubmit={submitChartSearch}>
          <div className="join-code-row">
            <div className="chart-search-field" ref={chartFieldRef}>
              <label className="chart-search-label">
                {!chartQuery && (
                  <span className="chart-search-ph" aria-hidden="true">
                    <span className="chart-search-ph-main">{chartPh}</span>
                    <span className="chart-search-ph-caret" />
                  </span>
                )}
                <input
                  className={
                    "guess-input join-code-input chart-search-input" +
                    (chartFieldError ? " chart-search-input--error" : "") +
                    (chartFieldFading ? " chart-search-input--fading" : "")
                  }
                  placeholder=""
                  value={chartQuery}
                  {...chartSuggest.inputProps}
                  onChange={(e) => {
                    if (chartFieldError) {
                      clearTimeout(chartErrorTimer.current);
                      setChartFieldError(false);
                      setChartFieldFading(false);
                    }
                    setChartQuery(e.target.value);
                  }}
                  onFocus={() => {
                    if (chartFieldError) resetChartField();
                    chartSuggest.inputProps.onFocus?.();
                  }}
                  onKeyDown={(e) => {
                    chartSuggest.handleKeyDown(e);
                  }}
                  disabled={loadingId !== null}
                  autoCorrect="off"
                  spellCheck={false}
                  aria-invalid={chartFieldError || undefined}
                  aria-label="type your pick, artist, era, or album"
                />
              </label>
              <GuessSuggest suggest={chartSuggest} />
            </div>
            <button
              type="submit"
              className="btn btn-play"
              disabled={
                loadingId !== null || chartFieldError || !chartQuery.trim()
              }
            >
              {loadingId?.startsWith("chart:") ? "…" : "play"}
            </button>
          </div>
          {tour && tour.id === "describe" && tourCard}
        </form>
      </div>
      </div>

      <div className={`picker-tour-section ${pickerTourClass(tourStep, "spindle")}`.trim()}>
      <ChartCdSpindle
        packs={CHART_PACKS}
        loadingId={loadingId}
        onChoose={chooseChart}
      />
      </div>

      <div
        className={`picker-tour-section picker-tour-stack ${pickerTourClass(tourStep, "stack")}`.trim()}
      >
      <ChartCdStack
        layers={stackLayers}
        mix={stackMix}
        insertOpen={stackInsertOpen}
        stackBusy={stackBusy}
        onAdd={addStackLayer}
        onPutBack={() => setStackInsertOpen(false)}
        onPutInPlayer={putStackInPlayer}
        tourSlot={stackTourSlot}
      />
      </div>

      {chartPreview && (
        <ChartPreviewDialog
          playlist={chartPreview}
          onConfirm={confirmChartPreview}
          onCancel={() => setChartPreview(null)}
        />
      )}

      {showLoginModal && (
        <div
          className="spotlight-scrim"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowLoginModal(false);
          }}
        >
          <div
            className="spotlight-card login-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby={loginModalTitleId}
          >
            <button
              type="button"
              className="login-modal-close"
              aria-label="Close"
              onClick={() => setShowLoginModal(false)}
            >
              ×
            </button>
            <div className="login-modal-badge" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="26" height="26">
                <path
                  fill="currentColor"
                  d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"
                />
              </svg>
            </div>
            <h2 id={loginModalTitleId} className="spotlight-title login-modal-title">
              log in with Spotify
            </h2>
            <p className="spotlight-hint login-modal-hint">
              Login will work but playlists wont load as spotify is a bum
              and reduced personal project user limits to 5 :( if you really
              really wanna play, send your email through feedback (bottom
              right pencil button) and i will add it to my webapi userbase.
            </p>
            <a className="btn btn-big btn-spotify login-modal-primary" href="/api/login">
              Log in with Spotify
            </a>
            <button
              type="button"
              className="login-modal-cancel"
              onClick={() => setShowLoginModal(false)}
            >
              maybe later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
