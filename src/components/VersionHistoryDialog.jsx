import { useEffect, useId } from "react";
import { APP_VERSION, CHANGELOG } from "../versionHistory.js";

/**
 * Vertical timeline modal displaying the version history and release notes.
 */
export default function VersionHistoryDialog({ onClose }) {
  const titleId = useId();

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="spotlight-scrim"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className="spotlight-card version-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button
          type="button"
          className="login-modal-close"
          aria-label="Close"
          onClick={onClose}
        >
          ×
        </button>

        <div className="spotlight-head">
          <h2 id={titleId} className="spotlight-title">
            version history
          </h2>
          <p className="spotlight-hint">{APP_VERSION} · timeline of features & updates</p>
        </div>

        <div className="version-timeline">
          {CHANGELOG.map((entry, idx) => (
            <div key={entry.version} className="timeline-entry">
              <div className="timeline-marker">
                <span className={`timeline-dot ${idx === 0 ? "is-latest" : ""}`} />
                {idx < CHANGELOG.length - 1 && <span className="timeline-line" />}
              </div>
              <div className="timeline-content">
                <div className="timeline-header">
                  <span className="timeline-badge">{entry.version}</span>
                  <span className="timeline-title">{entry.title}</span>
                  <span className="timeline-date">{entry.date}</span>
                </div>
                <ul className="timeline-list">
                  {entry.items.map((item, itemIdx) => (
                    <li key={itemIdx}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <div className="spotlight-actions">
          <button type="button" className="btn btn-big btn-play" onClick={onClose}>
            got it
          </button>
        </div>
      </div>
    </div>
  );
}
