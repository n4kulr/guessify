import { useEffect, useState } from "react";

export default function PlaylistPicker({ onPick }) {
  const [playlists, setPlaylists] = useState(null);
  const [error, setError] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [note, setNote] = useState(null);

  useEffect(() => {
    fetch("/api/playlists", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d) => setPlaylists(d.playlists))
      .catch(() => setError("Couldn't load your playlists."));
  }, []);

  async function choose(p) {
    setLoadingId(p.id);
    setNote(null);
    try {
      const res = await fetch(`/api/playlist/${p.id}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "failed");
      if (data.playableCount < 2) {
        setNote(
          `"${p.name}" only has ${data.playableCount} playable snippet${
            data.playableCount === 1 ? "" : "s"
          } — Spotify doesn't give previews for every track. Try a different playlist.`
        );
        setLoadingId(null);
        return;
      }
      onPick(data);
    } catch (err) {
      setNote(err.message || "Couldn't load that playlist. Try another.");
      setLoadingId(null);
    }
  }

  if (error) return <div className="panel">{error}</div>;
  if (!playlists) return <div className="loader">loading your crates…</div>;

  return (
    <div className="picker">
      <h2 className="section-title">Pick a record</h2>
      <p className="section-sub">Choose one of your playlists to play from.</p>

      {note && <div className="error-banner">{note}</div>}

      <div className="crate">
        {playlists.map((p) => (
          <button
            key={p.id}
            className="record-card"
            onClick={() => choose(p)}
            disabled={loadingId !== null}
          >
            <div className="record-art">
              <div className="mini-vinyl" />
              {p.cover ? (
                <img src={p.cover} alt="" className="record-cover" />
              ) : (
                <div className="record-cover record-cover--empty">♪</div>
              )}
            </div>
            <div className="record-meta">
              <span className="record-name">{p.name}</span>
              <span className="record-count">{p.total} tracks</span>
            </div>
            {loadingId === p.id && <span className="record-loading">loading…</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
