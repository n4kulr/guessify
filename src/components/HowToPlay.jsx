import { useEffect, useId, useRef } from "react";
import { PlayHowtoSteps } from "./PlayHowto.jsx";

export default function HowToPlay({ open, onOpen, onClose }) {
  const titleId = useId();
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div className="fab-item">
      <button
        type="button"
        className={`help-fab ${open ? "is-open" : ""}`}
        aria-label={open ? "Close how to play" : "How to play"}
        aria-expanded={open}
        aria-controls="help-panel"
        onClick={() => (open ? onClose() : onOpen())}
      >
        {open ? "×" : "?"}
      </button>

      {open && (
        <div
          className="help-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <div
        id="help-panel"
        className={`help-panel ${open ? "is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        hidden={!open}
      >
        <div className="help-panel-head">
          <h2 id={titleId} className="help-title">
            quick how to play
          </h2>
          <button
            ref={closeRef}
            type="button"
            className="help-close"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="help-body">
          <p className="help-lead">
            Short snippets, fast guesses — solo, host a party, or play online.
          </p>
          <PlayHowtoSteps race />
        </div>
      </div>
    </div>
  );
}
