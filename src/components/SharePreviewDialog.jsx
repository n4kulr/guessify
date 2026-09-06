import { useEffect, useId, useRef, useState } from "react";
import { shareCanvas, shareText } from "../shareScore.js";

/**
 * Confirm-before-share: renders the card up front and shows the exact image
 * that will be sent. Falls back to the text payload if the canvas fails.
 */
export default function SharePreviewDialog({
  render,
  text = "",
  filename,
  heading = "share",
  hint = "this is exactly what gets shared",
  onClose,
}) {
  const titleId = useId();
  const canvasRef = useRef(null);
  const [src, setSrc] = useState("");
  const [label, setLabel] = useState("share it");

  useEffect(() => {
    // Rendered once per open — the round's numbers can't change while this is up.
    try {
      const canvas = render();
      canvasRef.current = canvas;
      setSrc(canvas.toDataURL("image/png"));
    } catch {
      canvasRef.current = null;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function onShare() {
    const canvas = canvasRef.current;
    const result = canvas
      ? await shareCanvas(canvas, { text, filename })
      : await shareText(text);
    if (result === "cancelled") return;
    setLabel(
      result === "shared"
        ? "shared!"
        : result === "downloaded"
          ? "saved image!"
          : "copied!"
    );
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
            {heading}
          </h2>
          <p className="spotlight-hint">{hint}</p>
        </div>

        {src ? (
          <img className="share-preview-img" src={src} alt="share card preview" />
        ) : (
          <p className="share-preview-text">{text}</p>
        )}

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
