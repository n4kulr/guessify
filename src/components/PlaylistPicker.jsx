import { useEffect, useMemo, useState } from "react";

export default function PlaylistPicker({ onPick }) {
  const [data, setData] = useState(null); // { playlists, liked }
  const [error, setError] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [note, setNote] = useState(null);

  useEffect(() => {
    fetch("/api/playlists", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(setData)
      .catch(() => setError("Couldn't load your playlists."));
  }, []);

  // Liked Songs first (always yours), then playlists with owned ones first.
  const cards = useMemo(() => {
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
    const playlists = [...(data.playlists || [])].sort(
      (a, b) => Number(b.owned) - Number(a.owned)
    );
    return list.concat(playlists);
  }, [data]);

  async function choose(p) {
    if (!p.owned) return; // locked — can't read tracks you don't own
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

  if (error) return <div className="panel">{error}</div>;
  if (!data) return <div className="loader">loading your crates…</div>;

  return (
    <div className="picker">
      <h2 className="section-title">Pick a record</h2>
      <p className="section-sub">
        Play from your own playlists or Liked Songs. Others' playlists are locked —
        Spotify only lets the app read tracks you own.
      </p>

      {note && <div className="error-banner">{note}</div>}

      <div className="crate">
        {cards.map((p) => (
          <button
            key={p.id}
            className={`record-card ${p.owned ? "" : "locked"} ${p.liked ? "liked-card" : ""}`}
            onClick={() => choose(p)}
            disabled={loadingId !== null || !p.owned}
            title={p.owned ? undefined : `"${p.name}" belongs to ${p.owner} — can't play it`}
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
              <span className="record-count">
                {p.owned ? `${p.total} tracks` : `🔒 ${p.owner}'s`}
              </span>
            </div>
            {loadingId === p.id && <span className="record-loading">loading…</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
