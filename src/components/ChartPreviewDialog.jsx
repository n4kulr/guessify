import { useEffect, useId } from "react";

/**
 * Spotlight + paper-slip preview after a free-text chart search.
 * Shell matches join/host customizer; insert matches CD genre paper.
 */
export default function ChartPreviewDialog({ playlist, onConfirm, onCancel }) {
  const titleId = useId();
  const tracks = Array.isArray(playlist?.tracks) ? playlist.tracks : [];
  const name = playlist?.name || "Chart";
  const total = playlist?.total || tracks.length;
  const fuzzyHint =
    playlist?.fuzzy && playlist?.query
      ? `closest to “${playlist.query}”`
      : null;

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onCancel?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="spotlight-scrim"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel?.();
      }}
    >
      <div
        className="spotlight-card chart-preview-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="spotlight-head">
          <h2 id={titleId} className="spotlight-title">
            this set?
          </h2>
          <p className="spotlight-hint">
            {fuzzyHint || "check the tracklist, then put it in"}
          </p>
        </div>

        <div className="cd-insert chart-preview-insert cd-spine--clear">
          <div className="cd-insert-head">
            <h3 className="cd-insert-title">{name}</h3>
            <p className="cd-insert-meta">
              {total} tracks
              {playlist?.owner ? ` · ${playlist.owner}` : ""}
            </p>
          </div>
          <div className="cd-insert-body chart-preview-body">
            <ol className="cd-insert-tracks">
              {tracks.map((t, i) => (
                <li key={t.id || `${t.name}-${i}`}>
                  <span className="n">{String(i + 1).padStart(2, "0")}</span>
                  <span className="chart-preview-track">
                    <span className="chart-preview-track-title">{t.name}</span>
                    {(t.artists || []).length > 0 && (
                      <span className="chart-preview-track-artist">
                        {(t.artists || []).join(", ")}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div className="cd-insert-actions">
            <button type="button" className="cd-insert-back" onClick={onCancel}>
              Put Back
            </button>
            <button
              type="button"
              className="cd-insert-play"
              onClick={() => onConfirm?.(playlist)}
            >
              ► Put in Player
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
