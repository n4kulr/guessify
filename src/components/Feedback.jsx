import { useEffect, useId, useRef, useState } from "react";

export default function Feedback({ open, onOpen, onClose }) {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [error, setError] = useState("");
  const [showAbout, setShowAbout] = useState(false);
  const titleId = useId();
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (showAbout) setShowAbout(false);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => {
      if (!showAbout) inputRef.current?.focus();
    }, 30);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [open, onClose, showAbout]);

  useEffect(() => {
    if (!open) {
      setStatus("idle");
      setError("");
      setShowAbout(false);
    }
  }, [open]);

  async function send(e) {
    e.preventDefault();
    const text = message.trim();
    if (!text || status === "sending") return;

    setStatus("sending");
    setError("");
    try {
      const r = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          page: typeof window !== "undefined" ? window.location.href : "",
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setStatus("error");
        setError(data.error || "couldn't send — try again");
        return;
      }
      setStatus("sent");
      setMessage("");
      window.setTimeout(() => onClose(), 1200);
    } catch {
      setStatus("error");
      setError("couldn't send — try again");
    }
  }

  return (
    <div className="fab-item">
      <button
        type="button"
        className={`help-fab feedback-fab ${open ? "is-open" : ""}`}
        aria-label={open ? "Close feedback" : "Send feedback"}
        aria-expanded={open}
        aria-controls="feedback-panel"
        onClick={() => (open ? onClose() : onOpen())}
      >
        {open ? "×" : "✎"}
      </button>

      {open && (
        <div
          className="help-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <div
        id="feedback-panel"
        className={`help-panel feedback-panel ${open ? "is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        hidden={!open}
      >
        <div className="help-panel-head">
          <h2 id={titleId} className="help-title">
            feedback
          </h2>
          <div className="feedback-head-actions">
            <button
              type="button"
              className={`feedback-about-btn ${showAbout ? "is-open" : ""}`}
              aria-label={showAbout ? "Hide how feedback works" : "How feedback works"}
              aria-expanded={showAbout}
              onClick={() => setShowAbout((v) => !v)}
            >
              how?
            </button>
            <button
              type="button"
              className="help-close"
              aria-label="Close"
              onClick={onClose}
            >
              ×
            </button>
          </div>
        </div>

        {showAbout ? (
          <div className="feedback-about">
            <p>
              Messages land in my Discord through a <b>webhook</b> — no inbox,
              just a channel ping when someone hits send.
            </p>
            <img
              className="feedback-about-img"
              src="/feedback-discord.png"
              alt="example of guessify feedback in Discord"
            />
            <p className="feedback-about-note">
              on my end it shows up as a styled Discord embed with this art
            </p>
          </div>
        ) : status === "sent" ? (
          <p className="feedback-thanks">got it — thanks!</p>
        ) : (
          <form className="feedback-form" onSubmit={send}>
            <label className="feedback-label" htmlFor="feedback-message">
              bugs, ideas, complaints — drop it here
            </label>
            <textarea
              id="feedback-message"
              ref={inputRef}
              className="feedback-input"
              rows={5}
              maxLength={1800}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="what's up?"
              disabled={status === "sending"}
            />
            {error && <p className="feedback-error">{error}</p>}
            <button
              type="submit"
              className="btn btn-big feedback-send"
              disabled={!message.trim() || status === "sending"}
            >
              {status === "sending" ? "sending…" : "send"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
