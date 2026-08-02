import { useEffect, useState } from "react";
import { isFastTest } from "../fastTest.js";
import { getDebugSnapshot, subscribeDebug } from "../debugRegistry.js";

/** Floating debug control — only when ?fast=1 is sticky. */
export default function DebugPanel() {
  const [open, setOpen] = useState(false);
  const [snap, setSnap] = useState(() => getDebugSnapshot());
  const enabled = isFastTest();

  useEffect(() => subscribeDebug(() => setSnap(getDebugSnapshot())), []);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!enabled) return null;

  return (
    <>
      <button
        type="button"
        className="debug-fab"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        debug
      </button>
      {open && (
        <div
          className="debug-backdrop"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            className="debug-modal"
            role="dialog"
            aria-label="Debug"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="debug-modal-head">
              <h3 className="debug-modal-title">debug</h3>
              <span className="debug-modal-screen">{snap.screen}</span>
              <button
                type="button"
                className="btn btn-mini"
                onClick={() => setOpen(false)}
              >
                close
              </button>
            </div>
            {snap.actions.length === 0 ? (
              <p className="debug-modal-empty">no actions on this screen</p>
            ) : (
              <ul className="debug-modal-list">
                {snap.actions.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      className="btn btn-mini debug-action"
                      onClick={() => {
                        try {
                          a.run();
                        } finally {
                          setOpen(false);
                        }
                      }}
                    >
                      {a.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
