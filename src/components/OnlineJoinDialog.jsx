import { useEffect, useId, useRef, useState } from "react";
import ProfileEditor from "../multiplayer/ProfileEditor.jsx";
import {
  defaultOnlineName,
  loadLocalProfile,
  saveLocalProfile,
} from "../localProfile.js";
import { normalizeAvatar, randomAvatar } from "../multiplayer/constants.js";

/**
 * Spotlight-style join sheet: nickname + peep + accent before an online race.
 */
export default function OnlineJoinDialog({ me, onJoin, onCancel }) {
  const titleId = useId();
  const local = loadLocalProfile();
  const [draft, setDraft] = useState(() => ({
    name: defaultOnlineName(me) || local.name || "",
    avatar: normalizeAvatar(local.avatar || randomAvatar()),
  }));
  const cardRef = useRef(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      cardRef.current?.querySelector("input")?.focus();
    }, 40);
    function onKey(e) {
      if (e.key === "Escape") onCancel?.();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [onCancel]);

  const canJoin = !!draft.name.trim();

  function submit(e) {
    e?.preventDefault?.();
    if (!canJoin) return;
    const saved = saveLocalProfile(draft);
    onJoin?.(saved);
  }

  return (
    <div
      className="spotlight-scrim"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel?.();
      }}
    >
      <form
        className="spotlight-card"
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={submit}
      >
        <div className="spotlight-head">
          <h2 id={titleId} className="spotlight-title">
            join race
          </h2>
          <p className="spotlight-hint">pick a name - and customize!</p>
        </div>
        <ProfileEditor
          name={draft.name}
          avatar={draft.avatar}
          onChange={setDraft}
        />
        <div className="spotlight-actions">
          <button type="button" className="btn btn-mini" onClick={onCancel}>
            cancel
          </button>
          <button
            type="submit"
            className="btn btn-big btn-play"
            disabled={!canJoin}
          >
            <span className="btn-play-icon" aria-hidden="true" />
            find a room
          </button>
        </div>
      </form>
    </div>
  );
}
