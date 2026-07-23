import { useEffect, useMemo, useState } from "react";

const YOURS_PREVIEW = 6;

const CHART_PACKS = [
  { tag: "pop", label: "Pop", blurb: "chart pop" },
  { tag: "hip-hop", label: "Hip-hop", blurb: "raps & beats" },
  { tag: "rnb", label: "R&B", blurb: "smooth cuts" },
  { tag: "rock", label: "Rock", blurb: "guitars up" },
  { tag: "indie", label: "Indie", blurb: "left of center" },
  { tag: "electronic", label: "Electronic", blurb: "synths" },
  { tag: "90s", label: "90s", blurb: "decade pack" },
  { tag: "2000s", label: "2000s", blurb: "decade pack" },
  { tag: "2010s", label: "2010s", blurb: "decade pack" },
  { tag: "disco", label: "Disco", blurb: "dancefloor" },
];

export default function PlaylistPicker({ onPick, onBack }) {
  const [data, setData] = useState(null); // { playlists, liked }
  const [error, setError] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [note, setNote] = useState(null);
  const [showAllYours, setShowAllYours] = useState(false);
  const [chartQuery, setChartQuery] = useState("");

  useEffect(() => {
    fetch("/api/playlists", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(setData)
      .catch(() => setError("Couldn't load your playlists."));
  }, []);

  // Liked Songs first, then owned playlists only (locked ones can't be played).
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
    const owned = (data.playlists || [])
      .filter((p) => p.owned)
      .sort((a, b) => a.name.localeCompare(b.name));
    return list.concat(owned);
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

  async function chooseChart(tag) {
    const clean = String(tag || "").trim();
    if (!clean) return;
    const id = `chart:${clean.toLowerCase()}`;
    setLoadingId(id);
    setNote(null);
    try {
      const res = await fetch(
        `/api/charts?tag=${encodeURIComponent(clean)}&limit=30`,
        { credentials: "include" }
      );
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "failed");
      if (d.playableCount < 2) {
        setNote(`“${clean}” needs at least 2 tracks. Try another tag.`);
        setLoadingId(null);
        return;
      }
      onPick(d);
    } catch (err) {
      setNote(err.message || "Couldn't load that chart. Try another tag.");
      setLoadingId(null);
    }
  }

  function submitChartSearch(e) {
    e.preventDefault();
    chooseChart(chartQuery);
  }

  if (error) return <div className="panel">{error}</div>;
  if (!data) return <div className="loader">loading your playlists…</div>;

  return (
    <div className="picker">
      {onBack && (
        <button className="btn btn-mini picker-back" onClick={onBack}>
          ← home
        </button>
      )}
      <h2 className="section-title">Pick a record…</h2>
      <p className="section-sub">Your Spotify playlists only.</p>

      {note && <div className="error-banner">{note}</div>}

      {yours.length === 0 ? (
        <p className="section-sub">
          No owned playlists found — make one on Spotify, or describe one below.
        </p>
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
                    <img src={p.cover} alt="" className="record-cover" />
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

      <div className="chart-search-block">
        <h3 className="picker-section-title">or describe it!</h3>
        <form className="chart-search" onSubmit={submitChartSearch}>
          <div className="join-code-row">
            <input
              className="guess-input join-code-input chart-search-input"
              placeholder="type your pick…"
              value={chartQuery}
              onChange={(e) => setChartQuery(e.target.value)}
              disabled={loadingId !== null}
              autoCorrect="off"
              spellCheck={false}
            />
            <button
              type="submit"
              className="btn btn-play"
              disabled={loadingId !== null || !chartQuery.trim()}
            >
              {loadingId?.startsWith("chart:") ? "…" : "play"}
            </button>
          </div>
        </form>
      </div>

      <div className="cd-rack" role="list">
        {CHART_PACKS.map((pack) => {
          const id = `chart:${pack.tag}`;
          const busy = loadingId === id;
          return (
            <button
              key={pack.tag}
              type="button"
              role="listitem"
              className={`cd-edge${busy ? " is-loading" : ""}`}
              onClick={() => chooseChart(pack.tag)}
              disabled={loadingId !== null}
              title={pack.blurb}
              aria-label={`${pack.label}: ${pack.blurb}`}
            >
              <span className="cd-edge-rim" aria-hidden="true" />
              <span className="cd-edge-label">
                {busy ? "…" : pack.label}
              </span>
              <span className="cd-edge-rim cd-edge-rim--end" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
