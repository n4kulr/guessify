import { useEffect, useId } from "react";

/**
 * Pick classic (first-to-nail) vs timed (45s scoreboard) before online customize.
 */
export default function RaceModeDialog({ onPick, onCancel }) {
  const titleId = useId();

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
        className="spotlight-card race-mode-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="spotlight-head">
          <h2 id={titleId} className="spotlight-title">
            pick a mode
          </h2>
          <p className="spotlight-hint">same songs — different race</p>
        </div>

        <div className="race-mode-choices">
          <button
            type="button"
            className="btn btn-big btn-play race-mode-choice"
            onClick={() => onPick?.("classic")}
          >
            <span className="race-mode-choice-title">Classic</span>
            <span className="race-mode-choice-blurb">
              first to nail the title wins the round
            </span>
          </button>
          <button
            type="button"
            className="btn btn-big btn-multi race-mode-choice"
            onClick={() => onPick?.("timed")}
          >
            <span className="race-mode-choice-title">Timed</span>
            <span className="race-mode-choice-blurb">
              45 seconds · everyone who gets it scores by speed
            </span>
          </button>
        </div>

        <div className="spotlight-actions">
          <button type="button" className="btn btn-mini" onClick={onCancel}>
            cancel
          </button>
        </div>
      </div>
    </div>
  );
}
