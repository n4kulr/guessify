import { useEffect, useId, useState } from "react";
import { shareText } from "../shareScore.js";

/** Confirm-before-share: shows the exact text that will leave the app. */
export default function SharePreviewDialog({ text, onClose }) {
  const titleId = useId();
  const [label, setLabel] = useState("share it");

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function onShare() {
    const result = await shareText(text);
    if (result === "cancelled") return;
    setLabel(result === "shared" ? "shared!" : "copied!");
    window.setTimeout(() => onClose?.(), 900);
  }

  return (
    <div
      className="spotlight-scrim"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className="spotlight-card share-preview"
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
            share this round
          </h2>
          <p className="spotlight-hint">this is exactly what gets shared</p>
        </div>

        <p className="share-preview-text">{text}</p>

        <div className="spotlight-actions">
          <button type="button" className="btn btn-big btn-multi" onClick={onClose}>
            cancel
          </button>
          <button type="button" className="btn btn-big btn-play" onClick={onShare}>
            {label}
          </button>
        </div>
      </div>
    </div>
  );
}
