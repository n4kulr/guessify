import { useEffect, useId, useRef, useState } from "react";

const MAX_SHOTS = 3;
const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.72;

/**
 * Shrink a screenshot for the ~4MB Vercel body limit + Discord upload.
 * @returns {Promise<{ dataUrl: string, name: string, preview: string } | null>}
 */
async function compressShot(file) {
  if (!file?.type?.startsWith("image/")) return null;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    const preview = dataUrl;
    const base = String(file.name || "screenshot")
      .replace(/\.[^.]+$/, "")
      .replace(/[^\w.-]+/g, "_")
      .slice(0, 40);
    return { dataUrl, preview, name: `${base || "shot"}.jpg` };
  } catch {
    return null;
  }
}

export default function Feedback({ open, onOpen, onClose }) {
  const [message, setMessage] = useState("");
  const [shots, setShots] = useState([]); // { dataUrl, preview, name, key }
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [error, setError] = useState("");
  const [showAbout, setShowAbout] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const titleId = useId();
  const inputRef = useRef(null);
  const fileRef = useRef(null);

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
      setShots([]);
      setMessage("");
    }
  }, [open]);

  async function addFiles(fileList) {
    const files = [...(fileList || [])].filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;
    setError("");
    const room = MAX_SHOTS - shots.length;
    if (room <= 0) {
      setError(`up to ${MAX_SHOTS} screenshots`);
      return;
    }
    const next = [];
    for (const file of files.slice(0, room)) {
      const shot = await compressShot(file);
      if (shot) next.push({ ...shot, key: `${Date.now()}-${Math.random()}` });
    }
    if (next.length) setShots((s) => [...s, ...next].slice(0, MAX_SHOTS));
  }

  function removeShot(key) {
    setShots((s) => s.filter((x) => x.key !== key));
  }

  async function send(e) {
    e.preventDefault();
    const text = message.trim();
    if ((!text && !shots.length) || status === "sending") return;

    setStatus("sending");
    setError("");
    try {
      const r = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          images: shots.map((s) => ({ dataUrl: s.dataUrl, name: s.name })),
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
      setShots([]);
      window.setTimeout(() => onClose(), 1200);
    } catch {
      setStatus("error");
      setError("couldn't send — try again");
    }
  }

  const canSend = (message.trim() || shots.length > 0) && status !== "sending";

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
              just a channel ping when someone hits send. Screenshots come
              through as attachments.
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
          <form
            className={`feedback-form${dragOver ? " is-dragover" : ""}`}
            onSubmit={send}
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (status === "sending") return;
              setDragOver(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (e.currentTarget.contains(e.relatedTarget)) return;
              setDragOver(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragOver(false);
              if (status === "sending") return;
              void addFiles(e.dataTransfer?.files);
            }}
          >
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
              onPaste={(e) => {
                const files = [...(e.clipboardData?.items || [])]
                  .filter((i) => i.type.startsWith("image/"))
                  .map((i) => i.getAsFile())
                  .filter(Boolean);
                if (!files.length) return;
                e.preventDefault();
                void addFiles(files);
              }}
              placeholder="whats up?"
              disabled={status === "sending"}
            />

            {shots.length > 0 && (
              <ul className="feedback-shots" aria-label="Attached screenshots">
                {shots.map((s) => (
                  <li key={s.key} className="feedback-shot">
                    <img src={s.preview} alt="" />
                    <button
                      type="button"
                      className="feedback-shot-remove"
                      aria-label="Remove screenshot"
                      onClick={() => removeShot(s.key)}
                      disabled={status === "sending"}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="feedback-attach-row">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="feedback-file"
                tabIndex={-1}
                onChange={(e) => {
                  void addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                className="btn btn-mini feedback-attach"
                disabled={status === "sending" || shots.length >= MAX_SHOTS}
                onClick={() => fileRef.current?.click()}
              >
                {shots.length >= MAX_SHOTS
                  ? `${MAX_SHOTS} screenshots max`
                  : "add screenshot"}
              </button>
              <span className="feedback-attach-hint">
                paste or drag and drop
              </span>
            </div>

            {error && <p className="feedback-error">{error}</p>}
            <button
              type="submit"
              className="btn btn-big feedback-send"
              disabled={!canSend}
            >
              {status === "sending" ? "sending…" : "send"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
